import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { prisma } from '../config/prisma';
import { AppError } from './errorHandler';

export const requireSpaceOwnership = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const spaceId = req.params.spaceId || req.body.spaceId;

    if (!userId) {
      throw new AppError('Authentication required.', 401);
    }

    if (!spaceId) {
      throw new AppError('Space ID parameter is required.', 400);
    }

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      throw new AppError('Space not found.', 404);
    }

    if (space.userId !== userId && req.user?.role !== 'ADMIN') {
      throw new AppError('Forbidden. You do not have access to this Space.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireProjectOwnership = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const projectId = req.params.projectId || req.body.projectId;

    if (!userId) {
      throw new AppError('Authentication required.', 401);
    }

    if (!projectId) {
      throw new AppError('Project ID parameter is required.', 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { space: true },
    });

    if (!project) {
      throw new AppError('Project not found.', 404);
    }

    if (project.space.userId !== userId && req.user?.role !== 'ADMIN') {
      throw new AppError('Forbidden. You do not have access to this Project.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
