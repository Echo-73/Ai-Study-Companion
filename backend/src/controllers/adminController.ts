import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { adminService } from '../services/adminService';
import { AppError } from '../middleware/errorHandler';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export class AdminController {
  async getOverview(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getOverview();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const role = req.query.role as string | undefined;

      const data = await adminService.getUsers({ page, pageSize, search, role });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = String(req.params.userId);
      const currentAdminId = req.user?.userId;

      if (!currentAdminId) {
        throw new AppError('Authentication required', 401);
      }

      const parseResult = updateRoleSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new AppError(parseResult.error.errors[0].message, 400);
      }

      const updated = await adminService.updateUserRole(
        userId,
        parseResult.data.role,
        currentAdminId
      );

      res.status(200).json({
        success: true,
        message: `User role successfully updated to ${parseResult.data.role}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
      const search = req.query.search as string | undefined;

      const data = await adminService.getProjects({ page, pageSize, search });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getMaterials(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;

      const data = await adminService.getMaterials({ page, pageSize, search, status });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getQuizzes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;

      const data = await adminService.getQuizzes({ page, pageSize, search, status });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getTutorStats(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getTutorStats();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getMasteryStats(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getMasteryStats();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
      const search = req.query.search as string | undefined;
      const eventType = req.query.eventType as string | undefined;

      const data = await adminService.getActivity({ page, pageSize, search, eventType });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getHealth(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getHealth();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getCharts(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getCharts();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
