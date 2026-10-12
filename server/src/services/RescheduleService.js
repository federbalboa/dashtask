import { ChangeModel } from '../models/ChangeModel.js';
import { TaskModel } from '../models/TaskModel.js';
import { IntakeModel } from '../models/IntakeModel.js';
import { now } from '../utils/id.js';
import { validateReschedule, reasonCodeMeta } from '../config/reschedule.js';

/** SERVICIO: Reprogramación de fecha de entrega con motivo trazable. */
export const RescheduleService = {
  validateReschedule,

  /** Impide dos solicitudes de control de cambios pendientes sobre el mismo elemento. */
  guardPending(scope, refId) {
    const existing = ChangeModel.findByRef(scope, refId).some((c) => c.status === 'pending');
    if (existing) {
      throw new Error('Ya existe una solicitud de control de cambios pendiente para este elemento.');
    }
  },

  /** Aplica de inmediato (incidencia u omisión) dejando constancia en bitácoras. */
  applyIncidencia(scope, refId, refTitle, { from, to, reasonCode, note }, actor) {
    const label = reasonCodeMeta('incidencia', reasonCode).label;
    const fullNote = `Entrega movida a ${to} · ${label}${note ? ` · ${note}` : ''}`;
    if (scope === 'task') {
      const task = TaskModel.findById(refId);
      if (!task) throw new Error('Tarea no encontrada.');
      TaskModel.update(task.id, { dueDate: to });
      TaskModel.audit(task.id, {
        type: 'reschedule', action: 'apply', from, to,
        actor: actor.name, role: actor.role, note: fullNote,
      });
    } else {
      const intake = IntakeModel.findById(refId);
      if (!intake) throw new Error('Intake no encontrado.');
      IntakeModel.update(intake.id, { dueDate: to, rescheduleLog: pushLog(intake, { refId, from, to, reasonCode, note, status: 'applied', actor, at: now() }) });
    }
    return ChangeModel.create({
      scope, refId, refTitle, from, to, reasonType: 'incidencia', reasonCode, note: note || '',
      status: 'applied', requester: actor.name, requesterRole: actor.role, appliedOn: now(),
    });
  },

  /** Registra una solicitud de control de cambios pendiente de autorización. */
  requestControl(scope, refId, refTitle, { from, to, reasonCode, note }, actor) {
    const change = ChangeModel.create({
      scope, refId, refTitle, from, to, reasonType: 'control_cambios', reasonCode, note: note || '',
      status: 'pending', requester: actor.name, requesterRole: actor.role,
    });
    if (scope === 'task') {
      TaskModel.audit(refId, {
        type: 'reschedule', action: 'requested', from, to,
        actor: actor.name, role: actor.role,
        note: `Solicitó mover la entrega a ${to} (control de cambios ${change.id})`,
      });
    } else {
      const intake = IntakeModel.findById(refId);
      if (intake) IntakeModel.update(intake.id, { rescheduleLog: pushLog(intake, { refId, from, to, reasonCode, note, status: 'pending', changeId: change.id, actor, at: now() }) });
    }
    return change;
  },

  /** Aplica una solicitud autorizada por el portafolio (control de cambios). */
  applyApproved(change, decided) {
    if (change.scope === 'task') {
      const task = TaskModel.findById(change.refId);
      if (task) {
        TaskModel.update(task.id, { dueDate: change.to });
        TaskModel.audit(task.id, {
          type: 'reschedule', action: 'approved', from: change.from, to: change.to,
          actor: decided.decidedBy, role: decided.decidedRole,
          note: `Entrega movida a ${change.to} · ${reasonCodeMeta(change.reasonType, change.reasonCode).label}${decided.decisionNote ? ` · ${decided.decisionNote}` : ''}`,
        });
      }
    } else {
      const intake = IntakeModel.findById(change.refId);
      if (intake) {
        const entry = {
          changeId: change.id, from: change.from, to: change.to,
          reasonType: change.reasonType, reasonCode: change.reasonCode, note: change.note,
          status: 'approved', requester: change.requester, at: now(),
          decidedBy: decided.decidedBy, decidedRole: decided.decidedRole, decisionNote: decided.decisionNote,
        };
        IntakeModel.update(intake.id, { dueDate: change.to, rescheduleLog: pushLog(intake, entry) });
      }
    }
    return ChangeModel.update(change.id, { ...decided, appliedOn: now() });
  },

  /** Conserva la fecha original cuando el portafolio decide no autorizar. */
  reject(change, decided) {
    if (change.scope === 'task') {
      TaskModel.audit(change.refId, {
        type: 'reschedule', action: 'rejected', from: change.from, to: change.to,
        actor: decided.decidedBy, role: decided.decidedRole,
        note: `Mantenida la entrega en ${change.from} (control de cambios no autorizado)${decided.decisionNote ? ` · ${decided.decisionNote}` : ''}`,
      });
    } else {
      const intake = IntakeModel.findById(change.refId);
      if (intake) {
        IntakeModel.update(intake.id, {
          rescheduleLog: pushLog(intake, {
            changeId: change.id, from: change.from, to: change.to,
            reasonType: change.reasonType, reasonCode: change.reasonCode, note: change.note,
            status: 'rejected', requester: change.requester, at: now(),
            decidedBy: decided.decidedBy, decidedRole: decided.decidedRole, decisionNote: decided.decisionNote,
          }),
        });
      }
    }
    return ChangeModel.update(change.id, decided);
  },
};

function pushLog(intake, entry) {
  return [...(intake.rescheduleLog || []), entry];
}