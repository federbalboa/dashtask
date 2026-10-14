import db from './Database.js';
import { nextId, now } from '../utils/id.js';

/**
 * MODELO: Solicitudes de bloqueo de una tarea.
 * Bloquear una tarea no es una acción unilateral: se levanta una solicitud que
 * debe autorizar el portafolio (LPM), Product Management (PM), el Admin o
 * cualquier persona con el permiso global "aprobar bloqueos".
 * La tarea solo pasa a la columna "Bloqueado" cuando la solicitud es aprobada.
 */
const col = () => db.collection('blocks');

export const BlockModel = {
  all: () => col().all(),
  findById: (id) => col().findById(id),
  findByTask: (taskId) => col().find((b) => String(b.taskId) === String(taskId)),
  findPending: () => col().find((b) => b.status === 'pending'),

  create(payload) {
    const id = nextId(col().all(), 'BLK');
    const doc = {
      id,
      taskId: payload.taskId || '',
      taskTitle: payload.taskTitle || '',
      projectId: payload.projectId || null,
      sprintId: payload.sprintId || null,
      reason: payload.reason || '',
      requestedStage: payload.requestedStage || '',
      status: payload.status || 'pending',
      requester: payload.requester || '',
      requesterRole: payload.requesterRole || '',
      at: now(),
      applied: !!payload.applied,
      appliedBy: payload.appliedBy || '',
      appliedAt: payload.applied ? now() : '',
      decidedBy: '',
      decidedRole: '',
      decidedAt: '',
      decisionNote: '',
    };
    return col().insert(doc);
  },

  update: (id, patch) => {
    const current = col().findById(id);
    if (!current) return null;
    return col().update(id, { ...current, ...patch });
  },
};
