import { Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class ProjectController {
  async getProjectDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const dashboard = await projectService.getProjectDashboard(projectId);
      res.status(200).json({ success: true, data: dashboard });
    } catch (error) {
      next(error);
    }
  }

  async createProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const project = await projectService.createProject(userId, req.body);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      await projectService.deleteProject(projectId);
      res.status(200).json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
