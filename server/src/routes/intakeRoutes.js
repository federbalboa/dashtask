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
router.post('/:id/requirements', IntakeController.addRequirement);
router.patch('/:id/requirements/:key/meta', IntakeController.updateRequirement);
router.patch('/:id/requirements/:key', IntakeController.setRequirement);
router.delete('/:id/requirements/:key', IntakeController.removeRequirement);
router.delete('/:id', IntakeController.remove);

export default router;
