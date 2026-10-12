import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', auth, AuthController.me);
router.get('/catalog', AuthController.catalog);

export default router;
