import { ProjectModel } from '../models/ProjectModel.js';
import { buildTree, projectDetail } from '../services/HierarchyService.js';

/** CONTROLADOR: Proyectos (nivel portafolio) */
export const ProjectController = {
  /** Lista plana de proyectos con métricas. */
  list: (_req, res) => {
    const { projects, unassigned } = buildTree();
    return res.json({
      projects: projects.map(summarize),
      unassignedCount: unassigned.length,
    });
  },

  /** Árbol completo Proyecto → Épica → Tarea. */
  tree: (_req, res) => res.json(buildTree()),

  get: (req, res) => {
    const project = projectDetail(req.params.id);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    return res.json({ project });
  },
};

function summarize(p) {
  const { epics, orphanTasks, progress, ...rest } = p;
  return { ...rest, epicCount: epics.length, progress };
}
