import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService';

export class AnalyticsController {
  async getProjectAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const analytics = await analyticsService.getProjectAnalytics(projectId);
      
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
