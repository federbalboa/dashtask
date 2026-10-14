import { Router } from 'express';
import { ResourceController } from '../controllers/ResourceController.js';

const router = Router();

router.get('/', ResourceController.list);
router.get('/candidates', ResourceController.candidates);
router.post('/', ResourceController.add);
router.post('/:id/sprints', ResourceController.assignSprint);
router.delete('/:id/sprints/:sprintId', ResourceController.unassignSprint);
router.patch('/:id', ResourceController.update);
router.delete('/:id', ResourceController.remove);

export default router;