import db from './Database.js';
import { nextId, now } from '../utils/id.js';
import {
  DEFAULT_INTAKE_REQUIREMENTS,
  KNOWN_REQUIREMENT_KEYS,
  slugKey,
} from '../config/intakeRequirements.js';

/** MODELO: Intake (solicitud que entra al sistema antes del backlog) */
const col = () => db.collection('intakes');

/** Valor actual de un requisito tomado de los campos del intake. */
function requirementValue(intake, key) {
  switch (key) {
    case 'title': return intake.title || '';
    case 'description': return intake.description || '';
    case 'type': return intake.type || '';
    case 'requester': return [intake.requester, intake.requesterArea].filter(Boolean).join(' · ');
    case 'businessValue': return intake.businessValue || '';
    case 'acceptanceCriteria': return (intake.acceptanceCriteria || []).join(' | ');
    case 'estimate':
      return [intake.tshirt, intake.storyPoints ? `${intake.storyPoints} SP` : ''].filter(Boolean).join(' · ');
    case 'dependencies': return (intake.dependencies || []).join(', ');
    case 'nfr': return typeof intake.nfr === 'string' ? intake.nfr : (intake.checklist?.nfr ? 'Documentados' : '');
    case 'attachments': return intake.checklist?.attachments ? 'Entregados' : '';
    default: return typeof intake[key] === 'string' ? intake[key] : '';
  }
}

/** Normaliza los requisitos del intake: catálogo por defecto + los personalizados guardados. */
export function normalizeRequirements(intake = {}) {
  const stored = Array.isArray(intake.requirements) ? intake.requirements : [];
  const storedByKey = new Map(stored.map((r) => [r.key, r]));
  const defaults = DEFAULT_INTAKE_REQUIREMENTS.map((d) => ({ ...d, ...(storedByKey.get(d.key) || {}) }));
  const custom = stored.filter((r) => !DEFAULT_INTAKE_REQUIREMENTS.some((d) => d.key === r.key));
  return [...defaults, ...custom].map((r) => {
    const done = r.done !== undefined
      ? !!r.done
      : (intake.checklist?.[r.key] !== undefined ? !!intake.checklist[r.key] : !!requirementValue(intake, r.key));
    return {
      key: r.key,
      label: r.label || r.key,
      role: r.role || 'product_owner',
      value: r.value !== undefined ? r.value : requirementValue(intake, r.key),
      done,
      doneBy: r.doneBy || '',
      doneAt: r.doneAt || '',
      note: r.note || '',
    };
  });
}

/** Reconstruye el checklist legado (para triage/estadísticas) desde los requisitos. */
function checklistFrom(requirements) {
  const checklist = {};
  requirements.forEach((r) => {
    if (KNOWN_REQUIREMENT_KEYS.includes(r.key)) checklist[r.key] = r.done;
  });
  return checklist;
}

/** Completitud basada en los requisitos de información (rol por rol). */
export function completenessOf(intake) {
  const reqs = normalizeRequirements(intake);
  const done = reqs.filter((r) => r.done).length;
  const total = reqs.length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 100, missing: reqs.filter((r) => !r.done).map((r) => r.key) };
}

/** Pendientes agrupados por rol (a quién le falta colocar información). */
export function pendingByRole(intake) {
  const reqs = normalizeRequirements(intake);
  const byRole = new Map();
  reqs.filter((r) => !r.done).forEach((r) => {
    if (!byRole.has(r.role)) byRole.set(r.role, []);
    byRole.get(r.role).push({ key: r.key, label: r.label });
  });
  return [...byRole.entries()].map(([role, pending]) => ({ role, pending, count: pending.length }));
}


// Checklist obligatorio de la revisión primaria.
export const REQUIRED_CHECKS = [
  'title',
  'description',
  'type',
  'requester',
  'businessValue',
  'acceptanceCriteria',
  'estimate',
  'dependencies',
  'nfr',
];

export function completeness(checklist = {}) {
  const done = REQUIRED_CHECKS.filter((k) => checklist[k]).length;
  const total = REQUIRED_CHECKS.length;
  return { done, total, percent: Math.round((done / total) * 100) };
}

export function missingFields(checklist = {}) {
  return REQUIRED_CHECKS.filter((k) => !checklist[k]);
}

/** WSJF = Cost of Delay / Job Size */
export function computeWsjf({ userValue = 0, timeValue = 0, riskValue = 0, jobSize = 1 }) {
  const cod = Number(userValue) + Number(timeValue) + Number(riskValue);
  const size = Number(jobSize) || 1;
  return Math.round((cod / size) * 100) / 100;
}

export const IntakeModel = {
  all: () => col().all(),
  findById: (id) => col().findById(id),
  findByStatus: (status) => col().find((x) => x.status === status),
  create: (payload) => {
    const id = nextId(col().all(), 'INT');
    const checklist = payload.checklist || {};
    const { missing, status } = evaluate(checklist, payload.status);
    const doc = {
      id,
      title: payload.title || 'Sin título',
      description: payload.description || '',
      type: payload.type || 'Feature',
      class: payload.class || 'Standard',
      requester: payload.requester || '',
      requesterArea: payload.requesterArea || '',
      valueStream: payload.valueStream || '',
      businessValue: payload.businessValue || '',
      tshirt: payload.tshirt || '',
      storyPoints: payload.storyPoints ?? null,
      wsjf: payload.wsjf ?? computeWsjf(payload.wsjfInput || {}),
      priority: payload.priority || '',
      status,
      pi: payload.pi || '',
      iteration: payload.iteration || '',
      checklist,
      missingFields: missing,
      acceptanceCriteria: payload.acceptanceCriteria || [],
      perspectives: payload.perspectives || [],
      estimates: payload.estimates || {},
      dependencies: payload.dependencies || [],
      labels: payload.labels || [],
      links: payload.links || [],
      triagedBy: payload.triagedBy || '',
      returnReason: payload.returnReason || '',
      rejectionReason: payload.rejectionReason || '',
      createdAt: now(),
      updatedAt: now(),
      dueDate: payload.dueDate || '',
    };
    doc.requirements = normalizeRequirements(doc);
    return col().insert(doc);
  },
  update: (id, patch, meta = {}) => {
    const current = col().findById(id);
    if (!current) return null;
    const checklist = { ...current.checklist, ...(patch.checklist || {}) };
    const { missing } = evaluate(checklist, null);
    return col().update(id, {
      ...patch,
      checklist,
      missingFields: missing,
      updatedAt: now(),
      ...(meta.setUpdatedBy ? { updatedBy: meta.setUpdatedBy } : {}),
    });
  },

  /** Registra la perspectiva de un rol en la revisión conjunta (grooming / backlog review). */
  addPerspective: (id, { role, by, comment }) => {
    const current = col().findById(id);
    if (!current) return null;
    const perspectives = [...(current.perspectives || []), { role, by, at: now(), comment }];
    return col().update(id, { perspectives, updatedAt: now() });
  },

  /** Registra la estimación en Story Points de un rol involucrado. */
  addEstimate: (id, { role, by, points }) => {
    const current = col().findById(id);
    if (!current) return null;
    const estimates = { ...(current.estimates || {}), [role]: { points, by, at: now() } };
    return col().update(id, { estimates, updatedAt: now() });
  },

  /** Cada rol coloca/actualiza el valor de su requisito de información. */
  setRequirement: (id, key, patch = {}, meta = {}) => {
    const current = col().findById(id);
    if (!current) return null;
    let touched = false;
    const requirements = normalizeRequirements(current).map((item) => {
      if (item.key !== key) return item;
      touched = true;
      const done = patch.done !== undefined ? !!patch.done : item.done;
      return {
        ...item,
        value: patch.value !== undefined ? String(patch.value) : item.value,
        note: patch.note !== undefined ? String(patch.note) : item.note,
        done,
        doneBy: done ? (meta.byName || item.doneBy || '') : '',
        doneAt: done ? (item.done && item.doneAt ? item.doneAt : now()) : '',
      };
    });
    if (!touched) return null;
    const checklist = checklistFrom(requirements);
    const { missing } = evaluate(checklist, null);
    return col().update(id, { requirements, checklist, missingFields: missing, updatedAt: now() });
  },

  /** Agrega un requisito nuevo o edita metadatos (label / rol) — gestión de PM/Admin. */
  upsertRequirement: (id, { key, label, role }) => {
    const current = col().findById(id);
    if (!current) return null;
    const requirements = normalizeRequirements(current);
    const finalKey = key || slugKey(label || '');
    const idx = requirements.findIndex((r) => r.key === finalKey);
    if (idx >= 0) {
      requirements[idx] = {
        ...requirements[idx],
        label: label || requirements[idx].label,
        role: role || requirements[idx].role,
      };
    } else {
      requirements.push({
        key: finalKey,
        label: label || finalKey,
        role: role || 'product_owner',
        value: '',
        done: false,
        doneBy: '',
        doneAt: '',
        note: '',
      });
    }
    const checklist = checklistFrom(requirements);
    const { missing } = evaluate(checklist, null);
    return col().update(id, { requirements, checklist, missingFields: missing, updatedAt: now() });
  },

  /** Quita un requisito (gestión de PM/Admin). */
  removeRequirement: (id, key) => {
    const current = col().findById(id);
    if (!current) return null;
    const requirements = normalizeRequirements(current).filter((r) => r.key !== key);
    const checklist = checklistFrom(requirements);
    const { missing } = evaluate(checklist, null);
    return col().update(id, { requirements, checklist, missingFields: missing, updatedAt: now() });
  },
  remove: (id) => col().remove(id),
};

function evaluate(checklist, forcedStatus) {
  const missing = missingFields(checklist);
  if (forcedStatus) return { missing, status: forcedStatus };
  return { missing, status: missing.length === 0 ? 'triaged' : 'new' };
}
