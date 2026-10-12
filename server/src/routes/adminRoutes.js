import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { TeamController } from '../controllers/TeamController.js';
import { auth, allowRoles } from '../middleware/auth.js';

const router = Router();

router.get('/health', AdminController.health);
router.post('/reset', AdminController.reset);

// Sección de permisos: solo el administrador.
router.get('/permissions', auth, allowRoles('admin'), AdminController.permissions);
router.put('/permissions/:userId', auth, allowRoles('admin'), AdminController.upsertPermission);
router.delete('/permissions/:userId', auth, allowRoles('admin'), AdminController.removePermission);

// Sección de equipos / ecosistemas: solo el administrador.
router.get('/teams', auth, allowRoles('admin'), TeamController.list);
router.post('/teams', auth, allowRoles('admin'), TeamController.create);
router.patch('/teams/:id', auth, allowRoles('admin'), TeamController.update);
router.delete('/teams/:id', auth, allowRoles('admin'), TeamController.remove);
router.put('/users/:id/team', auth, allowRoles('admin'), TeamController.setUserTeam);

export default router;