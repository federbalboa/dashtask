/**
 * SERVICE: Capacidad de los recursos por sprint.
 * Basado en "1 Story Point por día hábil" (configurable por proyecto con
 * `sprintConfig.spPerDay`). La capacidad de UNA persona en un sprint =
 * días hábiles (Lun–Vie) × SP/día. La capacidad del sprint = personas × esa cifra.
 * El SP asignado consume días del desarrollador en ese sprint.
 */
import { TaskModel } from '../models/TaskModel.js';

export const SP_PER_DAY_DEFAULT = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Días hábiles (lunes a viernes) entre dos fechas ISO.
 * Se cuenta el día de inicio y NO el de cierre: así un sprint "de miércoles a
 * miércoles" a 2 semanas (14 días) rinde 10 días hábiles.
 */
export function businessDays(start, end) {
  if (!start || !end) return 0;
  let cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  let n = 0;
  while (cur < last) {
    const wd = cur.getUTCDay();
    if (wd >= 1 && wd <= 5) n += 1;
    cur = new Date(cur.getTime() + DAY_MS);
  }
  return n;
}

export function sprintDays(sprint) {
  if (!sprint || !sprint.startDate || !sprint.endDate) return 0;
  return businessDays(sprint.startDate, sprint.endDate);
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