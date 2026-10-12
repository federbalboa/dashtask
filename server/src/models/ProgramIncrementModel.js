import db from './Database.js';

/** MODELO: Program Increment (PI) */
const col = () => db.collection('programIncrements');

export const ProgramIncrementModel = {
  all: () => col().all(),
  current: () => col().findOne((pi) => pi.status === 'In Progress') || col().all()[0] || null,
  findById: (id) => col().findById(id),
  update: (id, patch) => col().update(id, patch),
};
