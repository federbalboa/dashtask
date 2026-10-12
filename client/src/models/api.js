/**
 * MODELO (capa de acceso a datos del cliente).
 * Encapsula toda la comunicación HTTP con la API. Las vistas nunca hacen fetch directo.
 */
const TOKEN_KEY = 'dashtask.token';
const USER_KEY = 'dashtask.user';

export const session = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  save: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = session.getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const AuthModel = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  catalog: () => request('/auth/catalog'),
};

export const UserModel = {
  list: () => request('/users'),
  roles: () => request('/users/roles'),
  get: (id) => request(`/users/${id}`),
};

export const IntakeModel = {
  list: (params = '') => request(`/intakes${params}`),
  get: (id) => request(`/intakes/${id}`),
  create: (payload) => request('/intakes', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/intakes/${id}`, { method: 'PATCH', body: payload }),
  triage: (id, payload) => request(`/intakes/${id}/triage`, { method: 'POST', body: payload }),
  reschedule: (id, payload) => request(`/intakes/${id}/reschedule`, { method: 'POST', body: payload }),
  perspective: (id, payload) => request(`/intakes/${id}/perspective`, { method: 'POST', body: payload }),
  estimate: (id, payload) => request(`/intakes/${id}/estimate`, { method: 'POST', body: payload }),
  remove: (id) => request(`/intakes/${id}`, { method: 'DELETE' }),
};

export const TaskModel = {
  list: (params = '') => request(`/tasks${params}`),
  board: () => request('/tasks/board'),
  get: (id) => request(`/tasks/${id}`),
  create: (payload) => request('/tasks', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: payload }),
  move: (id, status, blockedReason) =>
    request(`/tasks/${id}/move`, { method: 'POST', body: { status, blockedReason } }),
  advance: (id) => request(`/tasks/${id}/advance`, { method: 'POST' }),
  reschedule: (id, payload) => request(`/tasks/${id}/reschedule`, { method: 'POST', body: payload }),
  checklist: (id, key, payload) => request(`/tasks/${id}/checklist/${key}`, { method: 'POST', body: payload }),
  assignSprint: (id, sprintId) => request(`/tasks/${id}/sprint`, { method: 'POST', body: { sprintId } }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};

export const SprintModel = {
  list: (projectId = '') => request(`/sprints${projectId ? `?projectId=${projectId}` : ''}`),
  get: (id) => request(`/sprints/${id}`),
  create: (payload) => request('/sprints', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/sprints/${id}`, { method: 'PATCH', body: payload }),
  assign: (id, taskIds) => request(`/sprints/${id}/assign`, { method: 'POST', body: { taskIds } }),
  carryover: (id, targetSprintId = null) =>
    request(`/sprints/${id}/carryover`, { method: 'POST', body: { targetSprintId } }),
  remove: (id) => request(`/sprints/${id}`, { method: 'DELETE' }),
};

export const CalendarModel = {
  month: (month = '', projectId = '') => {
    const qs = [];
    if (month) qs.push(`month=${month}`);
    if (projectId) qs.push(`projectId=${projectId}`);
    return request(`/calendar${qs.length ? `?${qs.join('&')}` : ''}`);
  },
};

export const CeremonyModel = {
  list: (params = '') => request(`/ceremonies${params}`),
  forRole: (role) => request(`/ceremonies/role/${role}`),
};

export const ProjectModel = {
  list: () => request('/projects'),
  tree: () => request('/projects/tree'),
  get: (id) => request(`/projects/${id}`),
};

export const EpicModel = {
  list: (params = '') => request(`/epics${params}`),
  get: (id) => request(`/epics/${id}`),
};

export const DashboardModel = {
  forRole: (role) => request(`/dashboard/${role}`),
};

export const TimelineModel = {
  get: () => request('/timeline'),
};

export const ResourceModel = {
  list: (projectId = '') => request(`/resources${projectId ? `?projectId=${projectId}` : ''}`),
  candidates: (projectId) => request(`/resources/candidates?projectId=${projectId}`),
  add: (projectId, userId) => request('/resources', { method: 'POST', body: { projectId, userId } }),
  remove: (id) => request(`/resources/${id}`, { method: 'DELETE' }),
};

export const AdminModel = {
  reset: () => request('/admin/reset', { method: 'POST' }),
  health: () => request('/admin/health'),
  permissions: () => request('/admin/permissions'),
  upsertPermission: (userId, payload) => request(`/admin/permissions/${userId}`, { method: 'PUT', body: payload }),
  removePermission: (userId) => request(`/admin/permissions/${userId}`, { method: 'DELETE' }),
  teams: () => request('/admin/teams'),
  createTeam: (payload) => request('/admin/teams', { method: 'POST', body: payload }),
  updateTeam: (id, payload) => request(`/admin/teams/${id}`, { method: 'PATCH', body: payload }),
  deleteTeam: (id) => request(`/admin/teams/${id}`, { method: 'DELETE' }),
  setUserTeam: (userId, teamId) => request(`/admin/users/${userId}/team`, { method: 'PUT', body: { teamId } }),
};

export const ChangeModel = {
  list: (status = '') => request(`/changes${status ? `?status=${status}` : ''}`),
  decide: (id, payload) => request(`/changes/${id}/decide`, { method: 'POST', body: payload }),
};
