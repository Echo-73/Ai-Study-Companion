import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authenticateUser } from '../middleware/authMiddleware';
import { requireProjectOwnership } from '../middleware/ownershipMiddleware';

const router = Router({ mergeParams: true });

router.use(authenticateUser);
router.use(requireProjectOwnership);

router.get('/', analyticsController.getProjectAnalytics);

export const analyticsRoutes = router;
