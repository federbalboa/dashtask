import db from './Database.js';
import { nextId, now } from '../utils/id.js';
import { UserModel } from './UserModel.js';
import { TaskModel } from './TaskModel.js';

/** MODELO: Teams / Ecosistemas gestionables por el Admin. */
const col = () => db.collection('teams');

export const TeamModel = {
  all: () => col().all(),
  findById: (id) => col().findById(id),
  findByUserTag: (tag) => col().findOne((t) => t.userTag === tag),

  create(payload) {
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('El nombre del equipo es obligatorio.');
    if (col().findOne((t) => t.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Ya existe un equipo llamado "${name}".`);
    }
    const kind = payload.kind === 'pool' ? 'pool' : 'team';
    const doc = {
      id: nextId(col().all(), 'TEAM'),
      name,
      userTag: kind === 'team' ? `Equipo "${name}"` : name,
      taskTag: kind === 'team' ? name : (payload.taskTag || 'ART'),
      kind,
      valueStream: payload.valueStream || '',
      description: payload.description || '',
      createdAt: now(),
    };
    return col().insert(doc);
  },

  /** Renombra el equipo y propaga el cambio a usuarios y tareas. */
  update(id, patch = {}) {
    const team = col().findById(id);
    if (!team) return null;
    const nextName = patch.name !== undefined ? String(patch.name).trim() : team.name;
    if (!nextName) throw new Error('El nombre del equipo es obligatorio.');
    if (nextName !== team.name) {
      if (col().findOne((t) => t.id !== id && t.name.toLowerCase() === nextName.toLowerCase())) {
        throw new Error(`Ya existe un equipo llamado "${nextName}".`);
      }
    }
    const renamed = nextName !== team.name;
    const next = {
      ...team,
      name: nextName,
      userTag: renamed ? (team.kind === 'team' ? `Equipo "${nextName}"` : nextName) : team.userTag,
      taskTag: renamed ? (team.kind === 'team' ? nextName : team.taskTag) : team.taskTag,
      valueStream: patch.valueStream !== undefined ? patch.valueStream : team.valueStream,
      description: patch.description !== undefined ? patch.description : team.description,
    };
    if (renamed) {
      UserModel.raw().forEach((u) => {
        if (u.team === team.userTag) UserModel.update(u.id, { team: next.userTag });
      });
      TaskModel.all().forEach((t) => {
        if (t.team === team.taskTag) TaskModel.update(t.id, { team: next.taskTag });
      });
    }
    return col().update(id, next);
  },

  remove(id) {
    const team = col().findById(id);
    if (!team) return false;
    const members = UserModel.raw().filter((u) => u.team === team.userTag);
    if (members.length) {
      throw new Error(`No se puede eliminar "${team.name}": tiene ${members.length} integrante(s). Muévelos a otro equipo primero.`);
    }
    return col().remove(id);
  },

  /** Cambia el equipo de un usuario (vacío = sin equipo). */
  setUserTeam(userId, teamId = '') {
    const user = UserModel.findById(userId);
    if (!user) throw new Error('Usuario no encontrado.');
    if (!teamId) {
      UserModel.update(userId, { team: '', teamId: null });
      return UserModel.findById(userId);
    }
    const team = col().findById(teamId);
    if (!team) throw new Error('Equipo no encontrado.');
    UserModel.update(userId, { team: team.userTag, teamId: team.id });
    return UserModel.findById(userId);
  },
};