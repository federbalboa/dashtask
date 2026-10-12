/**
 * Catálogo de roles de la metodología SAFe.
 * Compartido por el backend (autorización / dashboards) y el frontend (etiquetas UI).
 */
export const ROLES = {
  lpm: {
    id: 'lpm',
    label: 'Lean Portfolio Management',
    short: 'LPM',
    level: 'Portafolio',
    icon: '🏛️',
    color: '#a78bfa',
    responsibilities: [
      'Estrategia, financiamiento lean y gobierno del portafolio',
      'Alinear estrategia con ejecución (épicas, presupuesto)',
      'Revisar el flujo de valor de los value streams',
    ],
  },
  epic_owner: {
    id: 'epic_owner',
    label: 'Epic Owner',
    short: 'Epic Owner',
    level: 'Portafolio',
    icon: '📘',
    color: '#8b5cf6',
    responsibilities: [
      'Coordinar una épica de portafolio en todo su ciclo de vida',
      'Mantener el Lean Business Case actualizado',
      'Definir MVP y criterios de éxito de la épica',
    ],
  },
  rte: {
    id: 'rte',
    label: 'Release Train Engineer',
    short: 'RTE',
    level: 'ART',
    icon: '🚂',
    color: '#38bdf8',
    responsibilities: [
      'Líder servicial del Agile Release Train (ART)',
      'Facilitar PI Planning, ART Sync e Inspect & Adapt',
      'Eliminar impedimentos y gestionar riesgos del ART',
    ],
  },
  product_manager: {
    id: 'product_manager',
    label: 'Product Management',
    short: 'Product Mgmt',
    level: 'ART',
    icon: '🎯',
    color: '#22d3ee',
    responsibilities: [
      'Definir visión, roadmap y Features del ART',
      'Ser la voz del cliente y priorizar el Program Backlog',
      'Aprobar alcance del PI junto a Business Owners',
    ],
  },
  system_architect: {
    id: 'system_architect',
    label: 'System Architect / Engineering',
    short: 'System Architect',
    level: 'ART',
    icon: '🏗️',
    color: '#f472b6',
    responsibilities: [
      'Autoridad técnica del ART y guardrails de arquitectura',
      'Definir y mantener el Architecture Runway',
      'Gestionar Enablers técnicos',
    ],
  },
  business_owner: {
    id: 'business_owner',
    label: 'Business Owner',
    short: 'Business Owner',
    level: 'ART',
    icon: '💼',
    color: '#fbbf24',
    responsibilities: [
      'Validar el valor de negocio del ART',
      'Aprobar los PI Objectives',
      'Participar en Inspect & Adapt',
    ],
  },
  scrum_master: {
    id: 'scrum_master',
    label: 'Scrum Master / Team Coach',
    short: 'Scrum Master',
    level: 'Equipo',
    icon: '🧑‍🏫',
    color: '#34d399',
    responsibilities: [
      'Líder servicial del equipo ágil',
      'Facilitar ceremonias y eliminar impedimentos',
      'Coach y protección del flujo del equipo',
    ],
  },
  product_owner: {
    id: 'product_owner',
    label: 'Product Owner',
    short: 'Product Owner',
    level: 'Equipo',
    icon: '📋',
    color: '#4ade80',
    responsibilities: [
      'Gestionar y priorizar el Team Backlog',
      'Definir criterios de aceptación y aceptar trabajo',
      'Alinear el equipo con las prioridades del PI',
    ],
  },
  developer: {
    id: 'developer',
    label: 'Developer',
    short: 'Developer',
    level: 'Equipo',
    icon: '💻',
    color: '#60a5fa',
    responsibilities: [
      'Diseñar, construir, probar e integrar incrementos',
      'Autoorganizarse y comprometerse con las Iteration Goals',
      'Levantar impedimentos en el Daily Stand-up',
    ],
  },
  intake_manager: {
    id: 'intake_manager',
    label: 'Intake Manager / Business Analyst',
    short: 'Intake Manager',
    level: 'Equipo',
    icon: '📥',
    color: '#fb923c',
    responsibilities: [
      'Revisión primaria (triage) de los intakes',
      'Verificar completitud y elegibilidad',
      'Enrutar solicitudes al backlog correspondiente',
    ],
  },
  team_lead: {
    id: 'team_lead',
    label: 'Team Lead',
    short: 'Team Lead',
    level: 'Equipo',
    icon: '🧭',
    color: '#2dd4bf',
    responsibilities: [
      'Responde por el área de desarrollo de su equipo',
      'Puede marcar los puntos del checklist de desarrollo',
      'Coordina la entrega de incrementos con sus desarrolladores',
    ],
    // Roles de checklist que puede marcar por delegación (además del propio).
    canMarkChecklistRoles: ['developer'],
  },
  tech_lead: {
    id: 'tech_lead',
    label: 'Tech Lead',
    short: 'Tech Lead',
    level: 'Equipo',
    icon: '🧪',
    color: '#a3e635',
    responsibilities: [
      'Autoridad técnica del equipo y guardrails',
      'Puede marcar los puntos del checklist de desarrollo',
      'Asegura calidad técnica, pruebas y despliegues',
    ],
    canMarkChecklistRoles: ['developer'],
  },
  admin: {
    id: 'admin',
    label: 'Administrator',
    short: 'Admin',
    level: 'Sistema',
    icon: '🛡️',
    color: '#ef4444',
    responsibilities: [
      'Gestionar usuarios, roles y permisos globales',
      'Puede marcar cualquier punto del checklist de cualquier tarea',
      'Administrar la sección de permisos del sistema',
    ],
    canMarkAnyChecklist: true,
    system: true,
  },
};

export const roleList = Object.values(ROLES);
export const getRole = (id) => ROLES[id] || null;
