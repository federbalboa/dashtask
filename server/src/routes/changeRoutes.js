import { Router } from 'express';
import { ChangeController } from '../controllers/ChangeController.js';
import { auth, allowRoles } from '../middleware/auth.js';

const router = Router();

// Vista del control de cambios de entregas: portafolio (decide) + PM/PO (consultan).
router.get('/', auth, allowRoles(...ChangeController.viewRoles), ChangeController.list);
// Autorización / mantenimiento de una solicitud: solo portafolio o admin.
router.post('/:id/decide', auth, allowRoles('lpm', 'business_owner', 'epic_owner', 'rte', 'admin'), ChangeController.decide);

export default router;