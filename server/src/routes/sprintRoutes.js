import { Router } from 'express';
import { SprintController } from '../controllers/SprintController.js';

const router = Router();

router.get('/', SprintController.list);
router.get('/cadences', SprintController.cadences);
router.post('/', SprintController.create);
router.get('/:id', SprintController.get);
router.patch('/:id', SprintController.update);
router.post('/:id/assign', SprintController.assign);
router.post('/:id/carryover', SprintController.carryover);
router.delete('/:id', SprintController.remove);

export default router;
