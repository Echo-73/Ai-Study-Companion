import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authenticateUser } from '../middleware/authMiddleware';
import { requireProjectOwnership } from '../middleware/ownershipMiddleware';

export const projectRouter = Router();

projectRouter.use(authenticateUser);

projectRouter.post('/', (req, res, next) => projectController.createProject(req, res, next));
projectRouter.get('/:projectId', requireProjectOwnership, (req, res, next) => projectController.getProjectDashboard(req, res, next));
projectRouter.delete('/:projectId', requireProjectOwnership, (req, res, next) => projectController.deleteProject(req, res, next));
