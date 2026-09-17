import { Router } from 'express';
import { spaceController } from '../controllers/spaceController';
import { authenticateUser } from '../middleware/authMiddleware';
import { requireSpaceOwnership } from '../middleware/ownershipMiddleware';

export const spaceRouter = Router();

spaceRouter.use(authenticateUser);

spaceRouter.get('/', (req, res, next) => spaceController.getSpaces(req, res, next));
spaceRouter.post('/', (req, res, next) => spaceController.createSpace(req, res, next));
spaceRouter.get('/:spaceId', requireSpaceOwnership, (req, res, next) => spaceController.getSpace(req, res, next));
spaceRouter.delete('/:spaceId', requireSpaceOwnership, (req, res, next) => spaceController.deleteSpace(req, res, next));
