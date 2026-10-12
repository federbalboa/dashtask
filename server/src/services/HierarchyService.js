import { ProjectModel } from '../models/ProjectModel.js';
import { EpicModel } from '../models/EpicModel.js';
import { TaskModel } from '../models/TaskModel.js';
import { SprintModel } from '../models/SprintModel.js';

/** SERVICIO: construye la jerarquía Proyecto → Épica → Tarea. */

export function taskProgress(tasks = []) {
  const done = tasks.filter((t) => t.status === 'release').length;
  const points = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
  return {
    total: tasks.length,
    done,
    points,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}

export function buildTree() {
  const tasks = TaskModel.all();
  const epics = EpicModel.all();
  const projects = ProjectModel.all();

  const tree = projects.map((p) => {
    const pEpics = epics
      .filter((e) => e.projectId === p.id)
      .map((e) => {
        const eTasks = tasks.filter((t) => t.epicId === e.id);
        return { ...e, tasks: eTasks, progress: taskProgress(eTasks) };
      });
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    const orphanTasks = projectTasks.filter((t) => !t.epicId);
    return {
      ...p,
      epics: pEpics,
      epicCount: pEpics.length,
      orphanTasks,
      progress: taskProgress(projectTasks),
    };
  });

  const unassigned = tasks.filter((t) => !t.projectId);
  return { projects: tree, unassigned };
}

export function epicDetail(epicId) {
  const epic = EpicModel.findById(epicId);
  if (!epic) return null;
  const project = ProjectModel.findById(epic.projectId) || null;
  const tasks = TaskModel.findByEpic(epicId);
  return { ...epic, project, tasks, progress: taskProgress(tasks) };
}

export function projectDetail(projectId) {
  const project = ProjectModel.findById(projectId);
  if (!project) return null;
  const tree = buildTree().projects.find((p) => p.id === projectId);
  return tree || project;
}

export function taskContext(taskId) {
  const task = TaskModel.findById(taskId);
  if (!task) return null;
  const epic = task.epicId ? EpicModel.findById(task.epicId) : null;
  const project = task.projectId ? ProjectModel.findById(task.projectId) : null;
  const sprint = task.sprintId ? SprintModel.findById(task.sprintId) : null;
  return { task, epic, project, sprint };
}
