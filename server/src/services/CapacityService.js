/**
 * SERVICE: Capacidad de los recursos por sprint.
 * Basado en "1 Story Point por día" (configurable por proyecto con
 * `sprintConfig.spPerDay`). La capacidad de un sprint = días × SP/día.
 * El SP asignado consume días del desarrollador en ese sprint.
 */
import { TaskModel } from '../models/TaskModel.js';
import { diffDays } from '../utils/dates.js';

export const SP_PER_DAY_DEFAULT = 1;

export function sprintDays(sprint) {
  if (!sprint || !sprint.startDate || !sprint.endDate) return 0;
  return Math.max(1, diffDays(sprint.startDate, sprint.endDate) + 1);
}

export function spPerDayFor(project) {
  return project?.sprintConfig?.spPerDay ?? SP_PER_DAY_DEFAULT;
}

export function sprintCapacity(sprint, project) {
  return sprintDays(sprint) * spPerDayFor(project);
}

export function assignedSp(tasks, opts = {}) {
  // opts: { sprintId?, userId? }
  return tasks
    .filter((t) => (opts.sprintId ? t.sprintId === opts.sprintId : true))
    .filter((t) => (opts.userId ? t.assigneeId === opts.userId : true))
    .reduce((s, t) => s + (t.storyPoints || 0), 0);
}

/** Disponibilidad de un usuario (o del sprint completo si userId es null) por sprint de un proyecto. */
export function availabilityForSprints(sprints, tasks, { userId = null, project = null } = {}) {
  const spd = spPerDayFor(project);
  return [...sprints]
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
    .map((s) => {
      const days = sprintDays(s);
      const capacity = days * spd;
      const assigned = assignedSp(tasks, { sprintId: s.id, userId });
      const free = capacity - assigned;
      return {
        sprint: { id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate, days },
        days,
        spPerDay: spd,
        capacity,
        assigned,
        free,
        over: free < 0,
        pct: capacity ? Math.round((assigned / capacity) * 100) : 0,
      };
    });
}

/** Totales agregados de una lista de disponibilidad (sumas por sprint). */
export function totalsFromAvailability(avail) {
  return avail.reduce(
    (acc, a) => ({
      days: acc.days + a.days,
      capacity: acc.capacity + a.capacity,
      assigned: acc.assigned + a.assigned,
      free: acc.free + a.free,
    }),
    { days: 0, capacity: 0, assigned: 0, free: 0 }
  );
}

/** Tareas de un usuario dentro de un sprint (para resaltar qué consume su capacidad). */
export function tasksForUserInSprint(tasks, userId, sprintId) {
  return tasks.filter((t) => t.assigneeId === userId && t.sprintId === sprintId);
}