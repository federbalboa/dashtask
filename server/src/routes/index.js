import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import intakeRoutes from './intakeRoutes.js';
import taskRoutes from './taskRoutes.js';
import ceremonyRoutes from './ceremonyRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import projectRoutes from './projectRoutes.js';
import epicRoutes from './epicRoutes.js';
import sprintRoutes from './sprintRoutes.js';
import calendarRoutes from './calendarRoutes.js';
import timelineRoutes from './timelineRoutes.js';
import resourceRoutes from './resourceRoutes.js';
import adminRoutes from './adminRoutes.js';
import changeRoutes from './changeRoutes.js';
import blockRoutes from './blockRoutes.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

router.use('/users', auth, userRoutes);
router.use('/intakes', auth, intakeRoutes);
router.use('/tasks', auth, taskRoutes);
router.use('/ceremonies', auth, ceremonyRoutes);
router.use('/dashboard', auth, dashboardRoutes);
router.use('/projects', auth, projectRoutes);
router.use('/epics', auth, epicRoutes);
router.use('/sprints', auth, sprintRoutes);
router.use('/calendar', auth, calendarRoutes);
router.use('/timeline', auth, timelineRoutes);
router.use('/resources', auth, resourceRoutes);
router.use('/changes', changeRoutes);
router.use('/blocks', auth, blockRoutes);

export default router;
