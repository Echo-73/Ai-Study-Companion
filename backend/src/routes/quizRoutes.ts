import { Router } from 'express';
import { quizController } from '../controllers/quizController';
import { authenticateUser } from '../middleware/authMiddleware';
import { requireProjectOwnership } from '../middleware/ownershipMiddleware';
import { quizGenRateLimiter } from '../middleware/rateLimiter';

export const quizRouter = Router({ mergeParams: true });

quizRouter.use(authenticateUser);

quizRouter.get('/', requireProjectOwnership, (req, res, next) =>
  quizController.getProjectQuizzes(req, res, next)
);

quizRouter.post('/generate', requireProjectOwnership, quizGenRateLimiter, (req, res, next) =>
  quizController.generateQuiz(req, res, next)
);

quizRouter.get('/:quizId', requireProjectOwnership, (req, res, next) =>
  quizController.getQuiz(req, res, next)
);

quizRouter.post('/:quizId/submit', requireProjectOwnership, (req, res, next) =>
  quizController.submitQuiz(req, res, next)
);

quizRouter.post('/submit', requireProjectOwnership, (req, res, next) =>
  quizController.submitQuiz(req, res, next)
);
