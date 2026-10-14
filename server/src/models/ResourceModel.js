import db from './Database.js';
import { nextId, now } from '../utils/id.js';

/**
 * MODELO: Recurso disponible (persona registrada por el PM para un proyecto).
 * Un recurso puede pertenecer a VARIOS sprints del proyecto (líneas de tiempo
 * distintas), por eso guardamos `sprintIds` como lista.
 */
const col = () => db.collection('resources');

const normalize = (doc) => {
  if (!doc) return doc;
  const sprintIds = Array.isArray(doc.sprintIds)
    ? doc.sprintIds
    : doc.sprintId ? [doc.sprintId] : [];
  return { ...doc, sprintIds: [...new Set(sprintIds.filter(Boolean))] };
};

export const ResourceModel = {
  all: () => col().all().map(normalize),
  findById: (id) => normalize(col().findById(id)),
  findByProject: (projectId) => col().find((r) => r.projectId === projectId).map(normalize),
  findOne: (projectId, userId) => normalize(col().findOne((r) => r.projectId === projectId && r.userId === userId)),

  create: (payload) => {
    const id = nextId(col().all(), 'RES');
    const sprintIds = Array.isArray(payload.sprintIds)
      ? payload.sprintIds
      : payload.sprintId ? [payload.sprintId] : [];
    const doc = {
      id,
      projectId: payload.projectId,
      userId: payload.userId,
      sprintIds: [...new Set(sprintIds.filter(Boolean))],
      addedBy: payload.addedBy || '',
      addedAt: now(),
    };
    return col().insert(doc);
  },

  update: (id, patch) => {
    const doc = col().findById(id);
    if (!doc) return null;
    const next = { ...doc };
    if ('sprintIds' in patch) next.sprintIds = [...new Set((patch.sprintIds || []).filter(Boolean))];
    delete next.sprintId;
    return col().update(id, next);
  },

  /** Agrega una membresía de sprint al recurso (idempotente). */
  assignSprint: (id, sprintId) => {
    const doc = normalize(col().findById(id));
    if (!doc) return null;
    if (!sprintId || doc.sprintIds.includes(sprintId)) return doc;
    return col().update(id, { sprintIds: [...doc.sprintIds, sprintId] });
  },

  /** Quita una membresía de sprint del recurso. */
  unassignSprint: (id, sprintId) => {
    const doc = normalize(col().findById(id));
    if (!doc) return null;
    return col().update(id, { sprintIds: doc.sprintIds.filter((s) => s !== sprintId) });
  },

  remove: (id) => col().remove(id),
};
