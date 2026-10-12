import { Router } from 'express';
import { TimelineController } from '../controllers/TimelineController.js';

const router = Router();

router.get('/', TimelineController.get);

export default router;