import { prisma } from '../config/prisma';
import { Quiz, Question, QuestionResponse, Assessment, QuestionType } from '@prisma/client';

export class QuizRepository {
  async createQuiz(data: {
    projectId: string;
    title: string;
    description?: string;
  }): Promise<Quiz> {
    return prisma.quiz.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description || null,
      },
    });
  }

  async addQuestions(questionsData: Array<{
    quizId: string;
    conceptId?: string;
    type: QuestionType;
    prompt: string;
    options?: string[];
    correctAnswer?: string;
    difficulty?: number;
  }>): Promise<void> {
    await prisma.question.createMany({
      data: questionsData.map((q) => ({
        quizId: q.quizId,
        conceptId: q.conceptId || null,
        type: q.type,
        prompt: q.prompt,
        options: q.options ? (q.options as any) : null,
        correctAnswer: q.correctAnswer || null,
        difficulty: q.difficulty || 0.5,
      })),
    });
  }

  async findById(quizId: string) {
    return prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            concept: true,
            responses: true,
          },
        },
        assessments: true,
      },
    });
  }

  async saveResponse(data: {
    questionId: string;
    userResponse: string;
    isCorrect?: boolean;
    score?: number;
    feedback?: string;
  }): Promise<QuestionResponse> {
    return prisma.questionResponse.create({
      data: {
        questionId: data.questionId,
        userResponse: data.userResponse,
        isCorrect: data.isCorrect !== undefined ? data.isCorrect : null,
        score: data.score !== undefined ? data.score : null,
        feedback: data.feedback || null,
      },
    });
  }

  async completeQuiz(quizId: string, overallScore: number): Promise<Quiz> {
    return prisma.quiz.update({
      where: { id: quizId },
      data: {
        score: overallScore,
        completedAt: new Date(),
      },
    });
  }

  async saveAssessment(data: {
    quizId: string;
    overallScore: number;
    understandingScore: number;
    accuracyScore: number;
    relevanceScore: number;
    strengths: string[];
    missingConcepts: string[];
    improvementSummary: string;
  }): Promise<Assessment> {
    return prisma.assessment.create({
      data: {
        quizId: data.quizId,
        overallScore: data.overallScore,
        understandingScore: data.understandingScore,
        accuracyScore: data.accuracyScore,
        relevanceScore: data.relevanceScore,
        strengths: data.strengths as any,
        missingConcepts: data.missingConcepts as any,
        improvementSummary: data.improvementSummary,
      },
    });
  }

  async getProjectQuizzes(projectId: string): Promise<Quiz[]> {
    return prisma.quiz.findMany({
      where: { projectId },
      include: {
        _count: { select: { questions: true } },
        assessments: { select: { overallScore: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const quizRepository = new QuizRepository();
