import db from './Database.js';

/** MODELO: Usuario */
const col = () => db.collection('users');

export const UserModel = {
  all: () => col().all().map(sanitize),
  findById: (id) => {
    const u = col().findById(id);
    return u ? sanitize(u) : null;
  },
  findByEmail: (email) => {
    const u = col().findOne((x) => x.email.toLowerCase() === String(email).toLowerCase());
    return u || null;
  },
  findByRole: (role) => col().find((x) => x.role === role).map(sanitize),
  update: (id, patch) => {
    const updated = col().update(id, patch);
    return updated ? sanitize(updated) : null;
  },
  create: (doc) => sanitize(col().insert(doc)),
  raw: () => col().all(),
};

function sanitize(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}
