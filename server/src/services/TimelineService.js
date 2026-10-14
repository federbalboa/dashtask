/**
 * SERVICE: Timeline (vista Gantt por rol).
 * Agrega tareas, épicas, proyectos, sprints y Program Increments con
 * rangos de fechas calculados para dibujar una línea de tiempo.
 */
import { TaskModel, KANBAN_COLUMNS } from '../models/TaskModel.js';
import { SprintModel } from '../models/SprintModel.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { EpicModel } from '../models/EpicModel.js';
import { ProgramIncrementModel } from '../models/ProgramIncrementModel.js';
import { CeremonyModel } from '../models/CeremonyModel.js';
import { availabilityForSprints } from './CapacityService.js';
import { addDays, diffDays, fmt, toDate, occurrencesInMonth } from '../utils/dates.js';
import { ROLES } from '../config/roles.js';

/** Colores/semántica por estado (coinciden con los tonos del frontend). */
export const STATUS_TONES = {
  backlog: 'backlog',
  in_progress: 'in_progress',
  qa: 'qa',
  uat: 'uat',
  release: 'release',
  blocked: 'blocked',
};

/** Rango SP-based de una tarea: si está en un sprint, la barra empieza en el sprint
 * y dura `storyPoints` días (configurable: 1 SP = 1 día). Sin sprint, se alinea a
 * dueDate o a creado + esfuerzo. */
export function taskSpan(task, sprintsById) {
  const sprint = task.sprintId ? sprintsById.get(task.sprintId) : null;
  const spDays = Math.max(1, Number(task.storyPoints) || 1);
  if (sprint && sprint.startDate && sprint.endDate) {
    return {
      start: sprint.startDate,
      end: addDays(sprint.startDate, spDays - 1),
      spDays,
      sprintDays: diffDays(sprint.startDate, sprint.endDate) + 1,
    };
  }
  const start = task.createdAt ? fmt(task.createdAt) : fmt(new Date());
  if (task.dueDate) return { start, end: task.dueDate, spDays };
  return { start, end: addDays(start, Math.max(1, spDays)), spDays };
}

const tone = (status) => STATUS_TONES[status] || 'backlog';

export function decorateTask(task, ctx) {
  const { projectsById, epicsById, sprintsById } = ctx;
  const span = taskSpan(task, sprintsById);
  const project = task.projectId ? projectsById.get(task.projectId) : null;
  const epic = task.epicId ? epicsById.get(task.epicId) : null;
  const sprint = task.sprintId ? sprintsById.get(task.sprintId) : null;
  return {
    ...task,
    span,
    tone: tone(task.status),
    project: project ? { id: project.id, code: project.code, name: project.name } : null,
    epic: epic ? { id: epic.id, name: epic.name } : null,
    sprint: sprint ? { id: sprint.id, name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate } : null,
  };
}

function minDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return toDate(a).getTime() <= toDate(b).getTime() ? a : b;
}

function maxDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return toDate(a).getTime() >= toDate(b).getTime() ? a : b;
}

/** Alcance de "Mi línea de tiempo" según el rol: por responsabilidad, no sólo tareas asignadas. */
export function mineScope(user) {
  switch (user.role) {
    case 'product_manager': {
      const projectIds = new Set(ProjectModel.all()
        .filter((p) => String(p.productManagerId) === String(user.id) || (!p.productManagerId && p.productManager === user.name))
        .map((p) => p.id));
      return { label: 'de tus proyectos (Product Management)', projectIds };
    }
    case 'business_owner': {
      const projectIds = new Set(ProjectModel.all()
        .filter((p) => p.owner === user.name || String(p.ownerId) === String(user.id))
        .map((p) => p.id));
      return { label: 'de tus proyectos (Business Owner)', projectIds };
    }
    case 'epic_owner': {
      const epicIds = new Set(EpicModel.all()
        .filter((e) => e.owner === user.name || String(e.ownerId) === String(user.id))
        .map((e) => e.id));
      return { label: 'de tus épicas (Epic Owner)', epicIds };
    }
    case 'rte':
    case 'system_architect':
    case 'lpm':
    case 'admin':
      return { label: 'de todo el ART / portafolio', all: true };
    default:
      return null;
  }
}

export const TimelineService = {
  /** Vista "Mi línea de tiempo": tareas asignadas al usuario + las que le corresponden por rol. */
  mine(user) {
    const ctx = this._ctx();
    const all = TaskModel.all();
    const assigned = TaskModel.findByAssignee(user.id);
    const scope = mineScope(user);

    let scoped = [];
    if (scope) {
      if (scope.all) scoped = all;
      else if (scope.projectIds) scoped = all.filter((t) => t.projectId && scope.projectIds.has(t.projectId));
      else if (scope.epicIds) scoped = all.filter((t) => t.epicId && scope.epicIds.has(t.epicId));
    }

    const byId = new Map();
    [...scoped, ...assigned].forEach((t) => byId.set(t.id, t));
    const myTasks = [...byId.values()].map((t) => decorateTask(t, ctx));

    const columns = KANBAN_COLUMNS.map((c) => ({
      ...c,
      count: myTasks.filter((t) => t.status === c.id).length,
      tasks: myTasks.filter((t) => t.status === c.id).map((t) => t.id),
    }));
    const done = columns.find((c) => c.id === 'release')?.count || 0;
    return {
      user: { id: user.id, name: user.name, role: user.role },
      scopeLabel: scope?.label || 'asignadas a ti',
      assignedCount: assigned.length,
      tasks: myTasks.sort((a, b) => a.span.start.localeCompare(b.span.start)),
      kanban: columns,
      totals: { tasks: myTasks.length, done, donePct: myTasks.length ? Math.round((done / myTasks.length) * 100) : 0 },
    };
  },

  /** Vista "General por Program Increment": tareas del ART agrupadas por PI/Iteración.
   * `opts.projectIds` restringe el alcance (PM ve solo sus proyectos). */
  byPI(opts = {}) {
    const ctx = this._ctx();
    const scope = opts.projectIds?.length ? new Set(opts.projectIds) : null;
    const all = TaskModel.all()
      .filter((t) => !scope || t.projectId && scope.has(t.projectId))
      .map((t) => decorateTask(t, ctx));
    const pIs = ProgramIncrementModel.all()
      .map((pi) => ({
        id: pi.id,
        name: pi.name,
        status: pi.status,
        startDate: pi.startDate,
        endDate: pi.endDate,
        iterations: pi.iterations || [],
      }))
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    const pIsById = new Map(pIs.map((p) => [p.id, p]));

    // Rango de cada iteración: partición equitativa del PI.
    const iterationRange = (pi, iterName) => {
      const start = pi.startDate;
      const end = pi.endDate;
      const iters = pi.iterations.length ? pi.iterations : [iterName || 'Iter 1'];
      const idx = pi.iterations.indexOf(iterName);
      const i = idx === -1 ? 0 : idx;
      const total = diffDays(start, end);
      const chunk = Math.floor(total / iters.length);
      const s = addDays(start, i * chunk);
      const e = i === iters.length - 1 ? end : addDays(s, chunk - 1);
      return { start: s, end: maxDate(s, e) };
    };

    const groups = pIs.map((pi) => {
      const piTasks = all.filter((t) => t.pi === pi.id);
      const byIter = new Map();
      piTasks.forEach((t) => {
        const key = t.iteration || 'Sin iteración';
        if (!byIter.has(key)) byIter.set(key, []);
        byIter.get(key).push(t);
      });
      const iterations = [...byIter.entries()]
        .sort((a, b) => (a[0] === 'Sin iteración' ? 1 : b[0] === 'Sin iteración' ? -1 : a[0].localeCompare(b[0])))
        .map(([name, tasks]) => ({
          name,
          range: iterationRange(pi, name),
          tasks: tasks.sort((a, b) => a.span.start.localeCompare(b.span.start)),
        }));
      return {
        id: pi.id,
        name: pi.name,
        status: pi.status,
        startDate: pi.startDate,
        endDate: pi.endDate,
        iterations,
        totals: { tasks: piTasks.length },
      };
    });

    const unassigned = all.filter((t) => !t.pi || !pIsById.has(t.pi));

    return { programIncrements: groups, unassigned };
  },

  /** Vista "Panorama de proyectos": proyectos → épicas → tareas + sprints.
   * `opts.projectIds` restringe el alcance (PM ve solo sus proyectos). */
  projects(opts = {}) {
    const ctx = this._ctx();
    const { sprintsById } = ctx;
    const scope = opts.projectIds?.length ? new Set(opts.projectIds) : null;
    const all = TaskModel.all()
      .filter((t) => !scope || t.projectId && scope.has(t.projectId))
      .map((t) => decorateTask(t, ctx));
    const projects = ProjectModel.all()
      .filter((p) => !scope || scope.has(p.id))
      .map((p) => {
        const pTasks = all.filter((t) => t.projectId === p.id);
        const pEpics = EpicModel.findByProject(p.id);
        const sprints = [...sprintsById.values()].filter((s) => String(s.projectId) === String(p.id));
        const capacity = availabilityForSprints(sprints, TaskModel.all(), { project: p });

      const epics = pEpics.map((e) => {
        const eTasks = pTasks.filter((t) => t.epicId === e.id);
        const span = eTasks.reduce(
          (acc, t) => ({
            start: minDate(acc.start, t.span.start),
            end: maxDate(acc.end, t.span.end),
          }),
          { start: p.startDate, end: p.targetDate }
        );
        return {
          id: e.id,
          name: e.name,
          status: e.status,
          span,
          tasks: eTasks.sort((a, b) => a.span.start.localeCompare(b.span.start)),
        };
      });

      const orphanTasks = pTasks
        .filter((t) => !t.epicId || !pEpics.find((e) => e.id === t.epicId))
        .sort((a, b) => a.span.start.localeCompare(b.span.start));

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        valueStream: p.valueStream,
        productManager: p.productManager,
        productManagerId: p.productManagerId,
        startDate: p.startDate,
        targetDate: p.targetDate,
        sprints: sprints.map((s) => ({ id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate })).sort((a, b) => a.startDate.localeCompare(b.startDate)),
        capacity,
        epics,
        orphanTasks,
        totals: {
          epics: epics.length,
          tasks: pTasks.length,
          done: pTasks.filter((t) => t.status === 'release').length,
          points: pTasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0),
        },
      };
    });

    return { projects };
  },

  /** Catálogo global de sprints (para snapping del drag y para la pestaña de recursos). */
  sprints() {
    return (SprintModel.all ? SprintModel.all() : [])
      .map((s) => ({
        id: s.id,
        projectId: s.projectId,
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        cadence: s.cadence,
        days: diffDays(s.startDate, s.endDate) + 1,
      }))
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  },

  /** Rango de fechas que cubren los datos (sprints, proyectos y tareas).
   * Los hitos de ceremonias se generan dentro de este rango. */
  window() {
    const ctx = this._ctx();
    const all = TaskModel.all().map((t) => decorateTask(t, ctx));
    let min = null;
    let max = null;
    const consider = (d) => {
      if (!d) return;
      min = minDate(min, d);
      max = maxDate(max, d);
    };
    [...ctx.sprintsById.values()].forEach((s) => {
      consider(s.startDate);
      consider(s.endDate);
    });
    ProjectModel.all().forEach((p) => {
      consider(p.startDate);
      consider(p.targetDate);
    });
    all.forEach((t) => {
      consider(t.span.start);
      consider(t.span.end);
    });
    if (!min || !max) {
      const t = fmt(new Date());
      min = t;
      max = addDays(t, 60);
    }
    return { start: addDays(min, -7), end: addDays(max, 7) };
  },

  /** Acontecimientos de ceremonias visibles en el timeline: solo ceremonias en las
   * que el usuario participa (o facilita), excluyendo el Daily. El PM solo ve las
   * de sus proyectos. `opts.projectIds` restringe el alcance por rol. */
  milestones({ user, projectIds = null } = {}) {
    if (!user) return [];
    const range = this.window();
    const scope = projectIds?.length ? new Set(projectIds) : null;
    const cems = CeremonyModel.all ? CeremonyModel.all() : [];
    const levelTone = { Equipo: 'info', ART: 'accent', Portafolio: 'warn' };
    const out = [];

    cems
      .filter((c) => {
        if ((c.participants || []).includes(user.role) || c.facilitator === user.role) {
          if (scope) {
            const cIds = c.projectIds || [];
            if (cIds.length && !cIds.some((id) => scope.has(id))) return false;
          }
          return c.recurrence?.freq !== 'daily';
        }
        return false;
      })
      .forEach((c) => {
        let cy = toDate(range.start).getUTCFullYear();
        let cm = toDate(range.start).getUTCMonth() + 1;
        const ey = toDate(range.end).getUTCFullYear();
        const em = toDate(range.end).getUTCMonth() + 1;
        while (cy < ey || (cy === ey && cm <= em)) {
          occurrencesInMonth(c.recurrence, cy, cm).forEach((date) => {
            if (date >= range.start && date <= range.end) {
              out.push({
                date,
                id: c.id,
                title: c.name,
                level: c.level,
                tone: levelTone[c.level] || 'accent',
                facilitator: c.facilitator,
                facilitatorLabel: ROLES[c.facilitator]?.label || c.facilitator,
              });
            }
          });
          cm += 1;
          if (cm > 12) { cm = 1; cy += 1; }
        }
      });

    return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  },

  /** Contexto compartido (catálogos en Maps). */
  _ctx() {
    const sprints = SprintModel.all ? SprintModel.all() : [];
    const projects = ProjectModel.all();
    const epics = EpicModel.all();
    return {
      sprintsById: new Map(sprints.map((s) => [s.id, s])),
      projectsById: new Map(projects.map((p) => [p.id, p])),
      epicsById: new Map(epics.map((e) => [e.id, e])),
    };
  },
};