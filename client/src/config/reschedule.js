/**
 * Config del control de cambios de entregas (espejo UI de server/src/config/reschedule.js).
 * Mantener en sincronía.
 */
export const REASON_TYPES = [
  { id: 'incidencia', label: 'Incidencia u omisión', icon: '⚡', tone: 'warn' },
  { id: 'control_cambios', label: 'Control de cambios', icon: '🛂', tone: 'info' },
];

export const REASON_CODES = {
  incidencia: [
    { id: 'info_incompleta', label: 'No pasaron la información completa', icon: '📄' },
    { id: 'validacion_faltante', label: 'Se omitió una validación requerida', icon: '🧾' },
    { id: 'requerimiento_incompleto', label: 'El requerimiento no venía completo', icon: '📋' },
    { id: 'revision_tardia', label: 'No se revisó a tiempo', icon: '⏱️' },
    { id: 'error', label: 'Error o fallo detectado', icon: '🐞' },
    { id: 'otro', label: 'Otro', icon: '…' },
  ],
  control_cambios: [
    { id: 'nuevo_alcance', label: 'Cambio o ampliación de alcance', icon: '🧩' },
    { id: 'dependencia', label: 'Dependencia externa retrasada', icon: '🔗' },
    { id: 'capacidad', label: 'Capacidad / disponibilidad del equipo', icon: '👥' },
    { id: 'prioridad', label: 'Re-priorización por negocio', icon: '🎯' },
    { id: 'riesgo', label: 'Mitigación de riesgo identificado', icon: '⚠️' },
    { id: 'otro', label: 'Otro', icon: '…' },
  ],
};

/** Roles que autorizan un control de cambios (equipo de portafolio + admin). Espejo de ChangeController. */
export const CHANGE_DECIDE_ROLES = ['lpm', 'business_owner', 'epic_owner', 'rte', 'admin'];
export const canDecideChange = (role) => CHANGE_DECIDE_ROLES.includes(role);

export const CHANGE_STATUS = {
  pending: { label: 'Por autorizar', icon: '⏳', tone: 'warn' },
  applied: { label: 'Aplicada · incidencia', icon: '⚡', tone: 'ok' },
  approved: { label: 'Autorizada', icon: '✓', tone: 'ok' },
  rejected: { label: 'Mantenida como estaba', icon: '✕', tone: 'danger' },
};

export const reasonTypeMeta = (id) =>
  REASON_TYPES.find((t) => t.id === id) || { id, label: id, icon: '•', tone: 'gray' };

export const reasonCodeMeta = (type, id) =>
  (REASON_CODES[type] || []).find((c) => c.id === id) || { id, label: id, icon: '•' };

export const changeStatusMeta = (status) =>
  CHANGE_STATUS[status] || { label: status, icon: '•', tone: 'gray' };