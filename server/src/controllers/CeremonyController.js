import { CeremonyModel } from '../models/CeremonyModel.js';
import { ROLES } from '../config/roles.js';

/** CONTROLADOR: Ceremonias */
export const CeremonyController = {
  list: (req, res) => {
    let ceremonies = CeremonyModel.all();
    if (req.query.level) ceremonies = ceremonies.filter((c) => c.level === req.query.level);
    if (req.query.role) ceremonies = ceremonies.filter((c) => (c.participants || []).includes(req.query.role));
    return res.json({ ceremonies: ceremonies.map(decorate) });
  },

  forRole: (req, res) => {
    const role = req.params.role;
    const ceremonies = CeremonyModel.forRole(role).map(decorate);
    return res.json({ ceremonies });
  },
};

function decorate(ceremony) {
  return {
    ...ceremony,
    participantLabels: (ceremony.participants || []).map((r) => ROLES[r]?.label || r),
  };
}
