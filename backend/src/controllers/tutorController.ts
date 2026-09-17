import { Response, NextFunction } from 'express';
import { tutorService } from '../services/tutorService';
import { conversationRepository } from '../repositories/conversationRepository';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export class TutorController {
  async askTutor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = (req.params.projectId || req.body.projectId) as string;
      const { conversationId, question } = req.body;

      if (!question || typeof question !== 'string' || !question.trim()) {
        throw new AppError('Question text is required.', 400);
      }

      const result = await tutorService.askTutor({
        userId,
        projectId,
        conversationId,
        question: question.trim(),
      });

      res.status(200).json({
        success: true,
        response: result.message.content,
        data: {
          conversationId: result.conversationId,
          answer: result.message.content,
          response: result.message.content,
          message: result.message,
          citations: result.citations,
          isSupported: result.isSupported,
        },
      });
    } catch (error: any) {
      logger.error('Tutor Interaction Failed', {
        userId: req.user?.userId,
        projectId: req.params.projectId || req.body.projectId,
        feature: 'tutor',
        errorType: error.name || 'UnknownError',
        errorMessage: error.message,
        stackTrace: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const conversations = await conversationRepository.getProjectConversations(projectId);
      res.status(200).json({ success: true, data: conversations });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversationId = req.params.conversationId as string;
      const messages = await conversationRepository.getConversationMessages(conversationId);
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }
}

export const tutorController = new TutorController();
