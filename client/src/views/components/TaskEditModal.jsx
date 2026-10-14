import { useState } from 'react';
import { useToast } from '../../controllers/ToastContext.jsx';
import { useApi } from '../../controllers/useApi.js';
import { TaskModel, UserModel, SprintModel } from '../../models/api.js';
import { Badge, Field } from './UI.jsx';
import { TASK_STAGES } from '../../config/taskFlow.js';
import { getRole } from '../../config/roles.js';
import { REASON_CODES } from '../../config/reschedule.js';

const CHECKLIST_ROLES = ['product_manager', 'product_owner', 'rte', 'system_architect', 'business_owner', 'developer', 'scrum_master', 'team_lead', 'tech_lead'];

const sameList = (a = [], b = []) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Modal de edición de la tarea. Reúne en un solo lugar:
 *  - Asignación: responsable, sprint, story points y recursos requeridos.
 *  - Contenido: título, descripción, criterios de aceptación y checklist por etapa.
 *  - Fecha de entrega: si se extiende, el cambio lo valida el portafolio (control de cambios).
 */
export default function TaskEditModal({ ctx, onClose, onSaved }) {
  const toast = useToast();
  const task = ctx.task || {};
  const project = ctx.project || null;

  const { data: usersData } = useApi(() => UserModel.list(), []);
  const users = usersData?.users || [];
  const { data: sprintData } = useApi(
    () => (ctx.project ? SprintModel.list(ctx.project.id) : Promise.resolve({ sprints: [] })),
    [ctx.project?.id]
  );
  const sprints = sprintData?.sprints || [];

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [ac, setAc] = useState([...(task.ac || [])]);
  const [checklist, setChecklist] = useState(
    (task.checklist || []).map((i) => ({ key: i.key, stage: i.stage, label: i.label, role: i.role }))
  );

  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
  const [sprintId, setSprintId] = useState(task.sprintId || '');
  const [storyPoints, setStoryPoints] = useState(task.storyPoints ?? '');
  const [requiredResources, setRequiredResources] = useState([...(task.requiredResources || [])]);

  const [newDate, setNewDate] = useState('');
  const [reasonType] = useState('control_cambios');
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));
  const dateChanged = !!newDate && newDate !== (task.dueDate || '');
  const sprintsAvailable = sprintData?.sprints || [];

  const addResource = (userId) => {
    if (!userId || requiredResources.some((r) => r.id === userId)) return;
    const u = usersById[userId];
    if (u) setRequiredResources((list) => [...list, { id: u.id, name: u.name }]);
  };

  const saveAssignment = async () => {
    const patch = {};
    const assignee = assigneeId ? usersById[assigneeId] : null;
    if ((task.assigneeId || '') !== (assigneeId || '')) {
      patch.assigneeId = assigneeId || null;
      patch.assignee = assignee?.name || '';
    }
    const currentSp = task.storyPoints ?? null;
    if (String(storyPoints) !== String(currentSp ?? '')) {
      patch.storyPoints = storyPoints === '' ? null : Number(storyPoints);
    }
    if (JSON.stringify(requiredResources) !== JSON.stringify(task.requiredResources || [])) {
      patch.requiredResources = requiredResources;
    }
    if (Object.keys(patch).length) await TaskModel.update(task.id, patch);
    if ((task.sprintId || '') !== (sprintId || '')) {
      await TaskModel.assignSprint(task.id, sprintId || null);
    }
  };

  const saveDetails = async () => {
    const cleanAc = ac.map((x) => String(x).trim()).filter(Boolean);
    const cleanCl = checklist
      .map((i) => ({ key: i.key, stage: i.stage, label: String(i.label).trim(), role: i.role }))
      .filter((i) => i.label);
    return TaskModel.editDetails(task.id, {
      title: title.trim(),
      description,
      ac: cleanAc,
      checklist: cleanCl,
    });
  };

  const submit = async () => {
    if (!title.trim()) return toast.error('El título no puede quedar vacío.');
    if (dateChanged && !reasonCode) return toast.error('Indica el motivo del cambio de fecha.');
    setBusy(true);
    try {
      await saveAssignment();
      const res = await saveDetails();
      if (dateChanged) {
        const r = await TaskModel.reschedule(task.id, {
          to: newDate, reasonType, reasonCode, note,
        });
        toast.success(r.pending
          ? 'Tarea actualizada. La nueva fecha quedó como solicitud de control de cambios por autorizar.'
          : 'Tarea actualizada y fecha de entrega aplicada.');
      } else {
        toast.success(res.changed ? 'Tarea actualizada y registrada en la bitácora.' : 'Tarea actualizada.');
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const resourceOptions = (users || []).filter((u) => !requiredResources.some((r) => r.id === u.id));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal edit-task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="row" style={{ gap: 8 }}>
              <span className="mono muted-2">{task.id}</span>
              <Badge tone="accent">Edición de tarea</Badge>
            </div>
            <h3 style={{ marginTop: 6 }}>Editar tarea, asignación e iteraciones</h3>
            <div className="muted-2" style={{ fontSize: 12.5, marginTop: 3 }}>
              Cada cambio queda con fecha/hora y responsable en la bitácora de la tarea.
            </div>
          </div>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Asignación */}
          <div className="section-title" style={{ marginTop: 0 }}>Asignación</div>
          <div className="grid cols-3">
            <Field label="Responsable">
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {(users || []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name} · {getRole(u.role).short}</option>
                ))}
              </select>
            </Field>
            <Field label="Sprint">
              {ctx.project ? (
                <select value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
                  <option value="">— Backlog (sin sprint) —</option>
                  {sprintsAvailable.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.startDate} → {s.endDate}</option>
                  ))}
                </select>
              ) : (
                <input value="Sin proyecto asociado" disabled />
              )}
            </Field>
            <Field label="Story Points">
              <input type="number" min="0" value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} placeholder="—" />
            </Field>
          </div>

          <Field label="Recursos requeridos (personas que apoyan la tarea)">
            <div className="stack" style={{ gap: 8 }}>
              {requiredResources.length === 0 && (
                <div className="muted-2" style={{ fontSize: 12.5 }}>Sin recursos adicionales.</div>
              )}
              {requiredResources.length > 0 && (
                <div className="row wrap" style={{ gap: 6 }}>
                  {requiredResources.map((r) => (
                    <span key={r.id} className="team-chip">
                      <span className="team-chip-name">👤 {r.name}</span>
                      <button
                        type="button"
                        className="team-chip-x"
                        title="Quitar recurso"
                        onClick={() => setRequiredResources((list) => list.filter((x) => x.id !== r.id))}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <select className="mini" value="" onChange={(e) => { addResource(e.target.value); e.target.value = ''; }}>
                <option value="">＋ Agregar recurso…</option>
                {resourceOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} · {getRole(u.role).short}</option>
                ))}
              </select>
            </div>
          </Field>

          <div className="section-title" style={{ marginTop: 20 }}>Detalle de la tarea</div>
          <Field label="Título">
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Descripción">
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          {/* Criterios de aceptación */}
          <div className="section-title" style={{ marginTop: 20 }}>Criterios de aceptación</div>
          <div className="stack" style={{ gap: 8 }}>
            {ac.length === 0 && <div className="muted-2" style={{ fontSize: 12.5 }}>Sin criterios todavía.</div>}
            {ac.map((a, i) => (
              <div className="row" key={i} style={{ gap: 8 }}>
                <input className="grow" value={a} onChange={(e) => setAc(ac.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Criterio de aceptación" />
                <button className="btn xs danger" onClick={() => setAc(ac.filter((_, j) => j !== i))} title="Quitar">✕</button>
              </div>
            ))}
            <button className="btn sm ghost" onClick={() => setAc([...ac, ''])}>＋ Agregar criterio</button>
          </div>

          {/* Checklist por etapa (iteraciones ampliables) */}
          <div className="section-title" style={{ marginTop: 22 }}>
            Puntos del checklist por etapa
            <span className="muted-2" style={{ fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
              agrega o quita validaciones (iteraciones) en cada etapa
            </span>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            {TASK_STAGES.map((s) => {
              const items = checklist
                .map((i, idx) => ({ ...i, idx }))
                .filter((i) => i.stage === s.id);
              return (
                <div key={s.id} className="edit-stage">
                  <div className="row" style={{ gap: 8 }}>
                    <span>{s.icon}</span>
                    <strong>{s.label}</strong>
                    <Badge tone="gray">{items.length}</Badge>
                  </div>
                  <div className="stack" style={{ gap: 8, marginTop: 8 }}>
                    {items.map((i) => (
                      <div className="row" key={i.idx} style={{ gap: 8 }}>
                        <input
                          className="grow"
                          value={i.label}
                          onChange={(e) => setChecklist(checklist.map((x, j) => (j === i.idx ? { ...x, label: e.target.value } : x)))}
                          placeholder="Texto del punto"
                        />
                        <select
                          className="mini"
                          value={i.role}
                          onChange={(e) => setChecklist(checklist.map((x, j) => (j === i.idx ? { ...x, role: e.target.value } : x)))}
                        >
                          {CHECKLIST_ROLES.map((r) => <option key={r} value={r}>{getRole(r).label}</option>)}
                        </select>
                        <button className="btn xs danger" onClick={() => setChecklist(checklist.filter((_, j) => j !== i.idx))} title="Quitar punto">✕</button>
                      </div>
                    ))}
                    <button
                      className="btn sm ghost"
                      onClick={() => setChecklist([...checklist, { key: '', stage: s.id, label: '', role: s.checklist[0]?.role || 'developer' }])}
                    >
                      ＋ Agregar punto a “{s.label}”
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fecha de entrega (validación por control de cambios) */}
          <div className="section-title" style={{ marginTop: 22 }}>Fecha de entrega</div>
          <div className="hint" style={{ marginBottom: 8 }}>
            Actual: <b>{task.dueDate || 'sin fecha'}</b>. Si necesitas más iteraciones, puedes extender la entrega:
            el cambio se valida por <b>control de cambios</b> (lo autoriza el portafolio).
          </div>
          <Field label="Nueva fecha de entrega (opcional)">
            <input
              type="date"
              value={newDate}
              min={task.dueDate || undefined}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </Field>

          {dateChanged && (
            <>
              <Field label="Motivo del cambio de fecha *">
                <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
                  <option value="">Elegir motivo…</option>
                  {(REASON_CODES[reasonType] || []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </Field>
              <Field label="Contexto (recomendado)">
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Justifica la extensión para que el portafolio pueda autorizarla…" />
              </Field>
              <div className="cc-info" style={{ marginTop: 8 }}>
                <strong>🛂 Control de cambios</strong>
                <span>La nueva fecha <b>no se mueve</b> hasta que el equipo de portafolio la autorice.</span>
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn primary" disabled={busy} onClick={submit}>
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
