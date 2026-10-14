import db from './Database.js';

/**
 * MODELO: Settings (configuración global de la demo).
 * Persiste los límites WIP del tablero y el orden manual de las listas
 * (por alcance: `project:PRJ-001`, `epic:EPC-002`, `column:in_progress`).
 */
const col = () => db.collection('settings');
const DOC_ID = 'SET-001';

/** Límites WIP por defecto (solo las columnas con tope; null = sin límite). */
export const DEFAULT_WIP = { in_progress: 5, qa: 5, uat: 4 };
export const WIP_COLUMNS = Object.keys(DEFAULT_WIP);

function ensureDoc() {
  let doc = col().findById('SET-001');
  if (!doc) {
    doc = col().insert({
      id: 'SET-001',
      wipLimits: { ...DEFAULT_WIP },
      taskOrder: {},
      updatedAt: '',
    });
  }
  return doc;
}

export const SettingsModel = {
  get: () => {
    const doc = ensureDoc();
    return {
      wipLimits: { ...DEFAULT_WIP, ...(doc.wipLimits || {}) },
      taskOrder: { ...(doc.taskOrder || {}) },
    };
  },

  getWipLimits: () => ({ ...DEFAULT_WIP, ...(ensureDoc().wipLimits || {}) }),

  /** Solo permite límites de columnas WIP; valor null = sin límite. */
  setWipLimits(limits) {
    const doc = ensureDoc();
    const clean = { ...(doc.wipLimits || {}) };
    WIP_COLUMNS.forEach((id) => {
      if (limits[id] === null) clean[id] = null;
      else if (limits[id] !== undefined && limits[id] !== '') {
        const n = Number(limits[id]);
        if (Number.isFinite(n) && n >= 0) clean[id] = Math.floor(n);
      }
    });
    col().update(doc.id, { wipLimits: clean, updatedAt: new Date().toISOString() });
    return SettingsModel.getWipLimits();
  },

  /** Guarda el orden manual de un conjunto de tareas bajo un scope concreto. */
  setOrder(scope, orderedIds) {
    const doc = ensureDoc();
    const taskOrder = { ...(doc.taskOrder || {}) };
    if (!Array.isArray(orderedIds)) return taskOrder;
    taskOrder[scope] = orderedIds.map((x) => String(x));
    col().update(doc.id, { taskOrder, updatedAt: new Date().toISOString() });
    return taskOrder;
  },

  orderFor: (scope) => (ensureDoc().taskOrder || {})[scope] || [],

  /** Ordena una lista de tareas según el orden manual guardado para `scope`.
   * Las tareas no listadas van al final conservando su orden relativo. */
  sortByOrder(list, scope, fallback = null) {
    const order = SettingsModel.orderFor(scope);
    const idx = new Map(order.map((id, i) => [id, i]));
    const withIdx = list
      .map((t, base) => ({ t, base }))
      .sort((a, b) => {
        const ai = idx.has(a.t.id) ? idx.get(a.t.id) : Number.MAX_SAFE_INTEGER;
        const bi = idx.has(b.t.id) ? idx.get(b.t.id) : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        if (fallback) return fallback(a.t, b.t);
        return a.base - b.base;
      });
    return withIdx.map((x) => x.t);
  },
};
