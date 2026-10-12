import { UserModel } from '../models/UserModel.js';
import { IntakeModel, completeness } from '../models/IntakeModel.js';
import { TaskModel } from '../models/TaskModel.js';
import { CeremonyModel } from '../models/CeremonyModel.js';
import { ProgramIncrementModel } from '../models/ProgramIncrementModel.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { getRole, ROLES } from '../config/roles.js';
import { canEditChecklistItem } from '../services/PermissionService.js';

const withComplete = (i) => ({ ...i, completeness: completeness(i.checklist) });

/**
 * CONTROLADOR: Dashboard por rol.
 * Devuelve un payload adaptado a las responsabilidades del usuario.
 */
export const DashboardController = {
  forRole(req, res) {
    const roleId = req.params.role;
    const role = getRole(roleId);
    if (!role) return res.status(404).json({ error: 'Rol no encontrado.' });

    const intakes = IntakeModel.all().map(withComplete);
    const tasks = TaskModel.all();
    const ceremonies = CeremonyModel.all();
    const pi = ProgramIncrementModel.current();
    const user = req.userId ? UserModel.findById(req.userId) : null;
    const base = {
      role,
      generatedAt: new Date().toISOString(),
      programIncrement: pi,
      roleCeremonies: ceremonies
        .filter((c) => (c.participants || []).includes(roleId) || c.facilitator === roleId)
        .sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate))),
      // "Me toca intervenir": puntos del checklist que este usuario puede cerrar
      // ahora mismo (el responsable anterior ya completó su parte).
      myTurn: user ? myTurnFor(user, tasks) : [],
    };

    return res.json({
      ...base,
      ...buildForRole(roleId, { intakes, tasks, ceremonies, pi }, req.userId),
      ...(user && hasMetrics(roleId) ? withMetrics(tasks, user) : {}),
    });
  },
};

function kpi(label, value, hint = '', tone = 'neutral') {
  return { label, value, hint, tone };
}

function buildForRole(roleId, ctx, userId) {
  const { intakes, tasks, pi } = ctx;
  const byStatus = (arr, s) => arr.filter((x) => x.status === s);
  const users = UserModel.all();

  switch (roleId) {
    case 'intake_manager':
      return {
        headline: 'Cola de revisión primaria e intakes entrantes',
        kpis: [
          kpi('Intakes totales', intakes.length, 'en el periodo'),
          kpi('Pendientes de triage', byStatus(intakes, 'new').length, 'requieren revisión', 'warn'),
          kpi('Devueltos', byStatus(intakes, 'returned').length, 'información incompleta', 'warn'),
          kpi('Expedite', intakes.filter((i) => i.class === 'Expedite').length, 'prioridad máxima', 'danger'),
        ],
        queue: intakes
          .slice()
          .sort((a, b) => statusRank(a.status) - statusRank(b.status)),
        slaLimitDays: 2,
      };

    case 'lpm': {
      const portfolio = intakes.filter((i) => i.type === 'Feature' || i.type === 'Enabler');
      const prioritized = intakes.filter((i) => i.wsjf != null).sort((a, b) => b.wsjf - a.wsjf);
      return {
        headline: 'Flujo de valor y priorización del portafolio',
        kpis: [
          kpi('Intakes estratégicos', portfolio.length, 'features + enablers'),
          kpi('WSJF promedio', avg(prioritized.map((i) => i.wsjf)), 'Cost of Delay / Size'),
          kpi('Programados en PI', byStatus(intakes, 'scheduled').length, pi?.name || '—'),
          kpi('Épicas activas', tasks.filter((t) => t.type === 'Epic').length, 'en el portafolio'),
        ],
        wsjfQueue: prioritized.slice(0, 8),
        piObjectives: pi?.objectives || [],
        valueStreams: groupCount(intakes, 'valueStream'),
      };
    }

    case 'epic_owner': {
      const epics = intakes.filter((i) => i.type === 'Feature' && (i.class === 'Fixed Date' || i.tshirt === 'XL' || i.tshirt === 'L'));
      return {
        headline: 'Ciclo de vida de épicas del portafolio',
        kpis: [
          kpi('Épicas en análisis', epics.length, 'Lean Business Case'),
          kpi('Con dependencias', intakes.filter((i) => (i.dependencies || []).length).length, 'a coordinar', 'warn'),
          kpi('Programadas', byStatus(intakes, 'scheduled').length, 'en ejecución'),
          kpi('Sin valor cuantificado', intakes.filter((i) => !i.businessValue).length, 'a completar', 'warn'),
        ],
        epics,
        dependencies: collectDependencies(intakes),
      };
    }

    case 'rte': {
      const blocked = tasks.filter((t) => t.status === 'blocked');
      const board = TaskModel.board();
      return {
        headline: 'Salud del ART, impedimentos y riesgos del PI',
        kpis: [
          kpi('PI actual', pi?.name || '—', pi?.status || ''),
          kpi('Tickets bloqueados', blocked.length, 'impedimentos activos', blocked.length ? 'danger' : 'ok'),
          kpi('WIP excedido', board.filter((c) => c.overWip).length, 'columnas sobre el límite', 'warn'),
          kpi('Voto de confianza', pi?.confidenceVote?.avg ?? '—', 'promedio del ART'),
        ],
        risks: pi?.risks || [],
        blocked,
        board: board.map((c) => ({ id: c.id, title: c.title, count: c.count, wip: c.wip, overWip: c.overWip })),
        dependencies: collectDependencies(intakes),
      };
    }

    case 'product_manager': {
      const features = tasks.filter((t) => t.type === 'Feature' || t.type === 'Story');
      const backlog = intakes.filter((i) => ['prioritized', 'scheduled'].includes(i.status));
      return {
        headline: 'Program Backlog, Features y roadmap',
        kpis: [
          kpi('Features activas', features.length, 'en el ART'),
          kpi('Program Backlog', backlog.length, 'priorizadas/scheduled'),
          kpi('En backlog', byStatus(tasks, 'backlog').length, 'por programar'),
          kpi('En QA / UAT', byStatus(tasks, 'qa').length + byStatus(tasks, 'uat').length, 'por validar'),
        ],
        wsjfQueue: intakes.filter((i) => i.wsjf != null).sort((a, b) => b.wsjf - a.wsjf).slice(0, 10),
        features,
        roadmap: pi?.iterations || [],
      };
    }

    case 'system_architect': {
      const enablers = tasks.filter((t) => t.type === 'Enabler');
      return {
        headline: 'Architecture Runway y Enablers técnicos',
        kpis: [
          kpi('Enablers', enablers.length, 'técnicos activos'),
          kpi('Enablers bloqueados', enablers.filter((t) => t.status === 'blocked').length, 'riesgo técnico', 'warn'),
          kpi('Dependencias', collectDependencies(intakes).length, 'entre equipos', 'warn'),
          kpi('Runway', enablers.filter((t) => (t.labels || []).includes('#arquitectura')).length, 'de arquitectura'),
        ],
        enablers,
        dependencies: collectDependencies(intakes),
      };
    }

    case 'business_owner': {
      const committed = (pi?.objectives || []).filter((o) => o.committed).length;
      const total = (pi?.objectives || []).length;
      return {
        headline: 'Valor de negocio y PI Objectives',
        kpis: [
          kpi('PI Objectives', total, `${committed} comprometidos`),
          kpi('BV planificado', (pi?.objectives || []).reduce((s, o) => s + (o.businessValue || 0), 0), 'business value total'),
          kpi('Aceptadas', byStatus(tasks, 'release').length, 'valor entregado'),
          kpi('Riesgos del PI', (pi?.risks || []).length, 'a monitorear', 'warn'),
        ],
        objectives: pi?.objectives || [],
        risks: pi?.risks || [],
        acceptance: tasks.filter((t) => ['qa', 'uat', 'release'].includes(t.status)),
      };
    }

    case 'scrum_master': {
      const board = TaskModel.board();
      const blocked = tasks.filter((t) => t.status === 'blocked');
      const team = users.filter((u) => ['scrum_master', 'product_owner', 'developer'].includes(u.role));
      return {
        headline: 'Flujo del equipo, ceremonias e impedimentos',
        kpis: [
          kpi('WIP total', board.reduce((s, c) => s + c.count, 0), 'tarjetas en el tablero'),
          kpi('Bloqueados', blocked.length, 'a desbloquear', blocked.length ? 'danger' : 'ok'),
          kpi('En progreso', byStatus(tasks, 'in_progress').length, `límite ${3}`),
          kpi('Completadas', byStatus(tasks, 'release').length, 'aceptadas'),
        ],
        board: board.map((c) => ({ id: c.id, title: c.title, count: c.count, wip: c.wip, overWip: c.overWip })),
        blocked,
        team,
      };
    }

    case 'product_owner': {
      const teamBacklog = tasks.filter((t) => ['backlog'].includes(t.status));
      return {
        headline: 'Team Backlog, refinamiento e Iteration Goals',
        kpis: [
          kpi('Team Backlog', teamBacklog.length, 'priorizados'),
          kpi('Por programar', byStatus(tasks, 'backlog').length, 'a planear'),
          kpi('En QA', byStatus(tasks, 'qa').length, 'por validar'),
          kpi('En UAT', byStatus(tasks, 'uat').length, 'validación de negocio'),
        ],
        teamBacklog,
        pi: pi?.name || '—',
      };
    }

    case 'developer': {
      const me = userId ? UserModel.findById(userId) : null;
      const myTasks = me ? tasks.filter((t) => t.assigneeId === me.id) : [];
      return {
        headline: 'Mis tareas, Daily Stand-up e impedimentos',
        kpis: [
          kpi('Mis tareas', myTasks.length, 'asignadas'),
          kpi('En progreso', myTasks.filter((t) => t.status === 'in_progress').length, 'trabajando'),
          kpi('En QA / UAT', myTasks.filter((t) => ['qa', 'uat'].includes(t.status)).length, 'por validar'),
          kpi('Bloqueadas', myTasks.filter((t) => t.status === 'blocked').length, 'impedimentos', myTasks.some((t) => t.status === 'blocked') ? 'danger' : 'ok'),
        ],
        myTasks,
        board: TaskModel.board().map((c) => ({ id: c.id, title: c.title, count: c.count, wip: c.wip, overWip: c.overWip })),
      };
    }

    case 'team_lead':
    case 'tech_lead': {
      // Líder de desarrollo: responde por el checklist del área Dev del equipo.
      const me = userId ? UserModel.findById(userId) : null;
      const devItems = tasks
        .filter((t) => t.status !== 'blocked')
        .flatMap((t) =>
          (t.checklist || [])
            .filter((i) => i.stage === t.status && i.role === 'developer')
            .map((i) => ({ task: t, item: i }))
        );
      const devPending = devItems
        .filter(({ task, item }) => {
          const items = (task.checklist || []).filter((x) => x.stage === task.status);
          const idx = items.indexOf(item);
          return idx >= 0 && items.slice(0, idx).every((x) => x.done);
        })
        .map(({ task, item }) => ({
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          stage: task.status,
          key: item.key,
          label: item.label,
          role: 'developer',
          note: item.note || '',
        }));
      return {
        headline: 'Línea de desarrollo: checkpoint de checklist e impedimentos',
        kpis: [
          kpi('Puntos Dev pendientes', devPending.length, 'del área de desarrollo'),
          kpi('En QA / UAT', tasks.filter((t) => ['qa', 'uat'].includes(t.status)).length, 'por validar'),
          kpi('Bloqueadas', tasks.filter((t) => t.status === 'blocked').length, 'impedimentos', 'warn'),
          kpi('Liberadas', tasks.filter((t) => t.status === 'release').length, 'valor entregado', 'ok'),
        ],
        devPending,
        board: TaskModel.board().map((c) => ({ id: c.id, title: c.title, count: c.count, wip: c.wip, overWip: c.overWip })),
        team: users.filter((u) => ['developer', 'team_lead', 'tech_lead', 'scrum_master', 'product_owner'].includes(u.role)),
      };
    }

    case 'admin': {
      if (!userId) return {};
      return {
        headline: 'Administración del sistema y supervisión del checklist',
        kpis: [
          kpi('Usuarios', users.length, 'en el catálogo'),
          kpi('Proyectos', ProjectModel.all().length, 'del portafolio'),
          kpi('Tareas', tasks.length, 'en el tablero'),
          kpi('Intakes', intakes.length, 'entrantes'),
        ],
        board: TaskModel.board().map((c) => ({ id: c.id, title: c.title, count: c.count, wip: c.wip, overWip: c.overWip })),
        intakes,
      };
    }

    default:
      return { headline: 'Resumen general', kpis: [], };
  }
}

function req0User() { return null; } // reservado

/** "Me toca intervenir" (por usuario): ítems del checklist de la etapa actual
 * que el usuario puede cerrar y cuyo punto anterior ya fue completado. */
function myTurnFor(user, tasks) {
  const out = [];
  tasks.forEach((t) => {
    if (t.status === 'blocked') return;
    const items = (t.checklist || []).filter((i) => i.stage === t.status);
    let prevDone = true;
    items.forEach((i) => {
      if (i.done) return;
      if (prevDone && canEditChecklistItem(user, t, i)) {
        out.push({
          taskId: t.id,
          taskTitle: t.title,
          taskStatus: t.status,
          sprintId: t.sprintId || '',
          stage: t.stage || t.status,
          key: i.key,
          label: i.label,
          role: i.role,
          done: i.done,
          note: i.note || '',
        });
      }
      prevDone = false;
    });
  });
  return out.sort((a, b) => a.taskId.localeCompare(b.taskId) || a.key.localeCompare(b.key));
}

function hasMetrics(roleId) {
  return ['product_manager', 'rte', 'lpm'].includes(roleId);
}

/** Métricas de tiempos de respuesta por persona, calculadas desde la bitácora. */
function withMetrics(tasks, user) {
  const perPerson = new Map();
  const recent = [];

  tasks.forEach((t) => {
    const log = t.auditLog || [];
    const stageStart = (stage) => {
      const items = (t.checklist || []).filter((i) => i.stage === stage && i.done && i.doneAt);
      if (items.length) return +new Date(items[0].doneAt);
      return +new Date(t.createdAt);
    };
    log.slice().reverse().forEach((e) => {
      if (e.type === 'checklist' && e.action === 'done') {
        const actor = e.actor || '—';
        const rec = perPerson.get(actor) || { name: actor, completions: 0, waitsMs: [] };
        rec.completions += 1;
        const wait = Math.max(0, +new Date(e.at) - stageStart(e.stage));
        rec.waitsMs.push(wait);
        perPerson.set(actor, rec);
      }
    });

    log.slice(-8).forEach((e) => {
      recent.push({
        taskId: t.id,
        taskTitle: t.title,
        at: e.at,
        type: e.type,
        action: e.action,
        actor: e.actor,
        stage: e.stage,
        note: e.note,
      });
    });
  });

  const metrics = [...perPerson.values()]
    .map((r) => {
      const avgMs = r.waitsMs.reduce((a, b) => a + b, 0) / r.waitsMs.length;
      return {
        name: r.name,
        completions: r.completions,
        avgWaitHours: Math.round((avgMs / 3600000) * 10) / 10,
        avgWaitDays: Math.round((avgMs / 86400000) * 100) / 100,
      };
    })
    .filter((r) => r.completions > 0)
    .sort((a, b) => b.avgWaitHours - a.avgWaitHours);

  return {
    responseMetrics: metrics,
    recentActions: recent
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 25),
  };
}

function collectDependencies(intakes) {
  const out = [];
  intakes.forEach((i) => {
    (i.dependencies || []).forEach((d) => out.push({ from: i.id, title: i.title, dependsOn: d, status: i.status }));
  });
  return out;
}

function groupCount(arr, key) {
  const map = {};
  arr.forEach((x) => {
    const k = x[key] || 'Sin asignar';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).map(([label, count]) => ({ label, count }));
}

function avg(nums) {
  const valid = nums.filter((n) => typeof n === 'number');
  if (!valid.length) return '—';
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}

function statusRank(status) {
  return { new: 0, returned: 1, triaged: 2, prioritized: 3, scheduled: 4, rejected: 5 }[status] ?? 9;
}
