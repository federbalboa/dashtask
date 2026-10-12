import { Router } from 'express';
import { IntakeController } from '../controllers/IntakeController.js';

const router = Router();

router.get('/', IntakeController.list);
router.post('/', IntakeController.create);
router.get('/:id', IntakeController.get);
router.patch('/:id', IntakeController.update);
router.post('/:id/reschedule', IntakeController.reschedule);
router.post('/:id/triage', IntakeController.triage);
router.post('/:id/perspective', IntakeController.perspective);
router.post('/:id/estimate', IntakeController.estimate);
router.delete('/:id', IntakeController.remove);

export default router;
