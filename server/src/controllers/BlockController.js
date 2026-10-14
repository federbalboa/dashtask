import { BlockModel } from '../models/BlockModel.js';
import { TaskModel } from '../models/TaskModel.js';
import { BlockService } from '../services/BlockService.js';
import { canApproveBlocks } from '../services/PermissionService.js';

/** Roles que pueden ver el tablero de bloqueos (aunque no todos decidan). */
const VIEW_ROLES = ['lpm', 'product_manager', 'admin', 'rte', 'epic_owner', 'business_owner', 'product_owner', 'system_architect', 'scrum_master', 'team_lead', 'tech_lead', 'developer'];

/** CONTROLADOR: solicitudes de bloqueo de tareas y su autorización. */
export const BlockController = {
  list: (req, res) => {
    let blocks = BlockModel.all();
    if (req.query.status) blocks = blocks.filter((b) => b.status === req.query.status);
    if (req.query.taskId) blocks = blocks.filter((b) => String(b.taskId) === String(req.query.taskId));
    blocks = blocks.map(enrich).reverse();
    const pending = blocks.filter((b) => b.status === 'pending');
    return res.json({
      blocks,
      canDecide: canApproveBlocks(req.user),
      stats: {
        pending: pending.length,
        approved: blocks.filter((b) => b.status === 'approved').length,
        rejected: blocks.filter((b) => b.status === 'rejected').length,
      },
    });
  },

  /** Levanta una solicitud de bloqueo (o la autoriza si el usuario es aprobador). */
  create: (req, res) => {
    const { taskId, reason } = req.body || {};
    const task = TaskModel.findById(taskId);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });
    if (task.status === 'blocked') {
      return res.status(409).json({ error: 'La tarea ya está bloqueada.' });
    }
    try {
      const { block, applied, auto } = BlockService.request(req.user, task, reason);
      return res.status(201).json({ block: enrich(block), applied, auto, task: TaskModel.findById(task.id) });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  },

  /** Autoriza o rechaza una solicitud de bloqueo. */
  decide: (req, res) => {
    const block = BlockModel.findById(req.params.id);
    if (!block) return res.status(404).json({ error: 'Solicitud de bloqueo no encontrada.' });
    const task = TaskModel.findById(block.taskId);
    if (!canApproveBlocks(req.user, task)) {
      return res.status(403).json({
        error: 'Solo Portfolio Lead (LPM), Product Management, el Admin o alguien con el permiso de aprobar bloqueos puede autorizar.',
      });
    }
    const approve = req.body?.approve === true;
    try {
      const updated = BlockService.decide(block, { approve, note: req.body?.note }, req.user);
      return res.json({ block: enrich(updated), task: TaskModel.findById(block.taskId) });
    } catch (e) {
      return res.status(409).json({ error: e.message });
    }
  },

  viewRoles: VIEW_ROLES,
};

function enrich(b) {
  const task = TaskModel.findById(b.taskId);
  return { ...b, currentStatus: task?.status || '', taskExists: !!task };
}
