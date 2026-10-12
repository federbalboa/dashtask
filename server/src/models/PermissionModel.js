import db from './Database.js';
import { nextId, now } from '../utils/id.js';

/** MODELO: Permiso global otorgado a un usuario (sección de administración).
 * Cada registro le permite a un usuario marcar puntos del checklist que no le
 * pertenecen por rol (p. ej. una Product Manager que conduce la ceremonia y
 * completa el flujo de sus proyectos). */
const col = () => db.collection('permissions');

export const PermissionModel = {
  all: () => col().all(),
  findById: (id) => col().findById(id),
  findByUser: (userId) => col().findOne((x) => String(x.userId) === String(userId)) || null,
  findUsers: (userIds) => col().find((x) => userIds.includes(x.userId)),

  /** Crea o reemplaza el permiso de un usuario (uno por usuario). */
  upsert: (userId, patch) => {
    const existing = PermissionModel.findByUser(userId);
    if (existing) {
      return col().update(existing.id, {
        ...patch,
        updatedBy: patch.grantedBy || existing.grantedBy,
        updatedAt: now(),
      });
    }
    return col().insert({
      id: nextId(col().all(), 'PER'),
      userId,
      grantedBy: patch.grantedBy || '',
      grantedAt: now(),
      canMarkAnyChecklist: !!patch.canMarkAnyChecklist,
      projectIds: patch.projectIds || [],
    });
  },

  removeByUser: (userId) => {
    const existing = PermissionModel.findByUser(userId);
    if (!existing) return false;
    return col().remove(existing.id);
  },
};