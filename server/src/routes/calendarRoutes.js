import { Router } from 'express';
import { CalendarController } from '../controllers/CalendarController.js';

const router = Router();

router.get('/', CalendarController.month);

export default router;
