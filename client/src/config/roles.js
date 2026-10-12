/**
 * Catálogo de roles SAFe (copia de UI). Mantener en sincronía con server/src/config/roles.js
 */
export const ROLES = {
  lpm: { id: 'lpm', label: 'Lean Portfolio Management', short: 'LPM', level: 'Portafolio', icon: '🏛️', color: '#a78bfa' },
  epic_owner: { id: 'epic_owner', label: 'Epic Owner', short: 'Epic Owner', level: 'Portafolio', icon: '📘', color: '#8b5cf6' },
  rte: { id: 'rte', label: 'Release Train Engineer', short: 'RTE', level: 'ART', icon: '🚂', color: '#38bdf8' },
  product_manager: { id: 'product_manager', label: 'Product Management', short: 'Product Mgmt', level: 'ART', icon: '🎯', color: '#22d3ee' },
  system_architect: { id: 'system_architect', label: 'System Architect', short: 'System Architect', level: 'ART', icon: '🏗️', color: '#f472b6' },
  business_owner: { id: 'business_owner', label: 'Business Owner', short: 'Business Owner', level: 'ART', icon: '💼', color: '#fbbf24' },
  scrum_master: { id: 'scrum_master', label: 'Scrum Master / Team Coach', short: 'Scrum Master', level: 'Equipo', icon: '🧑‍🏫', color: '#34d399' },
  product_owner: { id: 'product_owner', label: 'Product Owner', short: 'Product Owner', level: 'Equipo', icon: '📋', color: '#4ade80' },
  developer: { id: 'developer', label: 'Developer', short: 'Developer', level: 'Equipo', icon: '💻', color: '#60a5fa' },
  intake_manager: { id: 'intake_manager', label: 'Intake Manager', short: 'Intake Manager', level: 'Equipo', icon: '📥', color: '#fb923c' },
  team_lead: { id: 'team_lead', label: 'Team Lead', short: 'Team Lead', level: 'Equipo', icon: '🧭', color: '#2dd4bf', canMarkChecklistRoles: ['developer'] },
  tech_lead: { id: 'tech_lead', label: 'Tech Lead', short: 'Tech Lead', level: 'Equipo', icon: '🧪', color: '#a3e635', canMarkChecklistRoles: ['developer'] },
  admin: { id: 'admin', label: 'Administrator', short: 'Admin', level: 'Sistema', icon: '🛡️', color: '#ef4444', canMarkAnyChecklist: true, system: true },
};

export const roleList = Object.values(ROLES);
export const getRole = (id) => ROLES[id] || { id, label: id, short: id, icon: '👤', color: '#6366f1', level: '' };

export const STATUS_META = {
  new: { label: 'Nuevo', tone: 'info' },
  triaged: { label: 'Triado', tone: 'accent' },
  prioritized: { label: 'Priorizado', tone: 'warn' },
  ready: { label: 'Ready', tone: 'ok' },
  scheduled: { label: 'Programado', tone: 'ok' },
  returned: { label: 'Devuelto', tone: 'warn' },
  rejected: { label: 'Rechazado', tone: 'danger' },
  backlog: { label: 'Backlog', tone: 'gray' },
  refining: { label: 'Refinando', tone: 'info' },
  in_progress: { label: 'En progreso', tone: 'accent' },
  qa: { label: 'QA', tone: 'warn' },
  uat: { label: 'Staging / UAT', tone: 'info' },
  release: { label: 'Release', tone: 'ok' },
  review: { label: 'En revisión', tone: 'warn' },
  blocked: { label: 'Bloqueado', tone: 'danger' },
  done: { label: 'Hecho', tone: 'ok' },
};

export const CLASS_META = {
  Standard: { tone: 'gray' },
  'Fixed Date': { tone: 'warn' },
  Intangible: { tone: 'info' },
  Expedite: { tone: 'danger' },
};
