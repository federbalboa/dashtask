import db from './Database.js';
import { nextId, now } from '../utils/id.js';

/** MODELO: Recurso disponible (desarrollador registrado por el PM para un proyecto). */
const col = () => db.collection('resources');

export const ResourceModel = {
  all: () => col().all(),
  findById: (id) => col().findById(id),
  findByProject: (projectId) => col().find((r) => r.projectId === projectId),
  findOne: (projectId, userId) => col().findOne((r) => r.projectId === projectId && r.userId === userId),

  create: (payload) => {
    const id = nextId(col().all(), 'RES');
    const doc = {
      id,
      projectId: payload.projectId,
      userId: payload.userId,
      addedBy: payload.addedBy || '',
      addedAt: now(),
    };
    return col().insert(doc);
  },

  remove: (id) => col().remove(id),
};