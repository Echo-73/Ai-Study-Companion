import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticateUser, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Strict security: all admin routes require authentication AND admin role
router.use(authenticateUser);
router.use(requireAdmin);

// Overview & Analytics
router.get('/overview', adminController.getOverview);
router.get('/charts', adminController.getCharts);

// User Management
router.get('/users', adminController.getUsers);
router.patch('/users/:userId/role', adminController.updateUserRole);

// Resource Monitoring
router.get('/projects', adminController.getProjects);
router.get('/materials', adminController.getMaterials);
router.get('/quizzes', adminController.getQuizzes);
router.get('/tutor', adminController.getTutorStats);
router.get('/mastery', adminController.getMasteryStats);

// Activity Audit & System Health
router.get('/activity', adminController.getActivity);
router.get('/health', adminController.getHealth);

export const adminRoutes = router;
