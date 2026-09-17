import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/authUtils';
import { AppError } from './errorHandler';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateUser = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Missing token.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    throw new AppError('Invalid or expired authentication token', 401);
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AppError('Authentication required.', 401);
  }

  if (req.user.role !== Role.ADMIN) {
    throw new AppError('Forbidden. Admin access required.', 403);
  }

  next();
};
