import { EpicModel } from '../models/EpicModel.js';
import { epicDetail } from '../services/HierarchyService.js';

/** CONTROLADOR: Épicas */
export const EpicController = {
  list: (req, res) => {
    let epics = EpicModel.all();
    if (req.query.projectId) epics = epics.filter((e) => e.projectId === req.query.projectId);
    return res.json({ epics });
  },

  get: (req, res) => {
    const epic = epicDetail(req.params.id);
    if (!epic) return res.status(404).json({ error: 'Épica no encontrada.' });
    return res.json({ epic });
  },
};
