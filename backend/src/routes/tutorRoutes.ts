import { Router } from 'express';
import { tutorController } from '../controllers/tutorController';
import { authenticateUser } from '../middleware/authMiddleware';
import { requireProjectOwnership } from '../middleware/ownershipMiddleware';
import { tutorRateLimiter } from '../middleware/rateLimiter';

export const tutorRouter = Router({ mergeParams: true });

tutorRouter.use(authenticateUser);

tutorRouter.post('/chat', requireProjectOwnership, tutorRateLimiter, (req, res, next) =>
  tutorController.askTutor(req, res, next)
);

tutorRouter.get('/conversations', requireProjectOwnership, (req, res, next) =>
  tutorController.getConversations(req, res, next)
);

tutorRouter.get('/conversations/:conversationId', requireProjectOwnership, (req, res, next) =>
  tutorController.getMessages(req, res, next)
);
