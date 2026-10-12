import { UserModel } from '../models/UserModel.js';
import { getRole } from '../config/roles.js';

/** CONTROLADOR: Autenticación */
export const AuthController = {
  login(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }
    const user = UserModel.findByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }
    const token = Buffer.from(user.id).toString('base64');
    return res.json({
      token,
      user: { ...user, roleMeta: getRole(user.role) },
    });
  },

  me(req, res) {
    const user = UserModel.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    return res.json({ user: { ...user, roleMeta: getRole(user.role) } });
  },

  catalog(_req, res) {
    const users = UserModel.all().map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      title: u.title,
      team: u.team,
      valueStream: u.valueStream,
      avatar: u.avatar,
      active: u.active !== false,
    }));
    return res.json({ users });
  },
};
