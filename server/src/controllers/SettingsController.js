import { SettingsModel, WIP_COLUMNS, DEFAULT_WIP } from '../models/SettingsModel.js';

const EDIT_ROLES = ['admin'];

/** CONTROLADOR: configuración global (límites WIP del Kanban, orden manual). */
export const SettingsController = {
  get: (_req, res) => {
    res.json({
      settings: SettingsModel.get(),
      wipColumns: WIP_COLUMNS,
      wipDefaults: DEFAULT_WIP,
    });
  },

  updateWip: (req, res) => {
    if (!EDIT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Solo el Admin puede modificar los límites WIP.' });
    }
    const wipLimits = SettingsModel.setWipLimits(req.body || {});
    return res.json({ wipLimits });
  },
};
