import { BlockModel } from '../models/BlockModel.js';
import { TaskModel } from '../models/TaskModel.js';
import { canApproveBlocks } from './PermissionService.js';

/**
 * SERVICE: flujo de bloqueo de tareas con autorización.
 *  1) Cualquier persona puede *solicitar* el bloqueo (queda pendiente).
 *  2) Solo LPM, Product Management, el Admin o quien tenga el permiso global
 *     "aprobar bloqueos" puede autorizarlo. Recién al aprobar la tarea pasa a
 *     la columna "Bloqueado"; si se rechaza, la tarea continúa como estaba.
 * Todo movimiento queda registrado en la bitácora de la tarea.
 */
export const BlockService = {
  canApprove: (user, task) => canApproveBlocks(user, task),

  /**
   * Levanta una solicitud de bloqueo. Si el solicitante ya es aprobador,
   * la autoriza en el acto (todo queda igualmente trazado).
   */
  request(user, task, reason) {
    const clean = String(reason || '').trim();
    if (!clean) throw new Error('Indica el motivo del bloqueo.');

    TaskModel.audit(task.id, {
      type: 'block',
      action: 'requested',
      stage: task.status,
      actor: user.name,
      role: user.role,
      from: task.status,
      note: `Solicitó bloquear la tarea: ${clean}`,
    });

    const block = BlockModel.create({
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      sprintId: task.sprintId,
      reason: clean,
      requestedStage: task.status,
      requester: user.name,
      requesterRole: user.role,
      status: 'pending',
    });

    if (canApproveBlocks(user, task)) {
      return { block: BlockService.decide(block, { approve: true }, user), applied: true, auto: true };
    }
    return { block, applied: false, auto: false };
  },

  /** Autoriza o rechaza una solicitud de bloqueo pendiente. */
  decide(block, { approve, note }, user) {
    const actor = user || {};
    if (block.status !== 'pending') {
      throw new Error(`La solicitud ya fue resuelta (${block.status}).`);
    }
    const task = TaskModel.findById(block.taskId);
    const decided = {
      decidedBy: actor?.name || '',
      decidedRole: actor?.role || '',
      decidedAt: new Date().toISOString(),
      decisionNote: String(note || ''),
    };

    if (approve) {
      if (task && task.status !== 'blocked') {
        TaskModel.move(task.id, 'blocked', {
          blockedReason: block.reason,
          previousStatus: task.status,
        });
      }
      if (task) {
        TaskModel.audit(task.id, {
          type: 'block',
          action: 'approved',
          actor: decided.decidedBy,
          role: decided.decidedRole,
          from: task.status,
          to: 'blocked',
          note: `Bloqueo autorizado: ${block.reason}${decided.decisionNote ? ` · ${decided.decisionNote}` : ''}`,
        });
      }
      return BlockModel.update(block.id, {
        ...decided,
        status: 'approved',
        applied: true,
        appliedBy: decided.decidedBy,
        appliedAt: new Date().toISOString(),
      });
    }

    if (task) {
      TaskModel.audit(task.id, {
        type: 'block',
        action: 'rejected',
        actor: decided.decidedBy,
        role: decided.decidedRole,
        from: task.status,
        note: `Bloqueo rechazado; la tarea continúa: ${block.reason}${decided.decisionNote ? ` · ${decided.decisionNote}` : ''}`,
      });
    }
    return BlockModel.update(block.id, { ...decided, status: 'rejected', applied: false });
  },
};
