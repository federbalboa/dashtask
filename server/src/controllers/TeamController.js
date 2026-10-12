import { TeamModel } from '../models/TeamModel.js';
import { UserModel } from '../models/UserModel.js';
import { TaskModel } from '../models/TaskModel.js';

/** CONTROLADOR: Equipos / Ecosistemas (solo Admin). */
export const TeamController = {
  list: (_req, res) => {
    const users = UserModel.raw();
    const tasks = TaskModel.all();
    const teams = TeamModel.all().map((t) => {
      const members = users.filter((u) => u.team === t.userTag);
      const taskCount = tasks.filter((x) => x.team === t.taskTag).length;
      return { ...t, count: members.length, taskCount, members };
    });
    const lone = users.filter((u) => !u.team).map((u) => ({ ...u, password: undefined }));
    return res.json({ teams, lone });
  },

  create: (req, res) => {
    try {
      const team = TeamModel.create(req.body || {});
      return res.status(201).json({ team });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  },

  update: (req, res) => {
    try {
      const team = TeamModel.update(req.params.id, req.body || {});
      if (!team) return res.status(404).json({ error: 'Equipo no encontrado.' });
      return res.json({ team });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  },

  remove: (req, res) => {
    try {
      const ok = TeamModel.remove(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Equipo no encontrado.' });
      return res.status(204).end();
    } catch (e) {
      return res.status(409).json({ error: e.message });
    }
  },

  /** Cambia el equipo de un usuario desde el tablero de administración. */
  setUserTeam: (req, res) => {
    try {
      const user = TeamModel.setUserTeam(req.params.id, req.body?.teamId || '');
      return res.json({ user });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  },
};