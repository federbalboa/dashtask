import { Router } from 'express';
import { EpicController } from '../controllers/EpicController.js';

const router = Router();

router.get('/', EpicController.list);
router.get('/:id', EpicController.get);

export default router;
