import { ChangeModel } from '../models/ChangeModel.js';
import { RescheduleService } from '../services/RescheduleService.js';
import { now } from '../utils/id.js';

/** CONTROLADOR: Cambios de fecha de entrega (incidencias y control de cambios). */
const DECIDE_ROLES = ['lpm', 'business_owner', 'epic_owner', 'rte', 'admin'];
const VIEW_ROLES = DECIDE_ROLES.concat(['product_manager', 'product_owner']);

export const ChangeController = {
  list: (req, res) => {
    let changes = ChangeModel.all();
    if (req.query.status) changes = changes.filter((c) => c.status === req.query.status);
    changes = changes.map(enrich).reverse();
    const pending = changes.filter((c) => c.status === 'pending');
    return res.json({
      changes,
      stats: {
        pending: pending.length,
        applied: changes.filter((c) => c.status === 'applied').length,
        approved: changes.filter((c) => c.status === 'approved').length,
        rejected: changes.filter((c) => c.status === 'rejected').length,
      },
    });
  },

  /**
   * Autoriza o mantiene una solicitud de control de cambios.
   * Solo el equipo de portafolio (LPM, Business Owner, Epic Owner, RTE) o el Admin.
   */
  decide: (req, res) => {
    if (!DECIDE_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Solo el equipo de portafolio (LPM, Business Owner, Epic Owner, RTE) o el Admin pueden autorizar un control de cambios.',
      });
    }
    const change = ChangeModel.findById(req.params.id);
    if (!change) return res.status(404).json({ error: 'Solicitud de cambio no encontrada.' });
    if (change.status !== 'pending') {
      return res.status(409).json({ error: `La solicitud ya fue resuelta (${change.status}).` });
    }
    const approve = req.body?.approve === true;
    const decided = {
      status: approve ? 'approved' : 'rejected',
      decidedBy: req.user.name,
      decidedRole: req.user.role,
      decidedAt: now(),
      decisionNote: String(req.body?.note || ''),
    };
    if (approve) {
      RescheduleService.applyApproved(change, decided);
    } else {
      RescheduleService.reject(change, decided);
    }
    return res.json({ change: enrich(ChangeModel.findById(change.id)) });
  },

  viewRoles: VIEW_ROLES,
};

function enrich(c) {
  return { ...c, viewable: true };
}