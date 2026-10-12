import db from './Database.js';
import { nextId } from '../utils/id.js';
import { addDays, fmt, nextWeekday, toDate } from '../utils/dates.js';
import { ProjectModel } from './ProjectModel.js';
import { TaskModel } from './TaskModel.js';

/** MODELO: Sprint (iteración de un proyecto, de miércoles a miércoles por defecto) */
const col = () => db.collection('sprints');

const DURATION = { weekly: 7, biweekly: 14 };
export const CADENCES = [
  { id: 'weekly', label: 'Semanal', days: 7 },
  { id: 'biweekly', label: 'Quincenal', days: 14 },
];

function configFor(project) {
  return {
    cadence: project?.sprintConfig?.cadence || 'biweekly',
    startDay: project?.sprintConfig?.startDay ?? 3, // miércoles
  };
}

/** Calcula el inicio del siguiente sprint (después del último del proyecto). */
export function nextSprintStart(project, sprints) {
  const { cadence, startDay } = configFor(project);
  const list = sprints.filter((s) => s.projectId === project?.id);
  const anchor = list.length
    ? list.reduce((max, s) => (s.endDate > max ? s.endDate : max), '1970-01-01')
    : fmt(new Date());
  const day = addDays(anchor, 1);
  const cadence2 = cadence;
  // arranca en el día configurado, en o después del día siguiente al último cierre
  const start = nextWeekday(day, startDay);
  return { startDate: start, endDate: addDays(start, DURATION[cadence2] || 14), cadence: cadence2 };
}

export const SprintModel = {
  all: () => col().all(),
  findById: (id) => col().findById(id),
  findByProject: (projectId) => col().find((s) => s.projectId === projectId),
  remove: (id) => {
    const ok = col().remove(id);
    if (ok) TaskModel.findBySprint(id).forEach((t) => TaskModel.update(t.id, { sprintId: null }));
    return ok;
  },
  update: (id, patch) => col().update(id, patch),

  create: (payload) => {
    const project = ProjectModel.findById(payload.projectId);
    if (!project) return null;
    const cfg = configFor(project);
    const cadence = payload.cadence || cfg.cadence;
    const duration = DURATION[cadence] || 14;
    const computed = nextSprintStart(project, col().all());

    const startDate = payload.startDate || computed.startDate;
    const endDate = payload.endDate || addDays(startDate, duration);
    const number = payload.number || col().find((s) => s.projectId === payload.projectId).length + 1;

    const doc = {
      id: nextId(col().all(), 'SPR'),
      projectId: payload.projectId,
      number,
      name: payload.name || `Sprint ${number}`,
      startDate,
      endDate,
      startDay: cfg.startDay,
      cadence,
      status: payload.status || 'planning',
      goal: payload.goal || '',
      createdAt: new Date().toISOString(),
    };
    return col().insert(doc);
  },

  assign: (sprintId, taskIds = []) => {
    const sprint = col().findById(sprintId);
    if (!sprint) return null;
    const moved = [];
    taskIds.forEach((tid) => {
      const t = TaskModel.findById(tid);
      if (t) moved.push(TaskModel.update(tid, { sprintId }));
    });
    return moved;
  },

  unassign: (taskId) => TaskModel.update(taskId, { sprintId: null }),

  /** Carryover: mueve las tareas no entregadas del sprint a otro destino (o las deja en backlog). */
  carryover: (fromSprintId, targetSprintId = null) => {
    const tasks = TaskModel.findBySprint(fromSprintId);
    const pending = tasks.filter((t) => t.status !== 'release');
    pending.forEach((t) => TaskModel.update(t.id, { sprintId: targetSprintId }));
    return { moved: pending.length, taskIds: pending.map((t) => t.id) };
  },

  /** Resumen con métricas del sprint. */
  summarize: (sprint) => {
    const tasks = TaskModel.findBySprint(sprint.id);
    const done = tasks.filter((t) => t.status === 'release').length;
    const points = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
    return {
      ...sprint,
      taskCount: tasks.length,
      doneCount: done,
      points,
      percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      daysLeft: Math.max(0, Math.round((toDate(sprint.endDate).getTime() - Date.now()) / (24 * 3600 * 1000))),
    };
  },
};
