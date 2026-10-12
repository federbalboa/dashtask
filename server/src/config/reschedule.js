/**
 * CONFIG: Reprogramación de entregas.
 * Todo cambio en la fecha de entrega debe quedar identificado con un motivo:
 *   1) Incidencia u omisión → cambio ágil e inmediato.
 *   2) Control de cambios → solicitud que el equipo de portafolio autoriza o mantiene.
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

export const CHANGE_STATUS = {
  pending: { label: 'Por autorizar', icon: '⏳', tone: 'warn' },
  applied: { label: 'Aplicada (incidencia)', icon: '⚡', tone: 'ok' },
  approved: { label: 'Autorizada', icon: '✓', tone: 'ok' },
  rejected: { label: 'Mantenida como estaba', icon: '✕', tone: 'danger' },
};

export function reasonTypeMeta(id) {
  return REASON_TYPES.find((t) => t.id === id) || { id, label: id, icon: '•', tone: 'gray' };
}

export function reasonCodeMeta(type, id) {
  const list = REASON_CODES[type] || [];
  return list.find((c) => c.id === id) || { id, label: id, icon: '•' };
}

export function changeStatusMeta(status) {
  return CHANGE_STATUS[status] || { label: status, icon: '•', tone: 'gray' };
}

/** Valida una solicitud de reprogramación de fecha de entrega. */
export function validateReschedule({ current = '', to, reasonType, reasonCode, note }) {
  if (!to || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { error: 'La nueva fecha de entrega es obligatoria (formato AAAA-MM-DD).' };
  }
  if (!REASON_TYPES.some((t) => t.id === reasonType)) {
    return { error: 'Selecciona el motivo: incidencia u omisión, o control de cambios.' };
  }
  if (!reasonCode || !(REASON_CODES[reasonType] || []).some((c) => c.id === reasonCode)) {
    return { error: 'Selecciona el motivo específico del cambio.' };
  }
  if (current && to === current) {
    return { error: 'La fecha de entrega no cambió. Selecciona una fecha distinta.' };
  }
  if (String(note || '').trim().length > 0 && String(note).trim().length < 14) {
    return { error: 'Si registras un comentario, que explique el contexto (mínimo 14 caracteres).' };
  }
  return null;
}