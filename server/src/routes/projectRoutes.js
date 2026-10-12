import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController.js';

const router = Router();

router.get('/', ProjectController.list);
router.get('/tree', ProjectController.tree);
router.get('/:id', ProjectController.get);

export default router;
