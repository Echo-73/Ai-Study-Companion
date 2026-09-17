import { Response, NextFunction } from 'express';
import { spaceService } from '../services/spaceService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class SpaceController {
  async getSpaces(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const spaces = await spaceService.getUserSpaces(userId);
      res.status(200).json({ success: true, data: spaces });
    } catch (error) {
      next(error);
    }
  }

  async getSpace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const spaceId = req.params.spaceId as string;
      const space = await spaceService.getSpaceDetails(spaceId);
      res.status(200).json({ success: true, data: space });
    } catch (error) {
      next(error);
    }
  }

  async createSpace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const space = await spaceService.createSpace(userId, req.body);
      res.status(201).json({ success: true, data: space });
    } catch (error) {
      next(error);
    }
  }

  async deleteSpace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const spaceId = req.params.spaceId as string;
      await spaceService.deleteSpace(spaceId);
      res.status(200).json({ success: true, message: 'Space deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const spaceController = new SpaceController();
