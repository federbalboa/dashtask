import { CeremonyModel } from '../models/CeremonyModel.js';
import { SprintModel } from '../models/SprintModel.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { ROLES } from '../config/roles.js';
import { daysInMonth, fmt, occurrencesInMonth } from '../utils/dates.js';

/** CONTROLADOR: Calendario (ceremonias por recurrencia + sprints por proyecto) */
export const CalendarController = {
  month: (req, res) => {
    const now = new Date();
    const [y, m] = (req.query.month || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`)
      .split('-').map(Number);
    const year = y;
    const month = m; // 1-12
    const projectId = req.query.projectId || null;

    const total = daysInMonth(year, month);
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const events = {}; // 'YYYY-MM-DD' -> [event]
    const push = (date, event) => {
      if (!events[date]) events[date] = [];
      events[date].push(event);
    };

    // Ceremonias (recurrentes) filtradas por proyecto
    CeremonyModel.all().forEach((c) => {
      if (projectId && !(c.projectIds || []).includes(projectId)) return;
      occurrencesInMonth(c.recurrence, year, month).forEach((date) => {
        push(date, {
          type: 'ceremony',
          id: c.id,
          title: c.name,
          level: c.level,
          duration: c.duration,
          facilitator: c.facilitator,
          facilitatorLabel: ROLES[c.facilitator]?.label || c.facilitator,
          projectIds: c.projectIds || [],
        });
      });
    });

    // Sprints (inicio y cierre) filtrados por proyecto
    SprintModel.all().forEach((s) => {
      if (projectId && s.projectId !== projectId) return;
      const project = ProjectModel.findById(s.projectId);
      const inMonth = (d) => {
        const dt = new Date(`${d}T00:00:00Z`);
        return dt.getUTCFullYear() === year && dt.getUTCMonth() + 1 === month;
      };
      if (inMonth(s.startDate)) {
        push(s.startDate, {
          type: 'sprint-start', id: s.id, sprintId: s.id, title: `Inicio ${s.name}`, projectId: s.projectId,
          projectName: project?.name, cadence: s.cadence, goal: s.goal,
        });
      }
      if (inMonth(s.endDate)) {
        push(s.endDate, {
          type: 'sprint-end', id: s.id, sprintId: s.id, title: `Cierre ${s.name}`, projectId: s.projectId,
          projectName: project?.name, cadence: s.cadence, goal: s.goal,
        });
      }
    });

    // Próximos eventos (a partir de hoy, 60 días)
    const upcoming = [];
    for (let offset = 0; offset < 60; offset += 1) {
      const d = new Date(Date.now() + offset * 86400000);
      const key = fmt(d);
      (events[key] || []).forEach((e) => {
        if (upcoming.length < 12) upcoming.push({ ...e, date: key });
      });
    }

    return res.json({
      year, month, daysInMonth: total, firstWeekday,
      events, upcoming,
      projects: ProjectModel.all().map((p) => ({ id: p.id, name: p.name, code: p.code })),
    });
  },
};
