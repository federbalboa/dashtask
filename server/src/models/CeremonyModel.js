import db from './Database.js';

/** MODELO: Ceremonia SAFe */
const col = () => db.collection('ceremonies');

export const CeremonyModel = {
  all: () => col().all(),
  findByLevel: (level) => col().find((c) => c.level === level),
  forRole: (role) => col().find((c) => (c.participants || []).includes(role)),
  findById: (id) => col().findById(id),
  update: (id, patch) => col().update(id, patch),
};
