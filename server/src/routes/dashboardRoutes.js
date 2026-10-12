import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';

const router = Router();

router.get('/:role', DashboardController.forRole);

export default router;
