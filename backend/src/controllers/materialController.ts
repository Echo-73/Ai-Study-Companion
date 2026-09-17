import { Response, NextFunction } from 'express';
import { materialService } from '../services/materialService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';

export class MaterialController {
  async uploadMaterial(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = (req.params.projectId || req.body.projectId) as string;
      const title = req.body.title || (req.file ? req.file.originalname : 'Uploaded Material');
      const filePath = req.file ? req.file.path : undefined;

      if (!projectId) {
        throw new AppError('projectId is required', 400);
      }

      const result = await materialService.uploadAndEnqueue({
        userId,
        projectId,
        title,
        filePath,
      });

      res.status(202).json({
        success: true,
        data: {
          material: result.material,
          jobId: result.jobId,
          message: 'Material upload accepted. Asynchronous PDF processing started.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMaterialStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const materialId = req.params.materialId as string;
      const material = await materialService.getMaterialStatus(materialId);
      res.status(200).json({ success: true, data: material });
    } catch (error) {
      next(error);
    }
  }

  async getProjectMaterials(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId as string;
      const materials = await materialService.getProjectMaterials(projectId);
      res.status(200).json({ success: true, data: materials });
    } catch (error) {
      next(error);
    }
  }
}

export const materialController = new MaterialController();
