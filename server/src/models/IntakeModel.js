import db from './Database.js';
import { nextId, now } from '../utils/id.js';

/** MODELO: Intake (solicitud entrante) */
const col = () => db.collection('intakes');

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
  remove: (id) => col().remove(id),
};

function evaluate(checklist, forcedStatus) {
  const missing = missingFields(checklist);
  if (forcedStatus) return { missing, status: forcedStatus };
  return { missing, status: missing.length === 0 ? 'triaged' : 'new' };
}
