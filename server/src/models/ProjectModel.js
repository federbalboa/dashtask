import db from './Database.js';

/** MODELO: Proyecto (nivel portafolio; contiene épicas) */
const col = () => db.collection('projects');

export const ProjectModel = {
  all: () => col().all(),
  findById: (id) => col().findById(id),
  create: (doc) => col().insert(doc),
  update: (id, patch) => col().update(id, patch),
};
