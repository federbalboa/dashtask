import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { useAuth } from '../controllers/AuthContext.jsx';
import { TaskModel, SprintModel, BlockModel } from '../models/api.js';
import { TASK_STAGES, stageMeta, stagesForStatus, nextStageId, STAGE_IDS } from '../config/taskFlow.js';
import { getRole } from '../config/roles.js';
import { changeStatusMeta, reasonCodeMeta } from '../config/reschedule.js';
import { Card, Badge, StatusBadge, ClassBadge, Bar, Empty, Spinner, RoleBadge, Field } from './components/UI.jsx';
import RescheduleModal from './components/RescheduleModal.jsx';
import TaskEditModal from './components/TaskEditModal.jsx';
import ChangeLog from './components/ChangeLog.jsx';

export default function TaskDetailView() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => TaskModel.get(id), [id]);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [blockNote, setBlockNote] = useState({});

  // Deep-link: mostrar y resaltar el punto exacto del checklist que debo marcar.
  const focusKey = params.get('focus') || '';
  const focusStage = params.get('stage') || '';
  useEffect(() => {
    if (data && focusKey) {
      const el = document.getElementById(`ci-${focusStage}-${focusKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 2600);
      }
    }
  }, [data, focusKey, focusStage]);

  if (loading) return <Spinner label="Cargando tarea…" />;
  if (error) return <div className="error-box">No se encontró la tarea: {error.message}</div>;

  const { task, epic, project, sprint } = data;
  // Permisos de marcado calculados por el servidor (rol dueño, delegación o permiso global).
  const mineMap = new Map((data.checklist || []).map((i) => [`${i.stage}:${i.key}`, i.mine]));
  const status = task.status;
  const stage = stageMeta(status) || { label: status, icon: '•', output: '' };
  const flow = stagesForStatus(status);
  const isBlocked = status === 'blocked';
  const next = nextStageId(status);
  const nextMeta = next ? stageMeta(next) : null;

  const stageItems = (sid) => (task.checklist || []).filter((i) => i.stage === sid);
  const currentItems = stageItems(status);
  const currentDone = currentItems.filter((i) => i.done).length;
  const currentComplete = currentItems.length > 0 && currentDone === currentItems.length;

  const myRole = user?.role;

  const toggleItem = async (item) => {
    setBusy(item.key);
    try {
      await TaskModel.checklist(task.id, item.key, { done: !item.done, note: notes[item.key] ?? item.note });
      toast.success(item.done ? `Reabierto: ${item.label}` : `Completado: ${item.label}`);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  const saveNote = async (item) => {
    setBusy(item.key);
    try {
      await TaskModel.checklist(task.id, item.key, { done: item.done, note: notes[item.key] ?? item.note });
      toast.success('Detalle guardado.');
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  const advance = async () => {
    try {
      await TaskModel.advance(task.id);
      toast.success(`Avanzó a "${nextMeta?.label}".`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const block = async () => {
    const reason = window.prompt('Motivo del bloqueo (lo autoriza LPM, Product Management o el Admin):') || '';
    if (!reason.trim()) return;
    setBusy('block');
    try {
      const r = await BlockModel.create(task.id, reason.trim());
      if (r.applied) toast.success('Tarea bloqueada (el solicitante es aprobador).');
      else toast.success('Solicitud de bloqueo enviada: LPM, Product Management o el Admin deben autorizarla.');
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  const unblock = async () => {
    try {
      await TaskModel.move(task.id, task.previousStatus || 'in_progress');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const decideBlock = async (block, approve) => {
    setBusy(`blk-${block.id}`);
    try {
      await BlockModel.decide(block.id, { approve, note: blockNote[block.id] || '' });
      toast.success(approve ? 'Bloqueo autorizado: la tarea pasa a Bloqueado.' : 'Bloqueo rechazado: la tarea continúa.');
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  const directMove = async (target) => {
    try {
      await TaskModel.move(task.id, target);
      toast.success(`Movida a "${stageMeta(target)?.label}".`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="row wrap muted-2" style={{ fontSize: 12.5, marginBottom: 14, gap: 8 }}>
        <Link to="/backlog">Backlog</Link>
        {project && <><span>/</span><Link to={`/projects/${project.id}`}>{project.name}</Link></>}
        {epic && <><span>/</span><Link to={`/epics/${epic.id}`}>{epic.name}</Link></>}
        <span>/</span><span className="mono">{task.id}</span>
      </div>

      {/* Header */}
      <Card style={{ marginBottom: 18 }}>
        <div className="row wrap" style={{ justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 300, flex: 1 }}>
            <div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
              <span className="mono muted-2">{task.id}</span>
              <StatusBadge status={task.status} />
              <ClassBadge value={task.class} />
              <Badge tone="gray">{task.type}</Badge>
              {task.priority && <Badge tone="warn">{task.priority}</Badge>}
            </div>
            <h1 style={{ fontSize: 26 }}>{task.title}</h1>
            <p className="muted" style={{ marginTop: 8, maxWidth: 720 }}>{task.description}</p>
            <div className="tag-list" style={{ marginTop: 12 }}>
              {(task.labels || []).map((l) => <Badge key={l} tone="info">{l}</Badge>)}
            </div>
          </div>
          <div style={{ minWidth: 240 }}>
            <div className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
              <dt>Responsable</dt>
              <dd>{task.assignee || '—'}</dd>
              <dt>Sprint</dt>
              <dd>{sprint ? <Link to="/sprints">{sprint.name}</Link> : '—'}</dd>
              <dt>Equipo</dt>
              <dd>{task.team || '—'}</dd>
              <dt>Story Points</dt>
              <dd>{task.storyPoints ?? '—'} SP</dd>
              <dt>WSJF</dt>
              <dd>{task.wsjf ?? '—'}</dd>
              <dt>Vence</dt>
              <dd>
                <button className="link-btn" onClick={() => setRescheduleOpen(true)} title="Reprogramar la entrega identificando el motivo">
                  {task.dueDate || 'Sin fecha'} <span className="muted-2">✎</span>
                </button>
              </dd>
            </div>
            <div className="hint" style={{ marginTop: 10 }}>
              El esfuerzo (<b>SP</b>) y la fecha de entrega son cosas distintas. Cualquier cambio en la entrega queda identificado con su motivo.
            </div>
          </div>
        </div>

        {rescheduleOpen && (
          <RescheduleModal
            kind="task"
            item={{ id: task.id, currentDate: task.dueDate }}
            onClose={() => setRescheduleOpen(false)}
            onChanged={reload}
          />
        )}

        {editOpen && (
          <TaskEditModal ctx={data} onClose={() => setEditOpen(false)} onSaved={reload} />
        )}

        {/* Stepper de etapas */}
        <div className="stage-stepper">
          {flow.map((s, i) => (
            <div className={`step ${s.state}`} key={s.id}>
              <div className="step-dot">{s.state === 'done' ? '✓' : s.icon}</div>
              <div className="step-label">{s.label}</div>
              {i < flow.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        {/* Acciones de avance */}
        <div className="row wrap" style={{ gap: 10, marginTop: 18, alignItems: 'center' }}>
          {!isBlocked && nextMeta && (
            <button className="btn primary" onClick={advance} disabled={!currentComplete}
              title={currentComplete ? '' : 'Completa el checklist de la etapa actual'}>
              Avanzar a “{nextMeta.label}” →
            </button>
          )}
          {!isBlocked && !nextMeta && <Badge tone="ok" dot>En la última etapa (Release)</Badge>}
          {isBlocked ? (
            <button className="btn" onClick={unblock}>Desbloquear</button>
          ) : (
            <button className="btn ghost" onClick={block} disabled={busy === 'block'}>⛔ Bloquear</button>
          )}
          <button className="btn" onClick={() => setEditOpen(true)}>✎ Editar tarea</button>
          <div className="spacer" />
          <select className="mini" value={status} onChange={(e) => directMove(e.target.value)} title="Mover directamente">
            {STAGE_IDS.map((s) => <option key={s} value={s}>{stageMeta(s).label}</option>)}
          </select>
        </div>
        {!isBlocked && !currentComplete && currentItems.length > 0 && (
          <div className="hint" style={{ marginTop: 8 }}>
            Faltan {currentItems.length - currentDone} punto(s) del checklist de “{stage.label}”. Cada punto lo completa su rol dueño (o quien tenga delegación/permiso global).
          </div>
        )}
      </Card>

      <div className="grid cols-2">
        <div className="stack" style={{ gap: 18 }}>
          {/* Checklist por etapa — cada rol completa su parte */}
          <Card
            title="Checklist de la tarea"
            hint={`Tu rol: ${getRole(myRole).label} · marca tu parte para avanzar la tarea`}
          >
            <div className="stack" style={{ gap: 16 }}>
              {TASK_STAGES.map((s) => {
                const items = stageItems(s.id);
                const done = items.filter((i) => i.done).length;
                const isCurrent = s.id === status;
                const allDone = items.length > 0 && done === items.length;
                return (
                  <div key={s.id} className={`stage-block ${isCurrent ? 'current' : ''}`}>
                    <div className="stage-head">
                      <div className="row" style={{ gap: 8 }}>
                        <span>{s.icon}</span>
                        <strong>{s.label}</strong>
                        {isCurrent && <Badge tone="accent">Etapa actual</Badge>}
                        {allDone && !isCurrent && <Badge tone="ok">Completada</Badge>}
                      </div>
                      <span className="muted-2" style={{ fontSize: 12 }}>{done}/{items.length}</span>
                    </div>
                    <div className="check-list">
                      {items.map((item) => {
                        // Permiso de marcado calculado en el servidor:
                        // rol dueño, delegación del lead o permiso global del admin.
                        const mine = mineMap.get(`${s.id}:${item.key}`) ?? item.role === myRole;
                        return (
                          <div
                            className={`check-item ${item.done ? 'done' : ''} ${mine ? 'mine' : ''}`}
                            key={item.key}
                            id={`ci-${s.id}-${item.key}`}
                          >
                            <button
                              className={`check-box ${item.done ? 'on' : ''}`}
                              disabled={!mine || busy === item.key}
                              onClick={() => toggleItem(item)}
                              title={mine ? 'Marcar / reabrir' : `Solo ${getRole(item.role).label} o alguien con permiso global`}
                            >
                              {item.done ? '✓' : ''}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="row wrap" style={{ gap: 8 }}>
                                <span className="check-label">{item.label}</span>
                                <RoleBadge role={item.role} />
                                {item.done && item.doneBy && (
                                  <span className="muted-2" style={{ fontSize: 11 }}>✓ {item.doneBy}</span>
                                )}
                              </div>
                              {item.note && !mine && <div className="check-note">{item.note}</div>}
                              {mine && (
                                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                                  <input
                                    className="mini grow"
                                    placeholder="Detalle / evidencia (opcional)…"
                                    value={notes[item.key] ?? item.note ?? ''}
                                    onChange={(e) => setNotes((n) => ({ ...n, [item.key]: e.target.value }))}
                                  />
                                  <button className="btn sm ghost" disabled={busy === item.key} onClick={() => saveNote(item)}>
                                    Guardar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Historias de usuario */}
          <Card title={`Historias de usuario (${task.userStories?.length || 0})`} hint="Formato: Como… quiero… para…">
            {(!task.userStories || task.userStories.length === 0) ? (
              <Empty>Esta tarea aún no tiene historias de usuario.</Empty>
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                {task.userStories.map((us) => (
                  <div key={us.id} className="story-card">
                    <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                      <span className="mono muted-2">{us.id}</span>
                      <StatusBadge status={us.status} />
                    </div>
                    <p className="story-text">
                      <strong>Como</strong> {us.asA}, <strong>quiero</strong> {us.iWant}, <strong>para</strong> {us.soThat}.
                    </p>
                    <div className="section-title" style={{ margin: '6px 0 6px' }}>Criterios de aceptación</div>
                    <ul className="ac-list">
                      {(us.ac || []).map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          {/* Fase actual */}
          <Card title="Fase actual" hint={stage.output}>
            <div className="row" style={{ gap: 12 }}>
              <div className="phase-big">{stage.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{stage.label}</div>
                <div className="muted-2" style={{ fontSize: 12 }}>
                  {currentComplete ? 'Checklist de la etapa completo ✓' : `${currentDone}/${currentItems.length} puntos completados`}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Bar value={currentItems.length ? Math.round((currentDone / currentItems.length) * 100) : 0}
                tone={currentComplete ? 'ok' : ''} />
            </div>
            {isBlocked && task.blockedReason && (
              <div className="badge danger" style={{ marginTop: 12, whiteSpace: 'normal' }}>⛔ {task.blockedReason}</div>
            )}
          </Card>

          {/* Sprint */}
          <SprintCard task={task} project={project} sprint={sprint} onChanged={reload} />

          {/* Cambios de fecha de entrega (motivo trazable) */}
          <Card
            title={`Cambios de entrega (${data.changes?.length || 0})`}
            hint="Toda modificación de la fecha de entrega queda identificada"
            actions={task.dueDate ? (
              <button className="btn sm primary" onClick={() => setRescheduleOpen(true)}>✎ Reprogramar</button>
            ) : null}
          >
            {!data.changes || data.changes.length === 0 ? (
              <Empty>Sin cambios de entrega registrados. Usa “✎ Reprogramar” para mover la fecha con su motivo.</Empty>
            ) : (
              <ChangeLog changes={data.changes} />
            )}
          </Card>

          {/* Bloqueos (con autorización del portafolio / PM / admin) */}
          <Card
            title={`Bloqueos (${data.blocks?.length || 0})`}
            hint="Bloquear requiere autorización de LPM, Product Management, Admin o permiso de aprobar bloqueos"
          >
            {(!data.blocks || data.blocks.length === 0) ? (
              <Empty>Sin solicitudes de bloqueo. Usa “⛔ Bloquear” para levantar una solicitud.</Empty>
            ) : (
              <div className="list" style={{ gap: 8 }}>
                {data.blocks.map((b) => {
                  const tone = b.status === 'approved' ? 'ok' : b.status === 'rejected' ? 'danger' : 'warn';
                  const label = b.status === 'approved' ? 'Autorizado' : b.status === 'rejected' ? 'Rechazado' : 'Por autorizar';
                  const pending = b.status === 'pending';
                  return (
                    <div className="list-item audit-item" key={b.id} style={{ display: 'block' }}>
                      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <div className="row wrap" style={{ gap: 8 }}>
                          <span className="mono muted-2" style={{ fontSize: 11 }}>{b.id}</span>
                          <Badge tone={tone} dot>{label}</Badge>
                        </div>
                        <span className="mono muted-2" style={{ fontSize: 11 }}>{b.at?.replace('T', ' ').slice(0, 16)}</span>
                      </div>
                      <div className="li-sub" style={{ whiteSpace: 'normal', marginTop: 4 }}>
                        “{b.reason}” · pedido por {b.requester} <RoleBadge role={b.requesterRole} />
                        {b.decidedBy ? <div className="muted-2">Resuelto por {b.decidedBy} <RoleBadge role={b.decidedRole} />{b.decisionNote ? ` · ${b.decisionNote}` : ''}</div> : null}
                      </div>
                      {pending && data.canApproveBlocks && (
                        <div className="row wrap" style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
                          <input
                            className="grow mini"
                            placeholder="Nota de la decisión (opcional)"
                            value={blockNote[b.id] || ''}
                            onChange={(e) => setBlockNote((s) => ({ ...s, [b.id]: e.target.value }))}
                          />
                          <button className="btn danger sm" disabled={busy === `blk-${b.id}`} onClick={() => decideBlock(b, false)}>✕ Rechazar</button>
                          <button className="btn ok sm" disabled={busy === `blk-${b.id}`} onClick={() => decideBlock(b, true)}>✓ Autorizar</button>
                        </div>
                      )}
                      {pending && !data.canApproveBlocks && (
                        <div className="muted-2" style={{ fontSize: 11.5, marginTop: 6 }}>
                          Pendiente de autorización por LPM, Product Management o el Admin.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Bitácora del checklist (quién, cuándo, qué) */}
          <Card
            title="Bitácora y auditoría"
            hint="Fecha/hora, persona y movimiento registrados de cada cambio"
          >
            {(!task.auditLog || task.auditLog.length === 0) ? (
              <Empty>Sin actividad registrada todavía.</Empty>
            ) : (
              <div className="list" style={{ gap: 8 }}>
                {[...task.auditLog].reverse().map((e) => (
                  <div className="list-item audit-item" key={e.id}>
                    <div className="li-main">
                      <div className="li-title">{e.actor || '—'} {e.role ? <RoleBadge role={e.role} /> : null}</div>
                      <div className="li-sub">{e.note || `${e.type} · ${e.action}`}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Badge tone={auditTone(e)}>{auditLabel(e)}</Badge>
                      <div className="mono muted-2" style={{ fontSize: 11 }}>{e.at?.replace('T', ' ').slice(0, 16)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Criterios de aceptación */}
          <Card title="Criterios de aceptación de la tarea">
            {(!task.ac || task.ac.length === 0) ? (
              <Empty>Sin criterios de aceptación a nivel de tarea.</Empty>
            ) : (
              <ul className="ac-list">{task.ac.map((a, i) => <li key={i}>{a}</li>)}</ul>
            )}
          </Card>

          {/* Dependencias */}
          <Card title="Dependencias">
            {(!task.dependencies || task.dependencies.length === 0) ? (
              <Empty>Sin dependencias registradas.</Empty>
            ) : (
              <div className="tag-list">
                {task.dependencies.map((d) => <Badge key={d} tone="warn">🔗 {d}</Badge>)}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

const AUDIT_LABEL = {
  done: 'Marcó ✓',
  reopened: 'Reabrió ↩',
  advance: 'Avanzó →',
  backward: 'Regresó ←',
  unblock: 'Reactivó ↻',
  block: 'Bloqueó ⛔',
  assign: 'Programó 🗓',
  unassign: 'Sin sprint',
  edit: 'Editó ✎',
  blockRequested: 'Solicitó ⛔',
  blockApproved: 'Autorizó ✓',
  blockRejected: 'Rechazó ✕',
  delivery: 'Entrega 🗓',
};
function auditLabel(e) {
  if (e.type === 'edit') return AUDIT_LABEL.edit;
  if (e.type === 'block') {
    if (e.action === 'requested') return AUDIT_LABEL.blockRequested;
    if (e.action === 'approved') return AUDIT_LABEL.blockApproved;
    if (e.action === 'rejected') return AUDIT_LABEL.blockRejected;
    return AUDIT_LABEL.block;
  }
  if (e.type === 'reschedule') return AUDIT_LABEL.delivery;
  if (e.action === 'unblock') return AUDIT_LABEL.unblock;
  if (e.action === 'done') return AUDIT_LABEL.done;
  if (e.action === 'reopened') return AUDIT_LABEL.reopened;
  if (e.type === 'blocked' || e.action === 'block') return AUDIT_LABEL.block;
  if (e.type === 'regression') return AUDIT_LABEL.backward;
  if (e.type === 'sprint') return e.action === 'assign' ? AUDIT_LABEL.assign : AUDIT_LABEL.unassign;
  return AUDIT_LABEL.advance;
}
function auditTone(e) {
  if (e.type === 'edit') return 'accent';
  if (e.type === 'reschedule') return 'info';
  if (e.type === 'block') {
    if (e.action === 'approved') return 'ok';
    if (e.action === 'rejected') return 'warn';
    return 'danger';
  }
  if (e.type === 'blocked' || e.action === 'block') return 'danger';
  if (e.type === 'regression' || e.action === 'reopened') return 'warn';
  if (e.type === 'checklist' && e.action === 'done') return 'ok';
  return 'info';
}

function SprintCard({ task, project, sprint, onChanged }) {
  const toast = useToast();
  const { data } = useApi(() => (project ? SprintModel.list(project.id) : Promise.resolve({ sprints: [] })), [project?.id]);
  const sprints = data?.sprints || [];

  const assign = async (sprintId) => {
    try {
      await TaskModel.assignSprint(task.id, sprintId || null);
      toast.success(sprintId ? 'Tarea asignada al sprint.' : 'Tarea devuelta al backlog.');
      onChanged();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Card title="Sprint">
      {sprint ? (
        <div style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <Badge tone="accent">{sprint.name}</Badge>
            <span className="muted-2" style={{ fontSize: 12 }}>{sprint.startDate} → {sprint.endDate}</span>
          </div>
          <div className="muted-2" style={{ fontSize: 12, marginTop: 4 }}>{sprint.goal}</div>
        </div>
      ) : (
        <Empty>Sin sprint asignado (vive en el backlog).</Empty>
      )}
      {project && (
        <Field label="Asignar a sprint">
          <select className="mini" value={task.sprintId || ''} onChange={(e) => assign(e.target.value)}>
            <option value="">— Sin sprint (backlog) —</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {s.startDate} ({s.cadence})</option>
            ))}
          </select>
        </Field>
      )}
    </Card>
  );
}
