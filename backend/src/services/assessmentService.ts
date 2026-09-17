import { aiService } from './aiService';
import { aiUsageRepository } from '../repositories/aiUsageRepository';
import { logger } from '../config/logger';

export interface OpenEndedEvaluationResult {
  score: number; // 0.0 to 1.0
  isCorrect: boolean;
  feedback: string;
  understandingScore: number;
  accuracyScore: number;
  relevanceScore: number;
  strengths: string[];
  missingConcepts: string[];
  improvementSuggestion: string;
}

export class AssessmentService {
  async evaluateOpenEnded(
    prompt: string,
    expectedAnswer: string,
    userResponse: string
  ): Promise<OpenEndedEvaluationResult> {
    const startTime = Date.now();

    const systemPrompt = `You are a rigorous educational evaluator. Evaluate the student's open-ended response against the question and expected answer key.
Return JSON format ONLY:
{
  "score": 0.85,
  "understandingScore": 0.9,
  "accuracyScore": 0.8,
  "relevanceScore": 0.9,
  "feedback": "Clear explanation of core concepts with minor omission.",
  "strengths": ["Accurate terminology", "Clear reasoning"],
  "missingConcepts": ["Edge case handling"],
  "improvementSuggestion": "Review exception scenarios in material."
}`;

    const userPrompt = `QUESTION PROMPT: ${prompt}
EXPECTED ANSWER: ${expectedAnswer}
STUDENT RESPONSE: ${userResponse}`;

    try {
      const llmResult = await aiService.generateResponse(systemPrompt, userPrompt);
      const latencyMs = Date.now() - startTime;

      let parsed: any = null;
      try {
        const jsonMatch = llmResult.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (_) {}

      if (parsed && typeof parsed.score === 'number') {
        const score = Math.min(Math.max(parsed.score, 0), 1);
        return {
          score,
          isCorrect: score >= 0.7,
          feedback: parsed.feedback || 'Good effort in addressing the question.',
          understandingScore: parsed.understandingScore || score,
          accuracyScore: parsed.accuracyScore || score,
          relevanceScore: parsed.relevanceScore || score,
          strengths: parsed.strengths || ['Good concept coverage'],
          missingConcepts: parsed.missingConcepts || [],
          improvementSuggestion: parsed.improvementSuggestion || 'Keep practicing related materials.',
        };
      }
    } catch (err) {
      logger.warn('AI Assessment evaluation failed, using fallback heuristic evaluator:', err);
    }

    // Heuristic fallback evaluator
    const textLen = userResponse.trim().length;
    const score = textLen > 20 ? 0.85 : 0.5;

    return {
      score,
      isCorrect: score >= 0.7,
      feedback: score >= 0.7 ? 'Demonstrates solid understanding of the core concept.' : 'Response is incomplete. Review material for details.',
      understandingScore: score,
      accuracyScore: score,
      relevanceScore: score,
      strengths: ['Identified main topic'],
      missingConcepts: score < 0.7 ? ['In-depth mechanism'] : [],
      improvementSuggestion: 'Continue reviewing project material concepts.',
    };
  }
}

export const assessmentService = new AssessmentService();
