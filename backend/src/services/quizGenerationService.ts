import { quizRepository } from '../repositories/quizRepository';
import { projectRepository } from '../repositories/projectRepository';
import { assessmentService } from './assessmentService';
import { calculateAdaptiveSelectionScores, ConceptSelectionData } from '../utils/adaptiveAlgorithm';
import { learningEventRepository } from '../repositories/learningEventRepository';
import { recommendationService } from './recommendationService';
import { prisma } from '../config/prisma';
import { QuestionType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { aiService } from './aiService';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { isValidConceptName, normalizeConceptName } from '../utils/conceptValidator';

export class QuizGenerationService {
  async generateAdaptiveQuiz(data: {
    userId: string;
    projectId: string;
    questionCount?: number;
    difficulty?: number;
    topic?: string;
  }) {
    const project = await projectRepository.findById(data.projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Filter to only legitimate academic concepts
    const concepts = (project.concepts || []).filter((c) => isValidConceptName(c.name));
    const count = data.questionCount || 5;

    // 1. Prepare concepts data for adaptive selection
    const selectionInput: ConceptSelectionData[] = concepts.map((c) => {
      const latestMastery = c.masteryRecords[0]?.score || 0.2;
      return {
        conceptId: c.id,
        conceptName: c.name,
        currentMastery: latestMastery,
        previousMistakes: latestMastery < 0.5 ? 2 : 0,
        lastAttemptedDaysAgo: 1,
      };
    });

    // 2. Rank concepts using adaptive algorithm
    const rankedConcepts = calculateAdaptiveSelectionScores(selectionInput);

    // 3. Create Quiz in database
    const quiz = await quizRepository.createQuiz({
      projectId: data.projectId,
      title: data.topic ? `Adaptive Quiz: ${data.topic}` : `Adaptive Quiz: ${project.name}`,
      description: `Targeting concepts based on adaptive mastery and performance evidence.`,
    });

    // 4. Generate questions via Gemini AI
    const questionsToCreate: Array<{
      quizId: string;
      conceptId?: string;
      type: QuestionType;
      prompt: string;
      options?: string[];
      correctAnswer?: string;
      difficulty?: number;
    }> = [];

    const isTestEnv = (process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test') && process.env.TEST_LIVE_AI !== 'true';

    if (!isTestEnv) {
      try {
        const modelName = process.env.GEMINI_MODEL || env.GEMINI_MODEL || 'gemini-3.6-flash';
        console.log(`[QUIZ AI]\nCalling Gemini...\nModel: ${modelName}\nGeneration started`);

        // Fetch project material chunks for grounded context
        const materialChunks = await prisma.materialChunk.findMany({
          where: { projectId: data.projectId },
          take: 8,
          orderBy: { chunkIndex: 'asc' },
          select: { content: true, pageNumber: true },
        });

        const systemPrompt = `You are an expert academic assessment generator.
Create an adaptive quiz with exactly ${count} questions based on the provided project materials and learning concepts.
Return JSON ONLY, matching this schema:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "prompt": "Clear, direct question statement",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correctAnswer": "Option 1",
      "difficulty": 0.5,
      "conceptName": "Specific academic or technical concept (e.g. 'Supervised Learning', 'Linear Regression', 'Classification', 'Neural Networks')"
    },
    {
      "type": "OPEN_ENDED",
      "prompt": "Question requiring conceptual explanation or analytical response",
      "correctAnswer": "Key points expected in a comprehensive student explanation",
      "difficulty": 0.7,
      "conceptName": "Specific academic or technical concept"
    }
  ]
}
Requirements:
1. Provide a balanced mix of MULTIPLE_CHOICE and OPEN_ENDED questions.
2. For MULTIPLE_CHOICE questions, provide exactly 4 distinct, plausible options. The correctAnswer MUST exactly match one of the options.
3. Every question MUST specify a meaningful academic or technical learning concept in "conceptName" (e.g. "Supervised Learning", "Classification", "Regression", "Neural Networks", "Clustering", "Optimization").
4. CRITICAL: Preserve meaningful multi-word phrases (e.g. "Supervised Learning", "Machine Learning") and do NOT split them into individual words.
5. CRITICAL: NEVER use publication metadata, dates, months (e.g. "January"), publishers (e.g. "Springer", "Nature"), author names, document structure (e.g. "Chapter", "Volume", "Page"), or severed word fragments (e.g. isolated "Machine" or "Learning") as concepts.
6. Ground the questions deeply in the provided materials, concepts, and project learning goal.
7. Return ONLY valid JSON with no markdown wrapping other than optional \`\`\`json block.`;

        const userPrompt = `PROJECT: ${project.name}
LEARNING GOAL: ${project.learningGoal}
${data.topic ? `TOPIC: ${data.topic}\n` : ''}
TARGET CONCEPTS:
${rankedConcepts.length > 0 
  ? rankedConcepts.filter(c => isValidConceptName(c.conceptName)).map(c => `- ${normalizeConceptName(c.conceptName)} (Current Mastery: ${Math.round(c.currentMastery * 100)}%)`).join('\n') 
  : '- Core subject concepts and principles'}

STUDY MATERIAL EXCERPTS:
${materialChunks.length > 0 
  ? materialChunks.map((c, i) => `[Excerpt ${i + 1} - Pg. ${c.pageNumber}]: ${c.content.slice(0, 350)}`).join('\n\n')
  : 'No document excerpts available. Use the project learning goal and concepts.'}

Generate exactly ${count} quiz questions following the JSON schema.`;

        const llmResult = await aiService.generateResponse(systemPrompt, userPrompt);
        console.log(`[QUIZ AI]\nGemini response received`);

        // Parse JSON response
        let parsedQuestions: any[] = [];
        try {
          let content = llmResult.content.trim();
          const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (codeBlockMatch) {
            content = codeBlockMatch[1].trim();
          }

          let parsed: any = null;
          try {
            parsed = JSON.parse(content);
          } catch {
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
              parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
            }
          }

          if (parsed) {
            if (Array.isArray(parsed)) {
              parsedQuestions = parsed;
            } else if (Array.isArray(parsed.questions)) {
              parsedQuestions = parsed.questions;
            } else if (Array.isArray(parsed.quiz)) {
              parsedQuestions = parsed.quiz;
            }
          }
        } catch (parseError) {
          logger.warn('[QUIZ AI] Could not parse AI response as JSON:', parseError);
        }

        for (const pq of parsedQuestions) {
          if (questionsToCreate.length >= count) break;
          const promptText = pq.prompt || pq.question || pq.content;
          if (!promptText || typeof promptText !== 'string') continue;

          const isMCQ = (pq.type || '').toUpperCase() === 'MULTIPLE_CHOICE' || Array.isArray(pq.options);
          const type = isMCQ ? QuestionType.MULTIPLE_CHOICE : QuestionType.OPEN_ENDED;

          let options: string[] | undefined = undefined;
          let correctAnswer = pq.correctAnswer || pq.answer || '';

          if (isMCQ) {
            let optList: string[];
            if (Array.isArray(pq.options) && pq.options.length > 0) {
              optList = pq.options.map((o: any) => String(o).trim());
            } else if (typeof pq.options === 'object' && pq.options !== null) {
              optList = Object.values(pq.options).map((o: any) => String(o).trim());
            } else {
              optList = [correctAnswer || 'Option 1', 'Option 2', 'Option 3', 'Option 4'];
            }

            if (correctAnswer && !optList.includes(correctAnswer)) {
              const idx = ['A', 'B', 'C', 'D'].indexOf(correctAnswer.toUpperCase());
              if (idx !== -1 && optList[idx]) {
                correctAnswer = optList[idx];
              } else {
                optList[0] = correctAnswer;
              }
            } else if (!correctAnswer && optList.length > 0) {
              correctAnswer = optList[0];
            }

            options = optList;
          }

          const rawConcept = pq.conceptName || pq.concept || pq.topic;
          let conceptId: string | undefined = undefined;

          if (rawConcept && typeof rawConcept === 'string' && isValidConceptName(rawConcept)) {
            const cleanName = normalizeConceptName(rawConcept);

            // Look up existing valid concept in this project (case-insensitive)
            const existingConcept = await prisma.concept.findFirst({
              where: {
                projectId: data.projectId,
                name: { equals: cleanName, mode: 'insensitive' },
              },
            });

            if (existingConcept && isValidConceptName(existingConcept.name)) {
              conceptId = existingConcept.id;
            } else {
              const newConcept = await prisma.concept.create({
                data: {
                  projectId: data.projectId,
                  name: cleanName,
                  description: `Core academic concept identified from quiz assessment.`,
                },
              });
              conceptId = newConcept.id;
            }
          } else if (data.topic && isValidConceptName(data.topic)) {
            const cleanTopic = normalizeConceptName(data.topic);
            const existingTopic = await prisma.concept.findFirst({
              where: {
                projectId: data.projectId,
                name: { equals: cleanTopic, mode: 'insensitive' },
              },
            });
            if (existingTopic && isValidConceptName(existingTopic.name)) {
              conceptId = existingTopic.id;
            } else {
              const newConcept = await prisma.concept.create({
                data: {
                  projectId: data.projectId,
                  name: cleanTopic,
                  description: `Topic concept from quiz specification.`,
                },
              });
              conceptId = newConcept.id;
            }
          } else if (rankedConcepts.length > 0) {
            const fallbackConcept = rankedConcepts[questionsToCreate.length % rankedConcepts.length];
            if (fallbackConcept && isValidConceptName(fallbackConcept.conceptName)) {
              conceptId = fallbackConcept.conceptId;
            }
          }

          questionsToCreate.push({
            quizId: quiz.id,
            conceptId,
            type,
            prompt: promptText,
            options,
            correctAnswer: String(correctAnswer),
            difficulty: typeof pq.difficulty === 'number' ? pq.difficulty : (isMCQ ? 0.5 : 0.7),
          });
        }
      } catch (err) {
        logger.error('[QUIZ AI] Gemini call failed, falling back to adaptive algorithm questions:', err);
      }
    }

    // 5. Fill remaining slots if any (or during offline test execution)
    const validRanked = rankedConcepts.filter((c) => isValidConceptName(c.conceptName));
    while (questionsToCreate.length < count) {
      const i = questionsToCreate.length;
      const targetConcept = validRanked[i % Math.max(validRanked.length, 1)];
      const conceptName = targetConcept
        ? normalizeConceptName(targetConcept.conceptName)
        : data.topic && isValidConceptName(data.topic)
        ? normalizeConceptName(data.topic)
        : 'Foundational Principles';
      const conceptId = targetConcept ? targetConcept.conceptId : undefined;
      const isMCQ = i % 2 === 0;

      if (isMCQ) {
        questionsToCreate.push({
          quizId: quiz.id,
          conceptId,
          type: QuestionType.MULTIPLE_CHOICE,
          prompt: `Which statement best describes the fundamental principle of ${conceptName}?`,
          options: [
            `It provides a primary mechanism for ${conceptName} in ${project.learningGoal}.`,
            `It represents an obsolete technique deprecated in modern architectures.`,
            `It operates independently without requiring any input materials or data.`,
            `It serves only as a visual formatting utility with no logical function.`,
          ],
          correctAnswer: `It provides a primary mechanism for ${conceptName} in ${project.learningGoal}.`,
          difficulty: 0.5,
        });
      } else {
        questionsToCreate.push({
          quizId: quiz.id,
          conceptId,
          type: QuestionType.OPEN_ENDED,
          prompt: `Explain how ${conceptName} contributes to achieving the project goal: "${project.learningGoal}". Provide key details.`,
          correctAnswer: `${conceptName} provides necessary contextual foundation and functional logic essential for ${project.learningGoal}.`,
          difficulty: 0.7,
        });
      }
    }

    await quizRepository.addQuestions(questionsToCreate);

    // Record activity event
    await learningEventRepository.record({
      userId: data.userId,
      projectId: data.projectId,
      eventType: 'QUIZ_STARTED',
      metadata: { quizId: quiz.id, questionCount: count },
    });

    return quizRepository.findById(quiz.id);
  }

  async submitQuiz(data: {
    userId: string;
    projectId: string;
    quizId: string;
    responses: Array<{ questionId: string; userResponse: string }>;
  }) {
    const quiz = await quizRepository.findById(data.quizId);
    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }

    let totalScoreSum = 0;
    let totalQuestions = quiz.questions.length;
    const strengths: string[] = [];
    const missingConcepts: string[] = [];

    const evaluatedResponses = [];

    for (const q of quiz.questions) {
      const userResp = data.responses.find((r) => r.questionId === q.id);
      const userText = userResp ? userResp.userResponse : '';

      if (q.type === QuestionType.MULTIPLE_CHOICE) {
        const cleanUser = userText.trim().toLowerCase();
        const cleanExpected = (q.correctAnswer || '').trim().toLowerCase();
        let isCorrect = cleanUser === cleanExpected;

        if (!isCorrect && Array.isArray(q.options)) {
          const optIndex = (q.options as string[]).findIndex(opt => opt.trim().toLowerCase() === cleanExpected);
          if (optIndex !== -1) {
            const letter = ['a', 'b', 'c', 'd'][optIndex];
            if (cleanUser === String(optIndex) || cleanUser === letter) {
              isCorrect = true;
            }
          }
        }

        const score = isCorrect ? 1.0 : 0.0;
        totalScoreSum += score;

        const savedResp = await quizRepository.saveResponse({
          questionId: q.id,
          userResponse: userText,
          isCorrect,
          score,
          feedback: isCorrect ? 'Correct! Selected the valid answer option.' : `Incorrect. Expected: ${q.correctAnswer}`,
        });

        evaluatedResponses.push(savedResp);

        if (q.concept) {
          if (isCorrect) strengths.push(q.concept.name);
          else missingConcepts.push(q.concept.name);
        }
      } else {
        // Open-Ended Question Evaluation via AssessmentService
        const evalResult = await assessmentService.evaluateOpenEnded(
          q.prompt,
          q.correctAnswer || '',
          userText
        );

        totalScoreSum += evalResult.score;

        const savedResp = await quizRepository.saveResponse({
          questionId: q.id,
          userResponse: userText,
          isCorrect: evalResult.isCorrect,
          score: evalResult.score,
          feedback: evalResult.feedback,
        });

        evaluatedResponses.push(savedResp);

        if (q.concept) {
          if (evalResult.isCorrect) strengths.push(q.concept.name);
          else missingConcepts.push(q.concept.name);
        }
      }
    }

    const overallScore = totalQuestions > 0 ? Math.round((totalScoreSum / totalQuestions) * 100) / 100 : 0;

    // Complete quiz record
    await quizRepository.completeQuiz(quiz.id, overallScore);

    // Save detailed assessment breakdown
    const assessment = await quizRepository.saveAssessment({
      quizId: quiz.id,
      overallScore,
      understandingScore: overallScore,
      accuracyScore: overallScore,
      relevanceScore: Math.min(overallScore + 0.1, 1.0),
      strengths: Array.from(new Set(strengths)),
      missingConcepts: Array.from(new Set(missingConcepts)),
      improvementSummary: overallScore >= 0.7
        ? 'Great performance! You demonstrated solid understanding across tested concepts.'
        : 'Requires attention. Review weak concepts and re-take focused practice assessments.',
    });

    // Update concept mastery records
    await this.updateConceptMasteryFromQuiz(data.userId, data.projectId, quiz.questions, evaluatedResponses);

    // Generate recommendations based on updated mastery
    await recommendationService.generateRecommendationsFromMastery(data.projectId);

    // Record activity event
    await learningEventRepository.record({
      userId: data.userId,
      projectId: data.projectId,
      eventType: 'ASSESSMENT_COMPLETED',
      metadata: { quizId: quiz.id, overallScore },
    });

    return {
      quizId: quiz.id,
      overallScore,
      score: overallScore,
      assessment,
      evaluatedResponses,
      evaluations: evaluatedResponses,
    };
  }

  private async updateConceptMasteryFromQuiz(
    userId: string,
    projectId: string,
    questions: any[],
    responses: any[]
  ): Promise<void> {
    const conceptScores: Map<string, number[]> = new Map();

    for (const q of questions) {
      if (!q.conceptId) continue;
      const resp = responses.find((r) => r.questionId === q.id);
      if (resp && typeof resp.score === 'number') {
        const list = conceptScores.get(q.conceptId) || [];
        list.push(resp.score);
        conceptScores.set(q.conceptId, list);
      }
    }

    for (const [conceptId, scores] of conceptScores.entries()) {
      const concept = await prisma.concept.findUnique({ where: { id: conceptId } });
      if (!concept || !isValidConceptName(concept.name)) continue;

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const status = avgScore >= 0.8 ? 'IMPROVING' : avgScore >= 0.5 ? 'STABLE' : 'REQUIRES_ATTENTION';

      await prisma.masteryRecord.create({
        data: {
          conceptId,
          score: Math.round(avgScore * 100) / 100,
          status,
          evidence: `Updated from quiz assessment submission (avg score: ${Math.round(avgScore * 100)}%)`,
        },
      });

      await learningEventRepository.record({
        userId,
        projectId,
        eventType: 'MASTERY_UPDATED',
        metadata: { conceptId, newScore: avgScore, status },
      });
    }
  }
}

export const quizGenerationService = new QuizGenerationService();
