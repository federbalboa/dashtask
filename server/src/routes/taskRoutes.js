import { Router } from 'express';
import { TaskController } from '../controllers/TaskController.js';

const router = Router();

router.get('/', TaskController.list);
router.get('/board', TaskController.board);
router.get('/prioritized', TaskController.prioritized);
router.post('/reorder', TaskController.reorder);
router.post('/', TaskController.create);
router.get('/:id', TaskController.get);
router.patch('/:id', TaskController.update);
router.patch('/:id/details', TaskController.editDetails);
router.post('/:id/reschedule', TaskController.reschedule);
router.post('/:id/move', TaskController.move);
router.post('/:id/advance', TaskController.advance);
router.post('/:id/checklist/:key', TaskController.checklist);
router.post('/:id/sprint', TaskController.assignSprint);
router.delete('/:id', TaskController.remove);

export default router;
