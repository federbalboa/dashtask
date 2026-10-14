import { ResourceModel } from '../models/ResourceModel.js';
import { UserModel } from '../models/UserModel.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { SprintModel } from '../models/SprintModel.js';
import { TaskModel } from '../models/TaskModel.js';
import { availabilityForSprints, totalsFromAvailability, spPerDayFor, sprintCapacity, assignedSp } from '../services/CapacityService.js';
import { getRole } from '../config/roles.js';

const ALLOWED_ROLES = ['product_manager', 'rte', 'lpm'];

function canManage(req, res) {
  if (!ALLOWED_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: 'Solo Product Management, RTE o LPM administran los recursos disponibles.' });
    return false;
  }
  return true;
}

/** CONTROLADOR: Recursos disponibles por proyecto (capacidad por sprint). */
export const ResourceController = {
  /** Lista de recursos registrados del proyecto (o de todos los visibles), con su disponibilidad (SP libres) por sprint. */
  list(req, res) {
    if (!canManage(req, res)) return;
    const { projectId } = req.query;
    let projects = null;
    if (projectId) {
      const p = ProjectModel.findById(projectId);
      if (!p) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      projects = [p];
    } else {
      projects = ProjectModel.all();
    }
    // El PM solo ve sus propios proyectos.
    if (req.user.role === 'product_manager') {
      projects = projects.filter(
        (p) => String(p.productManagerId) === String(req.user.id)
          || (!p.productManagerId && p.productManager === req.user.name)
      );
    }

    const tasks = TaskModel.all();
    const out = projects.map((project) => {
      const sprints = SprintModel.findByProject(project.id).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
      const projectTasks = tasks.filter((t) => t.projectId === project.id && t.sprintId && sprints.some((s) => s.id === t.sprintId));
      const registered = ResourceModel.findByProject(project.id);
      const inferred = projectTasks
        .map((t) => t.assigneeId)
        .filter(Boolean)
        .filter((uid, i, arr) => arr.indexOf(uid) === i)
        .filter((uid) => !registered.some((r) => r.userId === uid));

      const build = (docOrUserId, inferredFlag) => {
        const userId = typeof docOrUserId === 'string' ? docOrUserId : docOrUserId.userId;
        const user = UserModel.findById(userId);
        if (!user) return null;
        const availability = availabilityForSprints(sprints, tasks, { userId, project });
        const totals = totalsFromAvailability(availability);
        const perSprint = tasksFor(projectTasks, userId, sprints);
        return {
          id: typeof docOrUserId === 'string' ? null : docOrUserId.id,
          userId,
          name: user.name,
          email: user.email,
          role: user.role,
          roleLabel: getRole(user.role)?.short || user.role,
          avatar: user.avatar,
          inferred: inferredFlag,
          sprintIds: typeof docOrUserId === 'string' ? [] : (docOrUserId.sprintIds || []),
          sprints: sprints.map((s) => s.id),
          availability,
          totals,
          perSprint,
        };
      };

      const resources = [
        ...registered.map((r) => build(r, false)),
        ...inferred.map((uid) => build(uid, true)),
      ].filter(Boolean);

      // Roster por sprint: qué recursos forman el equipo de cada sprint y su capacidad agregada.
      const roster = sprints.map((s) => {
        const bySprintRegistered = registered.filter((r) => (r.sprintIds || []).includes(s.id));
        const registeredIds = bySprintRegistered.map((r) => r.userId);
        const inferredIds = projectTasks
          .filter((t) => t.sprintId === s.id && t.assigneeId)
          .map((t) => t.assigneeId);
        const userIds = [...new Set([...registeredIds, ...inferredIds])];
        const members = userIds
          .map((uid) => {
            const u = UserModel.findById(uid);
            if (!u) return null;
            const res = bySprintRegistered.find((r) => r.userId === uid);
            return {
              id: u.id,
              name: u.name,
              avatar: u.avatar,
              role: u.role,
              roleLabel: getRole(u.role)?.short || u.role,
              registered: !!res,
              resourceId: res?.id || null,
            };
          })
          .filter(Boolean);
        const cap = sprintCapacity(s, project);
        const capacity = userIds.length * cap;
        const assigned = assignedSp(projectTasks, { sprintId: s.id });
        return {
          sprint: { id: s.id, name: s.name, status: s.status, startDate: s.startDate, endDate: s.endDate },
          userIds,
          members,
          capacityPerPerson: cap,
          capacity,
          assigned,
          free: capacity - assigned,
          over: capacity - assigned < 0,
          pct: capacity ? Math.round((assigned / capacity) * 100) : 0,
        };
      });

      return {
        project: {
          id: project.id,
          code: project.code,
          name: project.name,
          valueStream: project.valueStream,
          productManager: project.productManager,
          productManagerId: project.productManagerId,
          spPerDay: spPerDayFor(project),
        },
        sprints,
        roster,
        resources,
      };
    });

    return res.json({ projects: out });
  },

  /** Candidatos (usuarios de nivel Equipo/ART) que aún no son recurso del proyecto, con su disponibilidad. */
  candidates(req, res) {
    if (!canManage(req, res)) return;
    const project = ProjectModel.findById(req.query.projectId || '');
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    const registered = ResourceModel.findByProject(project.id).map((r) => r.userId);
    const sprints = SprintModel.findByProject(project.id).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    const tasks = TaskModel.all();
    const projectTasks = tasks.filter((t) => t.projectId === project.id && t.sprintId && sprints.some((s) => s.id === t.sprintId));
    const candidates = UserModel.all()
      .filter((u) => ['developer', 'scrum_master', 'product_owner', 'system_architect'].includes(u.role))
      .filter((u) => !registered.includes(u.id))
      .map((u) => {
        const availability = availabilityForSprints(sprints, tasks, { userId: u.id, project });
        return {
          userId: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          roleLabel: getRole(u.role)?.short || u.role,
          availability,
          totals: totalsFromAvailability(availability),
          perSprint: tasksFor(projectTasks, u.id, sprints),
        };
      })
      .filter((c) => c.perSprint.length || c.totals.capacity > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.json({ project: { id: project.id, name: project.name }, spPerDay: spPerDayFor(project), candidates });
  },

  /**
   * Registra una persona en el proyecto y, si se indica un sprint, la deja
   * asignada a ese sprint. Si ya estaba registrada, simplemente agrega la
   * membresía al sprint (idempotente) — así el tablero puede arrastrar a la
   * misma persona a varios sprints sin error.
   */
  add(req, res) {
    if (!canManage(req, res)) return;
    const { projectId, userId, sprintId = null, sprintIds = null } = req.body || {};
    if (!projectId || !userId) return res.status(400).json({ error: 'projectId y userId son obligatorios.' });
    const project = ProjectModel.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    if (!UserModel.findById(userId)) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const wanted = [...new Set([...(sprintIds || []), ...(sprintId ? [sprintId] : [])].filter(Boolean))];
    for (const sid of wanted) {
      const sprint = SprintModel.findById(sid);
      if (!sprint || sprint.projectId !== projectId) {
        return res.status(400).json({ error: 'El sprint no pertenece al proyecto.' });
      }
    }

    const existing = ResourceModel.findOne(projectId, userId);
    if (existing) {
      let doc = existing;
      wanted.forEach((sid) => { doc = ResourceModel.assignSprint(existing.id, sid); });
      return res.status(200).json({ resource: doc, assigned: wanted.length > 0 });
    }

    const doc = ResourceModel.create({ projectId, userId, sprintIds: wanted, addedBy: req.user.name });
    return res.status(201).json({ resource: doc });
  },

  /** Agrega una membresía de sprint a un recurso registrado. */
  assignSprint(req, res) {
    if (!canManage(req, res)) return;
    const resource = ResourceModel.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Recurso no encontrado.' });
    const { sprintId } = req.body || {};
    const sprint = sprintId ? SprintModel.findById(sprintId) : null;
    if (!sprint || sprint.projectId !== resource.projectId) {
      return res.status(400).json({ error: 'El sprint no pertenece al proyecto del recurso.' });
    }
    const doc = ResourceModel.assignSprint(resource.id, sprintId);
    return res.json({ resource: doc });
  },

  /** Quita una membresía de sprint del recurso (sigue registrado en el proyecto). */
  unassignSprint(req, res) {
    if (!canManage(req, res)) return;
    const doc = ResourceModel.unassignSprint(req.params.id, req.params.sprintId);
    if (!doc) return res.status(404).json({ error: 'Recurso no encontrado.' });
    return res.json({ resource: doc });
  },

  /** Reemplaza la lista completa de sprints del recurso (compatibilidad). */
  update(req, res) {
    if (!canManage(req, res)) return;
    const resource = ResourceModel.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Recurso no encontrado.' });
    const patch = {};
    if ('sprintIds' in (req.body || {})) {
      const ids = [...new Set((req.body.sprintIds || []).filter(Boolean))];
      for (const sid of ids) {
        const sprint = SprintModel.findById(sid);
        if (!sprint || sprint.projectId !== resource.projectId) {
          return res.status(400).json({ error: 'Un sprint no pertenece al proyecto del recurso.' });
        }
      }
      patch.sprintIds = ids;
    }
    const doc = ResourceModel.update(resource.id, patch);
    return res.json({ resource: doc });
  },

  remove(req, res) {
    if (!canManage(req, res)) return;
    const ok = ResourceModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Recurso no encontrado.' });
    return res.status(204).end();
  },
};

/** Tareas de un usuario dentro de los sprints del proyecto (para mostrar el detalle que consume sus SP). */
function tasksFor(projectTasks, userId, sprints) {
  return projectTasks.filter((t) => t.assigneeId === userId).map((t) => ({
    id: t.id,
    title: t.title,
    storyPoints: t.storyPoints || 0,
    sprintId: t.sprintId,
    sprintName: sprints.find((s) => s.id === t.sprintId)?.name || '',
    status: t.status,
    projectId: t.projectId,
  }));
}