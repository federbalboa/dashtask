import { Router } from 'express';
import { CeremonyController } from '../controllers/CeremonyController.js';

const router = Router();

router.get('/', CeremonyController.list);
router.get('/role/:role', CeremonyController.forRole);

export default router;
