/**
 * Flujo de vida de una tarea: 5 etapas del Kanban (perspectiva Project Manager).
 * Cada etapa tiene un checklist cuyos ítems pertenecen a un rol.
 * El avance a la siguiente etapa se habilita cuando la etapa actual está completa.
 * Mantener en sincronía con server/src/config/taskFlow.js
 */
export const TASK_STAGES = [
  {
    id: 'backlog',
    label: 'Backlog normal',
    icon: '📚',
    output: 'Priorizada y lista para el sprint',
    checklist: [
      { key: 'backlog-pm', label: 'Priorizada por WSJF en el Program Backlog', role: 'product_manager' },
      { key: 'backlog-po', label: 'Descompuesta en historias de usuario', role: 'product_owner' },
      { key: 'backlog-rte', label: 'Impacto en la capacidad del ART evaluado', role: 'rte' },
    ],
  },
  {
    id: 'in_progress',
    label: 'Work in Progress',
    icon: '🚧',
    output: 'Incremento implementado',
    checklist: [
      { key: 'wip-dev', label: 'Implementación completada y commiteada', role: 'developer' },
      { key: 'wip-tests', label: 'Pruebas unitarias en verde', role: 'developer' },
      { key: 'wip-arch', label: 'Guardrails técnicos respetados', role: 'system_architect' },
    ],
  },
  {
    id: 'qa',
    label: 'QA',
    icon: '🔎',
    output: 'Incremento verificado',
    checklist: [
      { key: 'qa-deploy', label: 'Build desplegado al ambiente de QA', role: 'developer' },
      { key: 'qa-ac', label: 'Criterios de aceptación validados', role: 'product_owner' },
      { key: 'qa-nfr', label: 'Revisión no funcional (seguridad / performance)', role: 'system_architect' },
    ],
  },
  {
    id: 'uat',
    label: 'Staging Review / UAT',
    icon: '🧪',
    output: 'Validación de negocio en staging',
    checklist: [
      { key: 'uat-po', label: 'Casos UAT ejecutados por el equipo', role: 'product_owner' },
      { key: 'uat-bo', label: 'Validación de negocio (UAT) aprobada', role: 'business_owner' },
      { key: 'uat-pm', label: 'Alcance confirmado para liberación', role: 'product_manager' },
    ],
  },
  {
    id: 'release',
    label: 'Release',
    icon: '🚀',
    output: 'Valor liberado y demostrado',
    checklist: [
      { key: 'rel-rte', label: 'Incluida en Release Notes / System Demo', role: 'rte' },
      { key: 'rel-arch', label: 'Checklist de despliegue a producción firmado', role: 'system_architect' },
      { key: 'rel-bo', label: 'Valor de negocio confirmado', role: 'business_owner' },
    ],
  },
];

export const STAGE_IDS = TASK_STAGES.map((s) => s.id);

export function stageIndex(status) {
  const i = STAGE_IDS.indexOf(status);
  return i === -1 ? STAGE_IDS.indexOf('qa') : i;
}

export function stageMeta(status) {
  return TASK_STAGES.find((s) => s.id === status) || null;
}

export function nextStageId(status) {
  const i = STAGE_IDS.indexOf(status);
  if (i === -1 || i >= STAGE_IDS.length - 1) return null;
  return STAGE_IDS[i + 1];
}

/** Todas las etapas con su estado de avance respecto al estado actual. */
export function stagesForStatus(status) {
  const idx = stageIndex(status);
  return TASK_STAGES.map((s, i) => ({
    ...s,
    state: i < idx ? 'done' : i === idx ? 'current' : 'pending',
  }));
}
