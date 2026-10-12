import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';

const router = Router();

router.get('/', UserController.list);
router.get('/roles', UserController.roles);
router.get('/:id', UserController.get);

export default router;
