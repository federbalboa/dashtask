import { TaskModel, KANBAN_COLUMNS, nextStage, stageIndex, STAGE_IDS } from '../models/TaskModel.js';
import { UserModel } from '../models/UserModel.js';
import { SprintModel } from '../models/SprintModel.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { SettingsModel } from '../models/SettingsModel.js';
import { ChangeModel } from '../models/ChangeModel.js';
import { BlockModel } from '../models/BlockModel.js';
import { RescheduleService } from '../services/RescheduleService.js';
import { BlockService } from '../services/BlockService.js';
import { taskContext } from '../services/HierarchyService.js';
import { stageMeta } from '../config/taskFlow.js';
import { ROLES } from '../config/roles.js';
import { canEditChecklistItem, canApproveBlocks } from '../services/PermissionService.js';

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
    // Solicitudes de bloqueo (pendientes y resueltas) y si este usuario puede decidirlas.
    ctx.blocks = BlockModel.findByTask(ctx.task.id).slice().reverse();
    ctx.canApproveBlocks = canApproveBlocks(req.user, ctx.task);
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

  /**
   * Lista priorizada para Product Management: tareas agrupadas por proyecto
   * ("tipo"/frente de trabajo) y ordenadas por el orden manual guardado o, en su
   * defecto, por WSJF descendente (mayor WSJF = antes). Incluye las tareas sin
   * proyecto en un grupo aparte.
   */
  prioritized: (_req, res) => {
    const tasks = TaskModel.all();
    const byWsjf = (a, b) =>
      (Number(b.wsjf) || 0) - (Number(a.wsjf) || 0)
      || (Number(b.priority === 'Crítica') - Number(a.priority === 'Crítica'))
      || (Number(a.storyPoints) || 0) - (Number(b.storyPoints) || 0);

    const groups = ProjectModel.all()
      .map((p) => {
        const items = tasks.filter((t) => t.projectId === p.id);
        return {
          project: {
            id: p.id, code: p.code, name: p.name, status: p.status,
            valueStream: p.valueStream, productManager: p.productManager,
          },
          tasks: SettingsModel.sortByOrder(items, `project:${p.id}`, (a, b) => (b.wsjf || 0) - (a.wsjf || 0) || (a.storyPoints || 0) - (b.storyPoints || 0)),
          totals: {
            tasks: items.length,
            points: items.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0),
            avgWsjf: items.filter((t) => t.wsjf != null).length
              ? +(items.filter((t) => t.wsjf != null).reduce((s, t) => s + t.wsjf, 0) / items.filter((t) => t.wsjf != null).length).toFixed(1)
              : null,
          },
        };
      })
      .filter((g) => g.tasks.length);

    const orphanTasks = SettingsModel.sortByOrder(
      TaskModel.all().filter((t) => !t.projectId),
      'project:__none__',
      (a, b) => (b.wsjf || 0) - (a.wsjf || 0) || (a.storyPoints || 0) - (b.storyPoints || 0),
    );

    return res.json({ groups, orphans: orphanTasks, order: SettingsModel.get().taskOrder });
  },

  /** Guarda el orden manual de un listado (por scope) tras un drag & drop. */
  reorder: (req, res) => {
    const { scope, orderedIds } = req.body || {};
    if (!scope || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'Faltan "scope" y "orderedIds" (arreglo de IDs).' });
    }
    const order = SettingsModel.setOrder(scope, orderedIds);
    return res.json({ scope, order: order[scope] || [] });
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
   * Edición detallada de la tarea: título, descripción, criterios de aceptación y
   * checklist (permite agregar/quitar puntos y "más iteraciones" por etapa).
   * Cada cambio relevante se registra en la bitácora (qué, quién y cuándo).
   */
  editDetails: (req, res) => {
    const task = TaskModel.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const body = req.body || {};
    const patch = {};
    const entries = [];

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return res.status(400).json({ error: 'El título no puede quedar vacío.' });
      if (title !== task.title) {
        patch.title = title;
        entries.push({
          type: 'edit', action: 'field', key: 'title', from: task.title, to: title,
          note: `Título: “${task.title}” → “${title}”`,
        });
      }
    }

    if (body.description !== undefined) {
      const description = String(body.description || '');
      if (description !== (task.description || '')) {
        patch.description = description;
        entries.push({ type: 'edit', action: 'field', key: 'description', note: 'Descripción de la tarea modificada' });
      }
    }

    if (body.ac !== undefined) {
      const ac = sanitizeList(body.ac);
      const before = task.ac || [];
      if (JSON.stringify(ac) !== JSON.stringify(before)) {
        patch.ac = ac;
        entries.push({ type: 'edit', action: 'ac', note: `Criterios de aceptación: ${before.length} → ${ac.length} criterio(s)` });
      }
    }

    if (body.checklist !== undefined) {
      const parsed = sanitizeChecklist(body.checklist, task.checklist || []);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      if (JSON.stringify(parsed.items) !== JSON.stringify(task.checklist || [])) {
        patch.checklist = parsed.items;
        entries.push({
          type: 'edit', action: 'checklist',
          note: `Checklist: +${parsed.added} / -${parsed.removed} punto(s) (total ${parsed.items.length})`,
        });
      }
    }

    if (!entries.length) {
      return res.json({ task, changed: false });
    }

    TaskModel.update(task.id, patch);
    entries.forEach((e) => TaskModel.audit(task.id, { ...e, actor: req.user.name, role: req.user.role }));
    return res.json({ task: TaskModel.findById(task.id), changed: true, entries: entries.length });
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

    // Bloquear requiere autorización: LPM, Product Management, Admin o permiso
    // global "aprobar bloqueos". Quien no lo tenga levanta una solicitud pendiente.
    if (status === 'blocked' && current.status !== 'blocked' && !canApproveBlocks(req.user, current)) {
      try {
        const { block, applied } = BlockService.request(req.user, current, blockedReason);
        return res.status(202).json({
          pending: !applied,
          block,
          task: TaskModel.findById(current.id),
          message: 'Solicitud de bloqueo enviada. LPM, Product Management o el Admin deben autorizarla.',
        });
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
    }

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
    if (from !== status) {
      const wip = TaskModel.wipFor(status);
      if (wip != null) {
        const count = TaskModel.findByStatus(status).length;
        if (count >= wip) {
          return res.status(409).json({
            error: `La columna "${column.title}" ya tiene ${count} tarea(s) y su límite WIP es ${wip}. `
              + 'No es un error tuyo: es el tope del "trabajo en curso" (WIP) que protege el flujo. '
              + 'Termina, mueve o libera alguna de las tareas que ya están en esa columna para poder agregar otra.',
            wip: { column: status, title: column.title, count, limit: wip },
          });
        }
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

/* ---------------- Utilidades de edición de la tarea ---------------- */

function sanitizeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x || '').trim()).filter(Boolean);
}

let customSeq = 0;

/**
 * Normaliza y valida el checklist editable. Conserva el estado (done/nota) de los
 * puntos existentes y permite agregar puntos nuevos (las "iteraciones" por etapa).
 */
function sanitizeChecklist(value, current) {
  if (!Array.isArray(value)) return { error: 'Checklist inválido.' };
  const byKey = new Map((current || []).map((i) => [i.key, i]));
  const seen = new Set();
  const items = [];
  for (const raw of value) {
    const stage = String(raw?.stage || '').trim();
    const label = String(raw?.label || '').trim();
    const role = String(raw?.role || '').trim();
    if (!STAGE_IDS.includes(stage)) return { error: `Etapa de checklist no válida: ${stage}` };
    if (!label) return { error: 'Cada punto del checklist necesita un texto.' };
    if (!ROLES[role]) return { error: `Rol no válido para el punto del checklist: ${role}` };
    const key = String(raw?.key || '').trim();
    if (key && byKey.has(key)) {
      const prev = byKey.get(key);
      items.push({ ...prev, stage, label, role });
      seen.add(key);
    } else {
      customSeq += 1;
      const nk = `custom-${stage}-${Date.now().toString(36)}-${customSeq}`;
      items.push({ key: nk, stage, label, role, done: false, doneBy: '', doneAt: '', note: '', attachment: '' });
      seen.add(nk);
    }
  }
  const before = current || [];
  const added = items.filter((i) => !byKey.has(i.key)).length;
  const removed = before.filter((i) => !seen.has(i.key)).length;
  return { items, added, removed };
}
