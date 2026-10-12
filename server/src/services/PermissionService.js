import { PermissionModel } from '../models/PermissionModel.js';
import { getRole } from '../config/roles.js';

/**
 * SERVICE: reglas de autorización sobre el checklist de las tareas.
 * Un usuario puede marcar/desmarcar un punto del checklist si:
 *  1. es administrador;
 *  2. el punto le pertenece (item.role === user.role);
 *  3. su rol lo autoriza por delegación técnica (team_lead / tech_lead para desarrollo);
 *  4. tiene un permiso global "puede marcar cualquier punto" (otorgado por el admin),
 *     restringido opcionalmente a uno o varios proyectos.
 */
export function canEditChecklistItem(user, task, item) {
  if (!user || !item) return false;
  if (user.role === 'admin') return true;
  if (user.role === item.role) return true;

  const meta = getRole(user.role);
  if (meta?.canMarkChecklistRoles?.includes(item.role)) return true;

  const perm = PermissionModel.findByUser(user.id);
  if (perm?.canMarkAnyChecklist) {
    if (!perm.projectIds || !perm.projectIds.length) return true;
    if (!task || !task.projectId) return false;
    return perm.projectIds.some((id) => String(id) === String(task.projectId));
  }
  return false;
}

/** Alcance por proyectos de un permiso global (para la UI). */
export function permissionScope(user) {
  if (user.role === 'admin') return { any: true, projectIds: null };
  const perm = PermissionModel.findByUser(user.id);
  return { any: !!perm?.canMarkAnyChecklist, projectIds: perm?.projectIds || [] };
}