import { UserModel } from '../models/UserModel.js';
import { roleList, getRole } from '../config/roles.js';

/** CONTROLADOR: Usuarios y metadatos de roles */
export const UserController = {
  list: (_req, res) => {
    return res.json({ users: UserModel.all() });
  },

  get: (req, res) => {
    const user = UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    return res.json({ user: { ...user, roleMeta: getRole(user.role) } });
  },

  roles: (_req, res) => res.json({ roles: roleList }),
};
