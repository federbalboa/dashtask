import { TaskModel, KANBAN_COLUMNS, nextStage, stageIndex, STAGE_IDS } from '../models/TaskModel.js';
import { UserModel } from '../models/UserModel.js';
import { SprintModel } from '../models/SprintModel.js';
import { ChangeModel } from '../models/ChangeModel.js';
import { RescheduleService } from '../services/RescheduleService.js';
import { taskContext } from '../services/HierarchyService.js';
import { stageMeta } from '../config/taskFlow.js';
import { canEditChecklistItem } from '../services/PermissionService.js';

/** CONTROLADOR: Tasks / Kanban */
export const TaskController = {
  list: (req, res) => {
    let tasks = TaskModel.all();
    if (req.query.status) tasks = tasks.filter((t) => t.status === req.query.status);
    if (req.query.assigneeId) tasks = tasks.filter((t) => t.assigneeId === req.query.assigneeId);
    if (req.query.team) tasks = tasks.filter((t) => t.team === req.query.team);
    if (req.query.level) tasks = tasks.filter((t) => t.level === req.query.level);
    if (req.query.projectId) tasks = tasks.filter((t) => t.projectId === req.query.projectId);
    if (req.query.sprintId) tasks = tasks.filter((t) => t.sprintId === req.query.sprintId);
    return res.json({ tasks });
  },

  get: (req, res) => {
    const ctx = taskContext(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'Tarea no encontrada.' });
    ctx.stage = stageMeta(ctx.task.status);
    ctx.nextStage = nextStage(ctx.task.status);
    ctx.stageCompletion = TaskModel.stageCompletion(ctx.task);
    // Qué puntos puede marcar/desmarcar este usuario (rol dueño, delegación o permiso global).
    ctx.checklist = ctx.task.checklist.map((i) => ({
      ...i,
      mine: canEditChecklistItem(req.user, ctx.task, i),
    }));
    // Historial de cambios de entrega (incidencias aplicadas y control de cambios).
    ctx.changes = ChangeModel.findByRef('task', ctx.task.id);
    return res.json(ctx);
  },

  board: (_req, res) => {
    const board = TaskModel.board();
    const totals = {
      items: TaskModel.all().length,
      points: TaskModel.all().reduce((s, t) => s + (t.storyPoints || 0), 0),
      blocked: TaskModel.findByStatus('blocked').length,
      wipExceeded: board.filter((c) => c.overWip).map((c) => c.id),
    };
    return res.json({ columns: KANBAN_COLUMNS, board, totals });
  },

  create: (req, res) => {
    const payload = req.body || {};
    if (!payload.title) return res.status(400).json({ error: 'El título es obligatorio.' });
    if (payload.assigneeId && !payload.assignee) {
      const u = UserModel.findById(payload.assigneeId);
      if (u) payload.assignee = u.name;
    }
    const created = TaskModel.create(payload);
    return res.status(201).json({ task: created });
  },

  update: (req, res) => {
    const payload = { ...req.body };
    if (payload.assigneeId && !payload.assignee) {
      const u = UserModel.findById(payload.assigneeId);
      if (u) payload.assignee = u.name;
    }
    const current = TaskModel.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Tarea no encontrada.' });
    if (payload.dueDate && payload.dueDate !== current.dueDate && !payload.reasonType) {
      // Cambio directo (p. ej. drag en el timeline): nunca queda silencioso.
      TaskModel.audit(current.id, {
        type: 'reschedule', action: 'patch', from: current.dueDate, to: payload.dueDate,
        actor: req.user.name, role: req.user.role,
        note: `Fecha de entrega ajustada de ${current.dueDate || '—'} a ${payload.dueDate} (cambio directo)`,
      });
    }
    const updated = TaskModel.update(current.id, payload);
    return res.json({ task: updated });
  },

  /**
   * Reprograma la fecha de entrega identificando el motivo:
   *  - Incidencia u omisión → se aplica de inmediato y queda registrada.
   *  - Control de cambios → genera una solicitud que autoriza el equipo de portafolio.
   */
  reschedule: (req, res) => {
    const task = TaskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });
    const { to, reasonType, reasonCode, note } = req.body || {};
    const err = RescheduleService.validateReschedule({
      current: task.dueDate, to, reasonType, reasonCode, note,
    });
    if (err) return res.status(400).json(err);

    try {
      if (reasonType === 'control_cambios') {
        RescheduleService.guardPending('task', task.id);
        const change = RescheduleService.requestControl('task', task.id, task.title, {
          from: task.dueDate, to, reasonCode, note,
        }, req.user);
        return res.status(201).json({ change, task: TaskModel.findById(task.id), pending: true });
      }
      const change = RescheduleService.applyIncidencia('task', task.id, task.title, {
        from: task.dueDate, to, reasonCode, note,
      }, req.user);
      return res.json({ change, task: TaskModel.findById(task.id), applied: true });
    } catch (e) {
      return res.status(409).json({ error: e.message });
    }
  },

  move: (req, res) => {
    const { status, blockedReason } = req.body || {};
    const valid = KANBAN_COLUMNS.map((c) => c.id);
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Estado no válido. Use: ${valid.join(', ')}` });
    }
    const current = TaskModel.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Tarea no encontrada.' });

    // Gate: para avanzar de etapa la etapa actual debe estar 100% completa.
    const from = current.status;
    const isForward =
      STAGE_IDS.includes(from) && STAGE_IDS.includes(status) && stageIndex(status) > stageIndex(from);
    if (isForward) {
      const comp = TaskModel.stageCompletion(current);
      if (!comp.complete) {
        return res.status(422).json({
          error: `Faltan ${comp.total - comp.done} punto(s) del checklist de "${stageMeta(from)?.label}".`,
          pending: comp.items.filter((i) => !i.done),
        });
      }
    }

    const column = KANBAN_COLUMNS.find((c) => c.id === status);
    if (column.wip != null && from !== status) {
      const count = TaskModel.findByStatus(status).length;
      if (count >= column.wip) {
        return res.status(409).json({ error: `WIP limit alcanzado en "${column.title}".` });
      }
    }

    let extra = { blockedReason: '' };
    if (status === 'blocked') {
      extra = {
        blockedReason: blockedReason || 'Sin motivo especificado',
        previousStatus: from === 'blocked' ? current.previousStatus || '' : from,
      };
    }
    TaskModel.move(req.params.id, status, extra);

    // BITÁCORA: registrar el cambio de etapa (incluye regresiones como QA -> WIP).
    const fromMeta = stageMeta(from);
    const toMeta = stageMeta(status);
    const wasBlocked = from === 'blocked';
    TaskModel.audit(req.params.id, {
      type: status === 'blocked' ? 'blocked' : wasBlocked ? 'stage' : isForward ? 'stage' : 'regression',
      stage: status === 'blocked' ? (current.previousStatus || from) : from,
      action:
        status === 'blocked' ? 'block'
          : wasBlocked ? 'unblock'
            : isForward ? 'advance'
              : 'backward',
      from,
      to: status,
      actor: req.user.name,
      role: req.user.role,
      note:
        status === 'blocked'
          ? `Bloqueada: ${extra.blockedReason}`
          : wasBlocked
            ? `Reactivada en "${toMeta?.label}"`
            : isForward
              ? `Avanzó de "${fromMeta?.label}" a "${toMeta?.label}"`
              : `Regresó de "${fromMeta?.label}" a "${toMeta?.label}" (devolución para corregir)`,
    });
    // Devolver la tarea ya con la entrada de bitácora incluida.
    const fresh = TaskModel.findById(req.params.id);
    return res.json({ task: fresh, stage: stageMeta(fresh.status) });
  },

  /** Avanza la tarea a la siguiente etapa si la etapa actual está completa. */
  advance: (req, res) => {
    const task = TaskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });
    const next = nextStage(task.status);
    if (!next) return res.status(400).json({ error: 'La tarea ya está en la última etapa (Release).' });
    const comp = TaskModel.stageCompletion(task);
    if (!comp.complete) {
      return res.status(422).json({
        error: `Completa el checklist de "${stageMeta(task.status)?.label}" antes de avanzar.`,
        pending: comp.items.filter((i) => !i.done),
      });
    }
    const moved = TaskModel.move(task.id, next.id, { blockedReason: '', previousStatus: '' });
    TaskModel.audit(task.id, {
      type: 'stage',
      stage: task.status,
      action: 'advance',
      from: task.status,
      to: next.id,
      actor: req.user.name,
      role: req.user.role,
      note: `Avanzó a "${next.label}"`,
    });
    return res.json({ task: TaskModel.findById(task.id), stage: stageMeta(moved.status), advancedTo: next });
  },

  /**
   * Marca/desmarca un ítem del checklist y guarda la bitácora.
   * Permisos: el rol dueño del ítem, un rol con delegación técnica (team/tech lead
   * para desarrollo), un permiso global otorgado por el admin o el propio admin.
   */
  checklist: (req, res) => {
    const task = TaskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });
    const item = (task.checklist || []).find((i) => i.key === req.params.key);
    if (!item) return res.status(404).json({ error: 'Ítem de checklist no encontrado.' });

    if (!canEditChecklistItem(req.user, task, item)) {
      return res.status(403).json({
        error: `Tu rol (${req.user.role}) no puede actualizar este punto del checklist. Le corresponde a ${item.role} o a alguien con permiso global.`,
        scope: item.role,
      });
    }

    const { done, note, attachment } = req.body || {};
    const updated = TaskModel.setChecklistItem(task.id, item.key, {
      done,
      note,
      attachment,
      byRole: req.user.role,
      byName: req.user.name,
    });
    return res.json({ task: updated, stage: stageMeta(updated.status), stageCompletion: TaskModel.stageCompletion(updated) });
  },

  /** Asigna o quita la tarea de un sprint (desde el backlog o por drag en el timeline). */
  assignSprint: (req, res) => {
    const { sprintId } = req.body || {};
    const current = TaskModel.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const patch = { sprintId: sprintId || null };
    if (sprintId) {
      const sprint = SprintModel.findById(sprintId);
      if (!sprint) return res.status(400).json({ error: 'Sprint no encontrado.' });
      if (!current.projectId) {
        // Drag desde backlog: adopta el proyecto del sprint.
        patch.projectId = sprint.projectId;
      } else if (current.projectId !== sprint.projectId) {
        // Drag a un sprint de otro proyecto: cambia de proyecto; la épica no se arrastra.
        patch.projectId = sprint.projectId;
        patch.epicId = null;
      }
    }
    const updated = TaskModel.update(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'Tarea no encontrada.' });
    if (sprintId) {
      const sprint = SprintModel.findById(sprintId);
      TaskModel.audit(req.params.id, {
        type: 'sprint',
        action: 'assign',
        actor: req.user.name,
        role: req.user.role,
        to: sprintId,
        note: `Programada en ${sprint?.name || ''} (${sprint?.startDate || ''} → ${sprint?.endDate || ''})`,
      });
    } else {
      TaskModel.audit(req.params.id, {
        type: 'sprint',
        action: 'unassign',
        actor: req.user.name,
        role: req.user.role,
        to: '',
        note: 'Devuelta al backlog (sin sprint)',
      });
    }
    return res.json({ task: TaskModel.findById(req.params.id), sprintId: sprintId || null });
  },

  remove: (req, res) => {
    const ok = TaskModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Tarea no encontrada.' });
    return res.status(204).end();
  },
};
