import { UserModel } from '../models/UserModel.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { getRole } from '../config/roles.js';
import { TimelineService } from '../services/TimelineService.js';

/** CONTROLADOR: Timeline (Gantt) adaptado al rol del usuario. */
export const TimelineController = {
  get(req, res) {
    const user = UserModel.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const role = getRole(user.role);

    // Alcance por rol: el PM solo ve sus propios proyectos (por persona).
    let projectIds = null;
    if (user.role === 'product_manager') {
      projectIds = ProjectModel.all()
        .filter((p) => String(p.productManagerId) === String(user.id)
          || (!p.productManagerId && String(p.productManager) === user.name))
        .map((p) => p.id);
    }

    // Acceso por rol: qué vistas puede ver cada usuario.
    const tabs = {
      mine: true,
      byPI: user.role === 'product_manager' || user.role === 'rte',
      projects: ['lpm', 'epic_owner', 'rte', 'business_owner', 'system_architect', 'product_manager'].includes(user.role),
      resources: ['product_manager', 'rte', 'lpm'].includes(user.role),
    };

    const payload = { role: { id: user.role, label: role?.label, level: role?.level, icon: role?.icon }, tabs };

    if (tabs.mine) payload.mine = TimelineService.mine(user);
    if (tabs.byPI) payload.byPI = TimelineService.byPI({ projectIds });
    if (tabs.projects) payload.projects = TimelineService.projects({ projectIds });
    payload.sprints = TimelineService.sprints();
    // Fechas de ceremonias del usuario marcadas sobre la línea de tiempo.
    payload.milestones = TimelineService.milestones({ user, projectIds });

    payload.today = new Date().toISOString().slice(0, 10);
    return res.json(payload);
  },
};