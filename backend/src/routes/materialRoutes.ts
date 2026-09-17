import { Router } from 'express';
import { materialController } from '../controllers/materialController';
import { authenticateUser } from '../middleware/authMiddleware';
import { requireProjectOwnership } from '../middleware/ownershipMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import { materialUploadRateLimiter } from '../middleware/rateLimiter';

export const materialRouter = Router({ mergeParams: true });

materialRouter.use(authenticateUser);

materialRouter.get('/', requireProjectOwnership, (req, res, next) =>
  materialController.getProjectMaterials(req, res, next)
);

materialRouter.post('/upload', requireProjectOwnership, materialUploadRateLimiter, upload.single('file'), (req, res, next) =>
  materialController.uploadMaterial(req, res, next)
);

materialRouter.get('/:materialId/status', requireProjectOwnership, (req, res, next) =>
  materialController.getMaterialStatus(req, res, next)
);
