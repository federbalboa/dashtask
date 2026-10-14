import { useMemo, useState } from 'react';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { useAuth } from '../controllers/AuthContext.jsx';
import { IntakeModel } from '../models/api.js';
import { Card, StatRow, StatusBadge, ClassBadge, Badge, Bar, Empty, Field, Spinner, RoleBadge } from './components/UI.jsx';
import RescheduleModal from './components/RescheduleModal.jsx';
import ChangeLog from './components/ChangeLog.jsx';
import { getRole } from '../config/roles.js';

const TRIAGE_ROLES = ['intake_manager', 'product_manager', 'product_owner', 'lpm', 'epic_owner', 'rte', 'system_architect', 'business_owner'];

// Roles invitados a la ceremonia de Grooming / Backlog Review (CEM-013).
const REVIEW_ROLES = ['product_manager', 'product_owner', 'rte', 'system_architect', 'business_owner', 'scrum_master']
  .map((id) => getRole(id));

const REQ_ROLES = ['intake_manager', 'product_owner', 'product_manager', 'business_owner', 'system_architect', 'rte'];

export default function IntakesView() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useApi(() => IntakeModel.list(), []);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [rep, setRep] = useState(null);

  const intakes = data?.intakes || [];
  const stats = data?.stats;

  const filtered = useMemo(() => {
    return intakes.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (query && !`${i.id} ${i.title} ${i.requester}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [intakes, statusFilter, query]);

  if (loading) return <Spinner label="Cargando intakes…" />;

  const canTriage = TRIAGE_ROLES.includes(user.role);

  return (
    <>
      <div className="page-head">
        <h1>Intakes</h1>
        <p>Solicitudes entrantes, revisión primaria (completitud) y enrutamiento al backlog.</p>
      </div>

      {stats && (
        <StatRow
          items={[
            { label: 'Total', value: stats.total },
            { label: 'Pendientes de triage', value: stats.byStatus?.new || 0, tone: 'warn', hint: 'estado New' },
            { label: 'Completos', value: stats.complete, tone: 'ok', hint: 'checklist 100%' },
            { label: 'Expedite', value: stats.expedite, tone: 'danger', hint: 'prioridad máxima' },
          ]}
        />
      )}

      <div className="section-title">Bandeja de intakes</div>
      <div className="toolbar">
        <input placeholder="Buscar por ID, título o solicitante…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ minWidth: 260 }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="new">Nuevo</option>
          <option value="triaged">Triado</option>
          <option value="prioritized">Priorizado</option>
          <option value="ready">Ready</option>
          <option value="scheduled">Programado</option>
          <option value="returned">Devuelto</option>
          <option value="rejected">Rechazado</option>
        </select>
        <div className="spacer" />
        <button className="btn primary" onClick={() => setCreating(true)}>+ Nuevo intake</button>
      </div>

      <Card tight>
        {filtered.length === 0 ? (
          <Empty>No hay intakes que coincidan.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Título</th><th>Tipo</th><th>Clase</th><th>WSJF</th><th>Completitud</th><th>Entrega</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(i)}>
                    <td className="mono muted">{i.id}</td>
                    <td className="title-cell">{i.title}</td>
                    <td className="muted">{i.type}</td>
                    <td><ClassBadge value={i.class} /></td>
                    <td>{i.wsjf ?? '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <Bar value={i.completeness.percent} tone={i.completeness.percent === 100 ? 'ok' : 'warn'} />
                        <span className="mono muted">{i.completeness.percent}%</span>
                      </div>
                    </td>
                    <td className="muted">{i.dueDate || '—'}</td>
                    <td><StatusBadge status={i.status} /></td>
                    <td>
                      <button
                        className="btn sm ghost"
                        title="Reprogramar la fecha objetivo (con motivo)"
                        onClick={(e) => { e.stopPropagation(); setRep(i); }}
                      >
                        ✎
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && (
        <CreateIntakeModal
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); reload(); toast.success('Intake creado.'); }}
        />
      )}

      {rep && (
        <RescheduleModal
          kind="intake"
          item={{ id: rep.id, currentDate: rep.dueDate }}
          onClose={() => setRep(null)}
          onChanged={reload}
        />
      )}

      {selected && (
        <IntakeDetailModal
          intake={selected}
          canTriage={canTriage}
          onClose={() => setSelected(null)}
          onUpdated={(next) => { setSelected(next); reload(); }}
        />
      )}
    </>
  );
}

/* ---------- Modal de creación ---------- */

function CreateIntakeModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '', description: '', type: 'Feature', class: 'Standard',
    requester: '', requesterArea: '', valueStream: 'Cliente Digital',
    businessValue: '', tshirt: '', storyPoints: '', priority: 'Media',
    dueDate: '', dependencies: '', labels: '', ac: '',
  });
  const [noDependencies, setNoDependencies] = useState(false);
  const [nfr, setNfr] = useState(false);
  const [attachments, setAttachments] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error('Título y descripción son obligatorios.');
      return;
    }
    setSaving(true);
    const ac = form.ac.split('\n').map((s) => s.trim()).filter(Boolean);
    const dependencies = form.dependencies.split(',').map((s) => s.trim()).filter(Boolean);
    const checklist = {
      title: !!form.title,
      description: !!form.description,
      type: !!form.type,
      requester: !!form.requester,
      businessValue: !!form.businessValue,
      acceptanceCriteria: ac.length > 0,
      estimate: !!form.tshirt || form.storyPoints !== '',
      dependencies: dependencies.length > 0 || noDependencies,
      nfr,
      attachments,
    };
    try {
      await IntakeModel.create({
        ...form,
        storyPoints: form.storyPoints === '' ? null : Number(form.storyPoints),
        acceptanceCriteria: ac,
        dependencies,
        labels: form.labels.split(',').map((s) => s.trim()).filter(Boolean),
        checklist,
      });
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <div>
            <h3>Nuevo intake</h3>
            <div className="muted-2" style={{ fontSize: 12 }}>Marca los campos que el solicitante ya completó</div>
          </div>
          <button type="button" className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <Field label="Título *"><input value={form.title} onChange={set('title')} /></Field>
          <Field label="Descripción *"><textarea rows={3} value={form.description} onChange={set('description')} /></Field>
          <div className="grid cols-3">
            <Field label="Tipo">
              <select value={form.type} onChange={set('type')}>
                <option>Feature</option><option>Enabler</option><option>Story</option><option>Defect</option><option>Epic</option>
              </select>
            </Field>
            <Field label="Clase de servicio">
              <select value={form.class} onChange={set('class')}>
                <option>Standard</option><option>Fixed Date</option><option>Intangible</option><option>Expedite</option>
              </select>
            </Field>
            <Field label="Prioridad">
              <select value={form.priority} onChange={set('priority')}>
                <option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option>
              </select>
            </Field>
          </div>
          <div className="grid cols-2">
            <Field label="Solicitante"><input value={form.requester} onChange={set('requester')} /></Field>
            <Field label="Área solicitante"><input value={form.requesterArea} onChange={set('requesterArea')} /></Field>
          </div>
          <div className="grid cols-3">
            <Field label="Value Stream"><input value={form.valueStream} onChange={set('valueStream')} /></Field>
            <Field label="T-shirt"><select value={form.tshirt} onChange={set('tshirt')}><option value="">—</option><option>S</option><option>M</option><option>L</option><option>XL</option></select></Field>
            <Field label="Story Points"><input type="number" value={form.storyPoints} onChange={set('storyPoints')} /></Field>
          </div>
          <Field label="Valor de negocio"><input value={form.businessValue} onChange={set('businessValue')} placeholder="ej. Reducción de costo 20%" /></Field>
          <Field label="Criterios de aceptación (uno por línea)"><textarea rows={3} value={form.ac} onChange={set('ac')} /></Field>
          <div className="grid cols-2">
            <Field label="Dependencias (separadas por coma)"><input value={form.dependencies} onChange={set('dependencies')} disabled={noDependencies} /></Field>
            <Field label="Etiquetas (coma)"><input value={form.labels} onChange={set('labels')} /></Field>
          </div>
          <Field label="Fecha objetivo"><input type="date" value={form.dueDate} onChange={set('dueDate')} /></Field>

          <div className="section-title">Checklist de completitud</div>
          <div className="checklist">
            <label className="check-item"><input type="checkbox" checked={noDependencies} onChange={(e) => setNoDependencies(e.target.checked)} /> Sin dependencias</label>
            <label className="check-item"><input type="checkbox" checked={nfr} onChange={(e) => setNfr(e.target.checked)} /> Requisitos no funcionales documentados</label>
            <label className="check-item"><input type="checkbox" checked={attachments} onChange={(e) => setAttachments(e.target.checked)} /> Adjuntos entregados</label>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Crear intake'}</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Modal de detalle + triage ---------- */

function IntakeDetailModal({ intake, canTriage, onClose, onUpdated }) {
  const toast = useToast();
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [priority, setPriority] = useState(intake.priority || 'Media');
  const [pRole, setPRole] = useState(user?.role || 'product_manager');
  const [pComment, setPComment] = useState('');
  const [eRole, setERole] = useState(user?.role || 'product_manager');
  const [ePoints, setEPoints] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const refreshIntake = async () => {
    try {
      const { intake: fresh } = await IntakeModel.get(intake.id);
      onUpdated(fresh);
    } catch { /* ignore */ }
  };

  const act = async (action, extra = {}) => {
    setBusy(true);
    try {
      const res = await IntakeModel.triage(intake.id, { action, reason, priority, ...extra });
      toast.success(`Acción "${action}" aplicada a ${intake.id}.`);
      onUpdated(res.intake);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addPerspective = async () => {
    setBusy(true);
    try {
      const res = await IntakeModel.perspective(intake.id, { role: pRole, comment: pComment });
      toast.success('Perspectiva registrada en la revisión conjunta.');
      setPComment('');
      onUpdated(res.intake);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addEstimate = async () => {
    const pts = Number(ePoints);
    if (!eRole || Number.isNaN(pts) || pts < 0) return;
    setBusy(true);
    try {
      const res = await IntakeModel.estimate(intake.id, { role: eRole, points: pts });
      toast.success(`Estimación registrada (${pts} SP).`);
      setEPoints('');
      onUpdated(res.intake);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const c = intake.completeness;
  const review = intake.review || {};
  const perspectives = intake.perspectives || [];
  const estimates = intake.estimates || {};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="row" style={{ gap: 8 }}>
              <span className="mono muted-2">{intake.id}</span>
              <StatusBadge status={intake.status} />
              <ClassBadge value={intake.class} />
            </div>
            <h3 style={{ marginTop: 6 }}>{intake.title}</h3>
          </div>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="muted" style={{ marginBottom: 18 }}>{intake.description}</p>

          <div className="row" style={{ gap: 10, marginBottom: 6 }}>
            <span className="muted-2" style={{ fontSize: 12 }}>COMPLETITUD</span>
            <Badge tone={c.percent === 100 ? 'ok' : 'warn'}>{c.done}/{c.total} · {c.percent}%</Badge>
          </div>
          <Bar value={c.percent} tone={c.percent === 100 ? 'ok' : 'warn'} />

          <div className="section-title">
            Requisitos de información por rol
          </div>
          <div className="muted-2" style={{ fontSize: 12, marginBottom: 10 }}>
            Prerrequisito del intake: cada rol coloca la información que le toca. Con el 100% completo se
            autoriza y pasa al <strong>Grooming / Backlog Review</strong> para el desglose de tareas.
          </div>
          <RequirementsEditor intake={intake} onChange={onUpdated} />

          <div className="section-title">Detalle</div>
          <dl className="kv">
            <dt>Solicitante</dt><dd>{intake.requester || '—'} {intake.requesterArea ? `· ${intake.requesterArea}` : ''}</dd>
            <dt>Value Stream</dt><dd>{intake.valueStream || '—'}</dd>
            <dt>Valor de negocio</dt><dd>{intake.businessValue || '—'}</dd>
            <dt>WSJF</dt><dd>{intake.wsjf ?? '—'}</dd>
            <dt>Estimación</dt><dd>{intake.tshirt || '—'} {intake.storyPoints ? `· ${intake.storyPoints} SP` : ''}</dd>
            <dt>Prioridad</dt><dd>{intake.priority || '—'}</dd>
            <dt>Fecha objetivo</dt>
            <dd>
              <div className="row" style={{ gap: 8 }}>
                {intake.dueDate || '—'}
                <button className="btn sm ghost" onClick={() => setRescheduleOpen(true)} title="Reprogramar con motivo">✎</button>
              </div>
            </dd>
            <dt>Dependencias</dt><dd>{(intake.dependencies || []).join(', ') || '—'}</dd>
            <dt>Criterios de aceptación</dt><dd>{(intake.acceptanceCriteria || []).map((a, i) => <div key={i}>• {a}</div>)}</dd>
            <dt>SLA revisión</dt><dd>≤ 2 días hábiles</dd>
          </dl>

          {/* Revisión conjunta: Grooming / Backlog Review (perspectivas por rol + estimación SP) */}
          <div className="section-title">
            Revisión conjunta · Grooming / Backlog Review
            <Badge tone={review.complete ? 'ok' : 'warn'}>{review.complete ? 'Lista para priorizar' : 'Falta perspectiva'}</Badge>
          </div>

          <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
            {REVIEW_ROLES.map((r) => {
              const has = perspectives.some((p) => p.role === r.id);
              return (
                <span key={r.id} className={`badge ${has ? 'ok' : 'gray'}`} style={{ opacity: has ? 1 : 0.6 }}>
                  {has ? '✓' : '○'} {r.label}
                </span>
              );
            })}
          </div>

          {perspectives.length > 0 && (
            <div className="list" style={{ gap: 6, margin: '4px 0 12px' }}>
              {perspectives.map((p, i) => (
                <div className="list-item" key={i}>
                  <div className="li-main">
                    <div className="li-title"><RoleBadge role={p.role} /> {p.by} <span className="mono muted-2">{p.at?.slice(0, 16)}</span></div>
                    <div className="li-sub">“{p.comment}”</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid cols-2" style={{ gap: 12, marginBottom: 12 }}>
            <div className="stack" style={{ gap: 6 }}>
              <Field label="Sumar mi perspectiva (rol)">
                <div className="row" style={{ gap: 6 }}>
                  <select className="grow" value={pRole} onChange={(e) => setPRole(e.target.value)}>
                    {REVIEW_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <button className="btn primary sm" disabled={busy || !pComment.trim()} onClick={addPerspective}>+ Aportar</button>
                </div>
              </Field>
              <input
                className="input"
                placeholder="¿Qué aporta/limita esta iniciativa vista desde tu rol?"
                value={pComment}
                onChange={(e) => setPComment(e.target.value)}
              />
            </div>

            <div className="stack" style={{ gap: 6 }}>
              <Field label="Estimación en SP (por involucrado)">
                <div className="row" style={{ gap: 6 }}>
                  <select className="grow" value={eRole} onChange={(e) => setERole(e.target.value)}>
                    {REVIEW_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="SP"
                    value={ePoints}
                    onChange={(e) => setEPoints(e.target.value)}
                    style={{ width: 70 }}
                  />
                  <button className="btn primary sm" disabled={busy || !ePoints} onClick={addEstimate}>Estimar</button>
                </div>
              </Field>
              <div className="row wrap" style={{ gap: 6 }}>
                {Object.entries(estimates).map(([role, e]) => (
                  <Badge key={role} tone="accent">{getRole(role).short}: {e.points} SP</Badge>
                ))}
                {Object.keys(estimates).length > 0 && (
                  <Badge tone="info">promedio {intake.estimateSummary?.avg ?? '—'} SP</Badge>
                )}
              </div>
            </div>
          </div>

          {intake.returnReason && <div className="error-box" style={{ marginTop: 16 }}>Devuelto: {intake.returnReason}</div>}
          {intake.rejectionReason && <div className="error-box" style={{ marginTop: 16 }}>Rechazado: {intake.rejectionReason}</div>}

          {/* Cambios de fecha objetivo (incidencias y control de cambios) */}
          {(intake.changes?.length > 0 || (intake.rescheduleLog || []).length > 0) && (
            <>
              <div className="section-title">Cambios en la fecha objetivo</div>
              <ChangeLog changes={intake.changes || []} />
            </>
          )}

          {canTriage && (
            <>
              <div className="section-title">Acción de revisión primaria</div>
              <Field label="Motivo (para devolver o rechazar)">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Detalle opcional" />
              </Field>
              <div className="row wrap" style={{ gap: 10, marginTop: 8 }}>
                <button className="btn ok" disabled={busy} onClick={() => act('approve')}>✔ Aprobar (completo)</button>
                <button className="btn warn" disabled={busy} onClick={() => act('return')}>↩ Devolver al solicitante</button>
                <button className="btn danger" disabled={busy} onClick={() => act('reject')}>✕ Rechazar</button>
              </div>
              <div className="row wrap" style={{ gap: 10, marginTop: 10, alignItems: 'flex-end' }}>
                <Field label="Priorizar (define WSJF)">
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option>
                  </select>
                </Field>
                <button className="btn" disabled={busy || !review.complete} onClick={() => act('prioritize')} title={review.complete ? '' : 'Requiere la revisión conjunta (perspectiva de PM + al menos otra por rol)'}>⇧ Priorizar</button>
                {!review.complete && <span className="muted-2" style={{ fontSize: 12 }}>Requiere revisión conjunta (perspectiva de PM + otra por rol).</span>}
                <button className="btn primary" disabled={busy} onClick={() => act('schedule')}>📅 Programar en PI</button>
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>

      {rescheduleOpen && (
        <RescheduleModal
          kind="intake"
          item={{ id: intake.id, currentDate: intake.dueDate }}
          onClose={() => setRescheduleOpen(false)}
          onChanged={refreshIntake}
        />
      )}
    </div>
  );
}

/* ---------- Editor de requisitos de información por rol ---------- */

function RequirementsEditor({ intake, onChange }) {
  const toast = useToast();
  const [drafts, setDrafts] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const [newLabel, setNewLabel] = useState('');
  const [newRole, setNewRole] = useState('product_owner');
  const [adding, setBusyAdd] = useState(false);

  const requirements = intake.requirements || [];
  const byRole = useMemo(() => {
    const map = {};
    requirements.forEach((r) => {
      (map[r.role] = map[r.role] || []).push(r);
    });
    return map;
  }, [requirements]);
  const orderedRoles = [
    ...REQ_ROLES.filter((r) => byRole[r]?.length),
    ...Object.keys(byRole).filter((r) => !REQ_ROLES.includes(r)),
  ];

  const save = async (item, done) => {
    setBusyKey(item.key);
    try {
      const res = await IntakeModel.setRequirement(intake.id, item.key, {
        value: drafts[item.key] !== undefined ? drafts[item.key] : item.value,
        done,
      });
      onChange(res.intake);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const changeRole = async (key, role) => {
    setBusyKey(key);
    try {
      const res = await IntakeModel.updateRequirement(intake.id, key, { role });
      onChange(res.intake);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const removeReq = async (key) => {
    setBusyKey(key);
    try {
      const res = await IntakeModel.removeRequirement(intake.id, key);
      onChange(res.intake);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const addReq = async () => {
    if (!newLabel.trim()) return;
    try {
      const res = await IntakeModel.addRequirement(intake.id, { label: newLabel.trim(), role: newRole });
      setNewLabel('');
      onChange(res.intake);
      toast.success('Requisito agregado.');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
        <span className="muted-2" style={{ fontSize: 12 }}>A quién le falta:</span>
        {intake.pendingByRole?.length
          ? intake.pendingByRole.map((p) => (
              <Badge key={p.role} tone="warn">{getRole(p.role)?.short || p.role} · {p.count}</Badge>
            ))
          : <Badge tone="ok">Todos los requisitos colocados</Badge>}
      </div>

      <div className="stack" style={{ gap: 14 }}>
        {orderedRoles.map((role) => (
          <div key={role} className="req-group">
            <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <RoleBadge role={role} />
              <span className="muted-2" style={{ fontSize: 11.5 }}>
                {(byRole[role] || []).filter((r) => !r.done).length} pendiente(s) de {(byRole[role] || []).length}
              </span>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {(byRole[role] || []).map((item) => (
                <div key={item.key} className={`req-item ${item.done ? 'done' : 'miss'}`}>
                  <div className="req-item-main">
                    <span className="mark">{item.done ? '✔' : '⚠'}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="req-label">{item.label}</div>
                      <div className="req-value">{item.value || <span className="muted-2">Sin información</span>}</div>
                      {item.done && item.doneBy && (
                        <div className="muted-2" style={{ fontSize: 11 }}>por {item.doneBy}</div>
                      )}
                    </div>
                  </div>
                  <div className="req-actions">
                    {item.canEdit ? (
                      <>
                        <input
                          className="input"
                          style={{ minWidth: 200 }}
                          placeholder="Escribe la información…"
                          value={drafts[item.key] !== undefined ? drafts[item.key] : item.value}
                          onChange={(e) => setDrafts((d) => ({ ...d, [item.key]: e.target.value }))}
                        />
                        {item.done
                          ? <button className="btn ghost xs" disabled={busyKey === item.key} onClick={() => save(item, false)}>Reabrir</button>
                          : <button className="btn primary xs" disabled={busyKey === item.key} onClick={() => save(item, true)}>✔ Colocar</button>}
                      </>
                    ) : (
                      <span className="muted-2" style={{ fontSize: 11.5 }}>{item.done ? 'colocado' : 'pendiente (otro rol)'}</span>
                    )}
                    {intake.canManageRequirements && (
                      <>
                        <select
                          className="mini"
                          value={item.role}
                          disabled={busyKey === item.key}
                          onChange={(e) => changeRole(item.key, e.target.value)}
                        >
                          {REQ_ROLES.map((r) => <option key={r} value={r}>{getRole(r)?.short || r}</option>)}
                        </select>
                        <button className="btn ghost xs" disabled={busyKey === item.key} title="Quitar requisito" onClick={() => removeReq(item.key)}>✕</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {intake.canManageRequirements && (
        <>
          <div className="section-title" style={{ marginTop: 16 }}>Agregar requisito (Product Management)</div>
          <div className="row wrap" style={{ gap: 8 }}>
            <input
              className="input grow"
              placeholder="Ej. Presupuesto, Restricciones legales, Impacto en otros equipos…"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <select className="mini" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {REQ_ROLES.map((r) => <option key={r} value={r}>{getRole(r)?.short || r}</option>)}
            </select>
            <button className="btn primary sm" disabled={!newLabel.trim()} onClick={addReq}>+ Agregar</button>
          </div>
        </>
      )}
    </>
  );
}
