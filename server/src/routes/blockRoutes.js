import { Router } from 'express';
import { BlockController } from '../controllers/BlockController.js';

const router = Router();

router.get('/', BlockController.list);
router.post('/', BlockController.create);
router.post('/:id/decide', BlockController.decide);

export default router;
