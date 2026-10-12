import db from './Database.js';

/** MODELO: Épica (pertenece a un proyecto; agrupa historias/tareas) */
const col = () => db.collection('epics');

export const EpicModel = {
  all: () => col().all(),
  findById: (id) => col().findById(id),
  findByProject: (projectId) => col().find((e) => e.projectId === projectId),
  create: (doc) => col().insert(doc),
  update: (id, patch) => col().update(id, patch),
};
