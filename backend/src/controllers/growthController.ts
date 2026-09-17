import { Request, Response, NextFunction } from 'express';
import { masteryService } from '../services/masteryService';
import { recommendationService } from '../services/recommendationService';

export class GrowthController {
  async getMastery(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const mastery = await masteryService.getProjectMastery(projectId);
      
      res.status(200).json({
        success: true,
        data: mastery,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const recommendations = await recommendationService.getRecommendations(projectId);
      
      res.status(200).json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }

  async dismissRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId as string;
      const id = req.params.id as string;
      await recommendationService.dismissRecommendation(projectId, id);
      
      res.status(200).json({
        success: true,
        message: 'Recommendation dismissed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const growthController = new GrowthController();
