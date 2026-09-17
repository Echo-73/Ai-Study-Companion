import { Response, NextFunction } from 'express';
import { materialService } from '../services/materialService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';
import { storageService } from '../services/storageService';
import { logger } from '../config/logger';

export class MaterialController {
  async uploadMaterial(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    let fileUrl: string | undefined = undefined;

    try {
      const status = storageService.getStorageStatus();
      if (!status.configured) {
        throw new AppError(
          status.message || 'Persistent PDF storage is not configured in this deployment. File uploads are disabled.',
          503
        );
      }

      const userId = req.user!.userId;
      const projectId = (req.params.projectId || req.body.projectId) as string;
      const title = req.body.title || (req.file ? req.file.originalname : 'Uploaded Material');

      if (!projectId) {
        throw new AppError('projectId is required', 400);
      }

      if (req.file) {
        const saved = await storageService.saveFile({
          projectId,
          originalName: req.file.originalname,
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
        });
        fileUrl = saved.fileUrl;
      }

      const result = await materialService.uploadAndEnqueue({
        userId,
        projectId,
        title,
        fileUrl,
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
      if (fileUrl) {
        try {
          await storageService.deleteFile(fileUrl);
          logger.info(`Cleaned up uploaded storage file after downstream error: ${fileUrl}`);
        } catch (cleanupError: any) {
          logger.error(`Failed to clean up uploaded storage object (${fileUrl}):`, cleanupError);
        }
      }
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
