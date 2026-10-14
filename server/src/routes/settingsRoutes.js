import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController.js';

const router = Router();

router.get('/', SettingsController.get);
router.put('/wip', SettingsController.updateWip);

export default router;
