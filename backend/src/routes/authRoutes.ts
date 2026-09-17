import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateUser } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, (req, res, next) => authController.register(req, res, next));
authRouter.post('/login', authRateLimiter, (req, res, next) => authController.login(req, res, next));
authRouter.get('/me', authenticateUser, (req, res, next) => authController.getMe(req, res, next));

