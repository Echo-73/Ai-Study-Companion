import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import { authRouter } from './routes/authRoutes';
import { spaceRouter } from './routes/spaceRoutes';
import { projectRouter } from './routes/projectRoutes';
import { materialRouter } from './routes/materialRoutes';
import { tutorRouter } from './routes/tutorRoutes';
import { quizRouter } from './routes/quizRoutes';
import { growthRoutes } from './routes/growthRoutes';
import { analyticsRoutes } from './routes/analyticsRoutes';
import { adminRoutes } from './routes/adminRoutes';

export const app = express();

const allowedOrigins = [
  env.FRONTEND_URL.replace(/\/$/, ''),
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:'))
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Application Routes
app.use('/api/auth', authRouter);
app.use('/api/spaces', spaceRouter);
app.use('/api/projects', projectRouter);
app.use('/api/projects/:projectId/materials', materialRouter);
app.use('/api/projects/:projectId/tutor', tutorRouter);
app.use('/api/projects/:projectId/quiz', quizRouter);
app.use('/api/projects/:projectId/growth', growthRoutes);
app.use('/api/projects/:projectId/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-study-companion-backend',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// Global Error Handler
app.use(errorHandler);
