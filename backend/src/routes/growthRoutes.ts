import { Router } from 'express';
import { growthController } from '../controllers/growthController';
import { authenticateUser } from '../middleware/authMiddleware';
import { requireProjectOwnership } from '../middleware/ownershipMiddleware';

const router = Router({ mergeParams: true });

router.use(authenticateUser);
router.use(requireProjectOwnership);

router.get('/mastery', growthController.getMastery);
router.get('/recommendations', growthController.getRecommendations);
router.post('/recommendations/:id/dismiss', growthController.dismissRecommendation);

export const growthRoutes = router;
