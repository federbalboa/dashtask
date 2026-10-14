/**
 * Catálogo de requisitos de información de un intake.
 * Cada requisito pertenece a un rol: ese rol es quien debe colocar el dato.
 * Product Management (y Admin / permiso global) pueden reasignar el rol dueño,
 * agregar requisitos nuevos o quitarlos.
 */
export const INTAKE_REQUIREMENT_ROLES = [
  'intake_manager',
  'product_owner',
  'product_manager',
  'business_owner',
  'system_architect',
  'rte',
];

export const DEFAULT_INTAKE_REQUIREMENTS = [
  { key: 'title', label: 'Título', role: 'product_owner' },
  { key: 'description', label: 'Descripción', role: 'product_owner' },
  { key: 'type', label: 'Tipo de trabajo', role: 'product_owner' },
  { key: 'requester', label: 'Solicitante y área', role: 'intake_manager' },
  { key: 'businessValue', label: 'Valor de negocio', role: 'business_owner' },
  { key: 'acceptanceCriteria', label: 'Criterios de aceptación', role: 'product_owner' },
  { key: 'estimate', label: 'Estimación de alto nivel', role: 'product_manager' },
  { key: 'dependencies', label: 'Dependencias', role: 'system_architect' },
  { key: 'nfr', label: 'Requisitos no funcionales', role: 'system_architect' },
  { key: 'attachments', label: 'Adjuntos', role: 'intake_manager' },
];

/** Claves conocidas que también existen en el checklist legado del intake. */
export const KNOWN_REQUIREMENT_KEYS = DEFAULT_INTAKE_REQUIREMENTS.map((r) => r.key);

/** Roles que pueden gestionar la estructura de requisitos (agregar/editar/quitar). */
export const MANAGE_ROLES = ['product_manager', 'admin'];

export function slugKey(label = '') {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `req-${Date.now().toString(36)}`;
}
