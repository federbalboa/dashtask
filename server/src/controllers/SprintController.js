import { SprintModel, nextSprintStart, CADENCES } from '../models/SprintModel.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { TaskModel } from '../models/TaskModel.js';

/** CONTROLADOR: Sprints (iteraciones de un proyecto; miércoles a miércoles por defecto) */
export const SprintController = {
  cadences: (_req, res) => res.json({ cadences: CADENCES }),

  /** Lista de sprints de un proyecto con métricas y el backlog sin programar. */
  list: (req, res) => {
    const projectId = req.query.projectId;
    let sprints = SprintModel.all();
    if (projectId) sprints = sprints.filter((s) => s.projectId === projectId);
    if (req.query.status) sprints = sprints.filter((s) => s.status === req.query.status);
    sprints = sprints
      .map((s) => ({ ...SprintModel.summarize(s), tasks: TaskModel.findBySprint(s.id) }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    const backlog = projectId
      ? TaskModel.findByProject(projectId).filter((t) => !t.sprintId)
      : TaskModel.all().filter((t) => !t.sprintId);

    const project = projectId ? ProjectModel.findById(projectId) : null;
    const suggested = project ? nextSprintStart(project, SprintModel.all()) : null;

    return res.json({ sprints, backlog, suggested, sprintConfig: project?.sprintConfig || null });
  },

  get: (req, res) => {
    const sprint = SprintModel.findById(req.params.id);
    if (!sprint) return res.status(404).json({ error: 'Sprint no encontrado.' });
    const project = ProjectModel.findById(sprint.projectId) || null;
    return res.json({ sprint: SprintModel.summarize(sprint), tasks: TaskModel.findBySprint(sprint.id), project });
  },

  create: (req, res) => {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'El proyecto es obligatorio.' });
    if (!ProjectModel.findById(projectId)) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }
    const created = SprintModel.create(req.body);
    return res.status(201).json({ sprint: SprintModel.summarize(created) });
  },

  update: (req, res) => {
    const updated = SprintModel.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Sprint no encontrado.' });
    return res.json({ sprint: SprintModel.summarize(updated) });
  },

  /** Sube tareas del backlog al sprint. */
  assign: (req, res) => {
    const { taskIds = [] } = req.body || {};
    const moved = SprintModel.assign(req.params.id, taskIds);
    if (!moved) return res.status(404).json({ error: 'Sprint no encontrado.' });
    return res.json({ sprint: SprintModel.summarize(SprintModel.findById(req.params.id)), tasks: moved });
  },

  /** Carryover: mueve las tareas no entregadas a otro sprint (o de vuelta al backlog). */
  carryover: (req, res) => {
    const from = SprintModel.findById(req.params.id);
    if (!from) return res.status(404).json({ error: 'Sprint no encontrado.' });
    const { targetSprintId = null } = req.body || {};
    const result = SprintModel.carryover(req.params.id, targetSprintId);
    return res.json(result);
  },

  remove: (req, res) => {
    const ok = SprintModel.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Sprint no encontrado.' });
    return res.status(204).end();
  },
};
