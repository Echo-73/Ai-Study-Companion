import { Response, NextFunction } from 'express';
import { quizGenerationService } from '../services/quizGenerationService';
import { quizRepository } from '../repositories/quizRepository';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';

export class QuizController {
  async generateQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = (req.params.projectId || req.body.projectId) as string;
      const questionCount = req.body.questionCount ? parseInt(req.body.questionCount) : 5;
      const difficulty = req.body.difficulty !== undefined ? parseFloat(req.body.difficulty) : undefined;
      const topic = (req.body.topic || req.query.topic) as string | undefined;

      console.log(`[QUIZ BACKEND]\nRequest received\nProject ID: ${projectId}\nQuestion count: ${questionCount}\nDifficulty: ${difficulty ?? 'adaptive'}\nTopic: ${topic || 'all concepts'}`);

      const quiz = await quizGenerationService.generateAdaptiveQuiz({
        userId,
        projectId,
        questionCount,
        difficulty,
        topic,
      });

      // Provide both flat quiz properties and nested data.quiz for maximum frontend compatibility
      res.status(201).json({
        success: true,
        data: {
          ...quiz,
          quiz,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const quizId = req.params.quizId as string;
      const quiz = await quizRepository.findById(quizId);
      if (!quiz) {
        throw new AppError('Quiz not found', 404);
      }
      res.status(200).json({ success: true, data: { ...quiz, quiz } });
    } catch (error) {
      next(error);
    }
  }

  async submitQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = (req.params.projectId || req.body.projectId) as string;
      const quizId = (req.params.quizId || req.body.quizId) as string;
      const incomingList = req.body.responses || req.body.answers;

      if (!Array.isArray(incomingList)) {
        throw new AppError('responses or answers must be an array of question answers.', 400);
      }

      const formattedResponses = incomingList.map((r: any) => ({
        questionId: r.questionId,
        userResponse: r.userResponse !== undefined ? String(r.userResponse) : String(r.answer || ''),
      }));

      const result = await quizGenerationService.submitQuiz({
        userId,
        projectId,
        quizId,
        responses: formattedResponses,
      });

      res.status(200).json({
        success: true,
        data: {
          ...result,
          score: result.overallScore,
          evaluations: result.evaluatedResponses,
          result: {
            ...result,
            score: result.overallScore,
            evaluations: result.evaluatedResponses,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectQuizzes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const quizzes = await quizRepository.getProjectQuizzes(projectId);
      res.status(200).json({ success: true, data: quizzes });
    } catch (error) {
      next(error);
    }
  }
}

export const quizController = new QuizController();
