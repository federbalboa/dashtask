import db from '../models/Database.js';
import { PermissionModel } from '../models/PermissionModel.js';
import { UserModel } from '../models/UserModel.js';

/** CONTROLADOR: Administración / utilidades */
export const AdminController = {
  health: (_req, res) => res.json({ ok: true, service: 'dashtask-api', time: new Date().toISOString() }),

  reset: (_req, res) => {
    const data = db.seed();
    return res.json({
      ok: true,
      message: 'Base de datos restablecida al seed.',
      counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
    });
  },

  /** Lista de permisos otorgados (con el usuario al que pertenecen). */
  permissions: (_req, res) => {
    const perms = PermissionModel.all().map((p) => {
      const u = UserModel.findById(p.userId);
      return { ...p, userName: u?.name || '—', email: u?.email || '' };
    });
    return res.json({ permissions: perms });
  },

  /** Crea o actualiza el permiso global de un usuario. */
  upsertPermission: (req, res) => {
    const userId = req.params.userId;
    const target = UserModel.findById(userId);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const { canMarkAnyChecklist, canApproveBlocks, projectIds } = req.body || {};
    const perm = PermissionModel.upsert(userId, {
      canMarkAnyChecklist: !!canMarkAnyChecklist,
      canApproveBlocks: !!canApproveBlocks,
      projectIds: Array.isArray(projectIds) ? projectIds : [],
      grantedBy: req.user.name,
    });
    return res.json({ permission: perm });
  },

  /** Elimina el permiso global de un usuario. */
  removePermission: (req, res) => {
    const ok = PermissionModel.removeByUser(req.params.userId);
    if (!ok) return res.status(404).json({ error: 'El usuario no tiene permiso global otorgado.' });
    return res.status(204).end();
  },
};
