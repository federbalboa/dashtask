import { useState } from 'react';
import { useToast } from '../../controllers/ToastContext.jsx';
import { TaskModel } from '../../models/api.js';
import { Badge, Field } from './UI.jsx';
import { TASK_STAGES } from '../../config/taskFlow.js';
import { getRole } from '../../config/roles.js';
import { REASON_CODES } from '../../config/reschedule.js';

const CHECKLIST_ROLES = ['product_manager', 'product_owner', 'rte', 'system_architect', 'business_owner', 'developer', 'scrum_master', 'team_lead', 'tech_lead'];

/**
 * Modal de edición de la tarea: título, descripción, criterios de aceptación y
 * puntos del checklist por etapa (las "iteraciones" ampliables). Si se extiende
 * la fecha de entrega, el cambio se valida por control de cambios (portafolio).
 */
export default function TaskEditModal({ ctx, onClose, onSaved }) {
  const toast = useToast();
  const task = ctx.task;

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [ac, setAc] = useState([...(task.ac || [])]);
  const [checklist, setChecklist] = useState(
    (task.checklist || []).map((i) => ({ key: i.key, stage: i.stage, label: i.label, role: i.role }))
  );
  const [newDate, setDate] = useState('');
  const [reasonType, setReasonType] = useState('control_cambios');
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const current = task.dueDate || '';
  const dateChanged = !!date && date !== task.dueDate;

  const setItem = (idx, patch) =>
    setChecklist((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : i === 0 ? i : i)));
  const removeItem = (idx) => setChecklist((list) => list.filter((_, i) => i !== idx));
  const addItem = (stage) =>
    setChecklist((list) => [...list, { key: '', stage, label: '', role: (TASK_STAGES.find((s) => s.id === stage) || {}).checklist?.[0]?.role || 'developer' }]);

  const setAcItem = (idx, val) => setAc((a) => a.map((x, i) => (i === idx ? val : x)));
  const addAc = () => setAc((a) => [...a, '']);
  const removeAc = (i) => setAc((a) => a.filter((_, x) => x !== i));

  const submit = async () => {
    if (!title.trim()) return toast.error('El título no puede quedar vacío.');
    setBusy(true);
    try {
      const cleanAc = ac.map((x) => String(x).trim()).filter(Boolean);
      const cleanCl = checklist
        .map((i) => ({ key: i.key, stage: i.stage, label: String(i.label).trim(), role: i.role }))
        .filter((i) => i.label);
      const res = await TaskModel.editDetails(task.id, {
        title: title.trim(),
        description,
        ac: cleanAc,
        checklist: cleanCl,
      });

      toast.success(res.changed ? 'Tarea actualizada y registrada en la bitácora.' : 'Sin cambios que guardar.');
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitWithDate = async () => {
    if (!title.trim()) return toast.error('El título no puede quedar vacío.');
    if (!dueDate || dueDate === task.dueDate) return toast.error('Elige una fecha distinta a la actual.');
    if (!dateReasonCode) return toast.error('Indica el motivo del cambio de fecha.');
    setBusy(true);
    try {
      const cleanAc = ac.map((x) => String(x).trim()).filter(Boolean);
      const cleanCl = checklist
        .map((i) => ({ key: i.key, stage: i.stage, label: String(i.label).trim(), role: i.role }))
        .filter((i) => i.label);
      await TaskModel.editDetails(task.id, { title: title.trim(), description, ac: cleanAc, checklist: cleanCl });
      const r = await TaskModel.reschedule(task.id, { to: dueDate, reasonType, reasonCode: dateReasonCode, note });
      toast.success(r.pending
        ? 'Cambios guardados. La nueva fecha quedó como solicitud de control de cambios por autorizar.'
        : 'Cambios guardados y fecha de entrega actualizada.');
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal edit-task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="row" style={{ gap: 8 }}>
              <span className="mono muted-2">{task.id}</span>
              <Badge tone="accent">Edición de tarea</Badge>
            </div>
            <h3 style={{ marginTop: 6 }}>Editar tarea y sus iteraciones</h3>
            <div className="muted-2" style={{ fontSize: 12.5, marginTop: 3 }}>
              Cada cambio queda con fecha/hora y responsable en la bitácora de la tarea.
            </div>
          </div>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
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
                <input className="grow" value={a} onChange={(e) => setAc(a.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Criterio de aceptación" />
                <button className="btn xs danger" onClick={() => setAc(a.filter((_, j) => j !== i))} title="Quitar">✕</button>
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
              const items = checklist.map((it, idx) => ({ ...it, idx })).filter((it) => it.stage === s.id);
              return (
                <div key={s.id} className="edit-stage">
                  <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span>{s.icon}</span>
                    <strong>{s.label}</strong>
                    <Badge tone="gray">{items.length} punto(s)</Badge>
                  </div>
                  <div className="stack" style={{ gap: 6 }}>
                    {items.map((it) => (
                      <div className="row wrap" key={it.idx} style={{ gap: 8 }}>
                        <input
                          className="grow"
                          value={it.label}
                          onChange={(e) => setChecklist(checklist.map((x, j) => (j === it.idx ? { ...x, label: e.target.value } : x)))}
                          placeholder="Texto del punto"
                        />
                        <select
                          className="mini"
                          value={it.role}
                          onChange={(e) => setChecklist(checklist.map((x, j) => (j === it.idx ? { ...x, role: e.target.value } : x)))}
                        >
                          {CHECKLIST_ROLES.map((r) => <option key={r} value={r}>{getRole(r).label}</option>)}
                        </select>
                        <button className="btn xs danger" onClick={() => setChecklist(checklist.filter((_, j) => j !== it.idx))} title="Quitar punto">✕</button>
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
              value={date || ''}
              min={task.dueDate || undefined}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          {date && date !== task.dueDate && (
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
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={() => (date && date !== task.dueDate ? submitWithDate() : submit())}>
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
