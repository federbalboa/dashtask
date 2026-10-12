import db from './Database.js';
import { nextId, now } from '../utils/id.js';

/** MODELO: Solicitudes de cambio y reprogramaciones de fecha de entrega. */
const col = () => db.collection('changes');

export const ChangeModel = {
  all: () => col().all(),
  findById: (id) => col().findById(id),
  findByRef: (scope, refId) => col().find((c) => c.scope === scope && c.refId === refId),

  /** Crea una solicitud/reprogramación registrada (incidencia aplicada o control de cambios pendiente). */
  create(payload) {
    const id = nextId(col().all(), 'CHG');
    const doc = {
      id,
      scope: payload.scope || 'task',
      refId: payload.refId || '',
      refTitle: payload.refTitle || '',
      typeId: payload.typeId || '',
      from: payload.from || '',
      to: payload.to || '',
      reasonType: payload.reasonType || '',
      reasonCode: payload.reasonCode || '',
      note: payload.note || '',
      status: payload.status || 'pending',
      requester: payload.requester || '',
      requesterRole: payload.requesterRole || '',
      at: now(),
      appliedOn: payload.appliedOn || '',
      decidedBy: '',
      decidedRole: '',
      decidedAt: '',
      decisionNote: '',
    };
    return col().insert(doc);
  },

  update: (id, patch, extra = {}) => {
    const current = col().findById(id);
    if (!current) return null;
    return col().update(id, { ...current, ...patch, ...extra });
  },
};