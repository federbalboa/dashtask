import { UserModel } from '../models/UserModel.js';

/**
 * MIDDLEWARE de autenticación.
 * El token demo es el userId en base64 (Authorization: Bearer <token>).
 */
export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token) return res.status(401).json({ error: 'No autenticado.' });

  let userId;
  try {
    userId = Buffer.from(token, 'base64').toString('utf-8');
  } catch {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const user = UserModel.findById(userId);
  if (!user) return res.status(401).json({ error: 'Sesión inválida.' });

  req.userId = user.id;
  req.user = user;
  return next();
}

/** Middleware de autorización por rol. */
export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado.' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción.' });
    }
    return next();
  };
}
