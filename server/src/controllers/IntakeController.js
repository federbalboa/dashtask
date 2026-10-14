import { IntakeModel, completenessOf, normalizeRequirements, pendingByRole, computeWsjf } from '../models/IntakeModel.js';
import { ChangeModel } from '../models/ChangeModel.js';
import { PermissionModel } from '../models/PermissionModel.js';
import { RescheduleService } from '../services/RescheduleService.js';
import { MANAGE_ROLES, INTAKE_REQUIREMENT_ROLES } from '../config/intakeRequirements.js';

/** Gestión de la estructura de requisitos: PM, Admin o permiso global. */
function canManageRequirements(user) {
  if (!user) return false;
  if (MANAGE_ROLES.includes(user.role)) return true;
  return !!PermissionModel.findByUser(user.id)?.canMarkAnyChecklist;
}

/** Cada rol sólo coloca el valor de los requisitos que le tocan (PM/Admin/permiso global: todos). */
function canEditRequirement(user, item) {
  if (!user || !item) return false;
  if (user.role === 'admin' || user.role === 'product_manager') return true;
  if (user.role === item.role) return true;
  return !!PermissionModel.findByUser(user.id)?.canMarkAnyChecklist;
}

/** CONTROLADOR: Intake (revisión primaria, triage y flujo a backlog) */
export const IntakeController = {
  list: (req, res) => {
    let intakes = IntakeModel.all();
    if (req.query.status) intakes = intakes.filter((i) => i.status === req.query.status);
    return res.json({
      intakes: intakes.map((i) => withMeta(i, req.user)),
      stats: buildStats(),
    });
  },

  get: (req, res) => {
    const intake = IntakeModel.findById(req.params.id);
    if (!intake) return res.status(404).json({ error: 'Intake no encontrado.' });
    return res.json({ intake: withMeta(intake, req.user) });
  },

  create: (req, res) => {
    const payload = req.body || {};
    if (!payload.title || !payload.description) {
      return res.status(400).json({ error: 'Título y descripción son obligatorios.' });
    }
    const created = IntakeModel.create(payload);
    return res.status(201).json({ intake: withMeta(created, req.user) });
  },

  update: (req, res) => {
    const updated = IntakeModel.update(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Intake no encontrado.' });
    return res.json({ intake: withMeta(updated, req.user) });
  },

  reschedule: (req, res) => {
    const intake = IntakeModel.findById(req.params.id);
    if (!intake) return res.status(404).json({ error: 'Intake no encontrado.' });
    const { to, reasonType, reasonCode, note } = req.body || {};
    const err = RescheduleService.validateReschedule({
      current: intake.dueDate, to, reasonType, reasonCode, note,
    });
    if (err) return res.status(400).json(err);

    try {
      if (reasonType === 'control_cambios') {
        RescheduleService.guardPending('intake', intake.id);
        const change = RescheduleService.requestControl('intake', intake.id, intake.title, {
          from: intake.dueDate, to, reasonCode, note,
        }, req.user);
        return res.status(201).json({ change, intake: withMeta(IntakeModel.findById(intake.id), req.user), pending: true });
      }
      const change = RescheduleService.applyIncidencia('intake', intake.id, intake.title, {
        from: intake.dueDate, to, reasonCode, note,
      }, req.user);
      return res.json({ change, intake: withMeta(IntakeModel.findById(intake.id), req.user), applied: true });
    } catch (e) {
      return res.status(409).json({ error: e.message });
    }
  },

  /** Revisión primaria: aprobar, devolver o rechazar. */
  triage: (req, res) => {
    const { action, reason, triagedBy } = req.body || {};
    const intake = IntakeModel.findById(req.params.id);
    if (!intake) return res.status(404).json({ error: 'Intake no encontrado.' });

    const missing = completenessOf(intake).missing;
    let patch = { triagedBy: triagedBy || 'Intake Manager' };

    switch (action) {
      case 'approve':
        if (missing.length) {
          return res.status(422).json({
            error: 'El intake está incompleto. No puede aprobarse.',
            missing,
          });
        }
        patch = { ...patch, status: 'triaged', returnReason: '', rejectionReason: '' };
        break;
      case 'return':
        patch = {
          ...patch,
          status: 'returned',
          returnReason: reason || 'Información incompleta.',
        };
        break;
      case 'reject':
        patch = {
          ...patch,
          status: 'rejected',
          rejectionReason: reason || 'Fuera de alcance.',
        };
        break;
      case 'prioritize': {
        const perspectives = intake.perspectives || [];
        const hasPm = perspectives.some((p) => p.role === 'product_manager');
        const hasOthers = perspectives.length >= 2;
        if (!hasPm || !hasOthers) {
          return res.status(422).json({
            error: 'El intake necesita la revisión conjunta (Grooming / Backlog Review): al menos la perspectiva de Product Management y otra más por rol antes de priorizar.',
          });
        }
        const wsjf = intake.wsjf ?? computeWsjf(req.body.wsjfInput || {});
        patch = { ...patch, status: 'prioritized', wsjf, priority: req.body.priority || 'Media' };
        break;
      }
      case 'schedule':
        patch = { ...patch, status: 'scheduled', pi: req.body.pi || intake.pi, iteration: req.body.iteration || intake.iteration };
        break;
      default:
        return res.status(400).json({ error: 'Acción de triage no válida.' });
    }

    const updated = IntakeModel.update(req.params.id, patch);
    return res.json({ intake: withMeta(updated, req.user) });
  },

  /** Revisión conjunta: cada rol involucrado registra su perspectiva. */
  perspective: (req, res) => {
    const intake = IntakeModel.findById(req.params.id);
    if (!intake) return res.status(404).json({ error: 'Intake no encontrado.' });
    const { role, comment } = req.body || {};
    if (!role || !comment) return res.status(400).json({ error: 'Rol y comentario son obligatorios.' });
    const updated = IntakeModel.addPerspective(req.params.id, {
      role,
      by: req.user.name,
      comment,
    });
    return res.json({ intake: withMeta(updated, req.user) });
  },

  /** Estimación en Story Points por rol involucrado (la consolida el PM). */
  estimate: (req, res) => {
    const intake = IntakeModel.findById(req.params.id);
    if (!intake) return res.status(404).json({ error: 'Intake no encontrado.' });
    const { role, points } = req.body || {};
    const pts = Number(points);
    if (!role || Number.isNaN(pts) || pts < 0) {
      return res.status(400).json({ error: 'Rol y puntos (número) son obligatorios.' });
    }
    const updated = IntakeModel.addEstimate(req.params.id, { role, by: req.user.name, points: pts });
    return res.json({ intake: withMeta(updated, req.user) });
  },

  /** Cada rol coloca el valor / marca su requisito de información. */
  setRequirement: (req, res) => {
    const intake = IntakeModel.findById(req.params.id);
    if (!intake) return res.status(404).json({ error: 'Intake no encontrado.' });
    const item = normalizeRequirements(intake).find((r) => r.key === req.params.key);
    if (!item) return res.status(404).json({ error: 'Requisito no encontrado.' });
    if (!canEditRequirement(req.user, item)) {
      return res.status(403).json({ error: `Tu rol (${req.user.role}) no puede editar este requisito (rol: ${item.role}).` });
    }
    const { value, done, note } = req.body || {};
    const updated = IntakeModel.setRequirement(req.params.id, req.params.key, { value, done, note }, { byName: req.user.name });
    if (!updated) return res.status(404).json({ error: 'Requisito no encontrado.' });
    return res.json({ intake: withMeta(updated, req.user) });
  },

  /** Product Management agrega un requisito (y asigna el rol que debe llenarlo). */
  addRequirement: (req, res) => {
    if (!canManageRequirements(req.user)) {
      return res.status(403).json({ error: 'Solo Product Management / Admin gestionan los requisitos del intake.' });
    }
    const { label, role, key } = req.body || {};
    if (!label && !key) return res.status(400).json({ error: 'El requisito necesita un nombre.' });
    if (role && !INTAKE_REQUIREMENT_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido para el requisito.' });
    }
    const updated = IntakeModel.upsertRequirement(req.params.id, { key, label, role });
    if (!updated) return res.status(404).json({ error: 'Intake no encontrado.' });
    return res.json({ intake: withMeta(updated, req.user) });
  },

  /** Product Management edita el nombre o el rol dueño de un requisito. */
  updateRequirement: (req, res) => {
    if (!canManageRequirements(req.user)) {
      return res.status(403).json({ error: 'Solo Product Management / Admin gestionan los requisitos del intake.' });
    }
    const { label, role } = req.body || {};
    if (role && !INTAKE_REQUIREMENT_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido para el requisito.' });
    }
    const updated = IntakeModel.upsertRequirement(req.params.id, { key: req.params.key, label, role });
    if (!updated) return res.status(404).json({ error: 'Intake no encontrado.' });
    return res.json({ intake: withMeta(updated, req.user) });
  },

  /** Product Management quita un requisito del intake. */
  removeRequirement: (req, res) => {
    if (!canManageRequirements(req.user)) {
      return res.status(403).json({ error: 'Solo Product Management / Admin gestionan los requisitos del intake.' });
    }
    const updated = IntakeModel.removeRequirement(req.params.id, req.params.key);
    if (!updated) return res.status(404).json({ error: 'Intake no encontrado.' });
    return res.json({ intake: withMeta(updated, req.user) });
  },

  remove: (req, res) => {
    const ok = IntakeModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Intake no encontrado.' });
    return res.status(204).end();
  },
};

function withMeta(intake, user) {
  const c = completenessOf(intake);
  const requirements = normalizeRequirements(intake).map((r) => ({ ...r, canEdit: canEditRequirement(user, r) }));
  const perspectives = intake.perspectives || [];
  return {
    ...intake,
    requirements,
    completeness: c,
    missingFields: c.missing,
    pendingByRole: pendingByRole(intake),
    canManageRequirements: canManageRequirements(user),
    review: {
      perspectives: perspectives.length,
      hasPm: perspectives.some((p) => p.role === 'product_manager'),
      complete: perspectives.some((p) => p.role === 'product_manager') && perspectives.length >= 2,
      roles: [...new Set(perspectives.map((p) => p.role))],
    },
    estimateSummary: estimateSummary(intake),
    changes: ChangeModel.findByRef('intake', intake.id),
    rescheduleLog: intake.rescheduleLog || [],
  };
}

function estimateSummary(intake) {
  const vals = Object.values(intake.estimates || {}).map((e) => Number(e.points));
  if (!vals.length) return { count: 0, avg: null, min: null, max: null, consensus: null };
  const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  return { count: vals.length, avg, min: Math.min(...vals), max: Math.max(...vals), consensus: Math.round(avg) };
}

function buildStats() {
  const all = IntakeModel.all();
  const byStatus = all.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});
  const complete = all.filter((i) => completenessOf(i).percent === 100).length;
  return {
    total: all.length,
    byStatus,
    complete,
    incomplete: all.length - complete,
    expedite: all.filter((i) => i.class === 'Expedite').length,
  };
}
