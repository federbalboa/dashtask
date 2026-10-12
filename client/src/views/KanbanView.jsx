import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { useAuth } from '../controllers/AuthContext.jsx';
import { TaskModel, UserModel } from '../models/api.js';
import { Card, StatusBadge, ClassBadge, Badge, Empty, Field, Spinner } from './components/UI.jsx';

export default function KanbanView() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useApi(() => TaskModel.board(), []);
  const [creating, setCreating] = useState(false);

  const move = async (task, status) => {
    try {
      await TaskModel.move(task.id, status);
      toast.success(`${task.id} → ${status}`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <Spinner label="Cargando tablero…" />;
  const { board, totals } = data;

  return (
    <>
      <div className="page-head">
        <h1>Tablero Kanban</h1>
        <p>Flujo de trabajo con límites WIP (perspectiva Project Manager). Arrastra el estado desde cada tarjeta.</p>
      </div>

      <div className="toolbar">
        <Badge tone="gray">{totals.items} tarjetas</Badge>
        <Badge tone="accent">{totals.points} story points</Badge>
        {totals.blocked > 0 && <Badge tone="danger" dot>{totals.blocked} bloqueadas</Badge>}
        {totals.wipExceeded.length > 0 && <Badge tone="warn" dot>WIP excedido: {totals.wipExceeded.join(', ')}</Badge>}
        <div className="spacer" />
        <button className="btn primary" onClick={() => setCreating(true)}>+ Nueva tarea</button>
      </div>

      <div className="kanban">
        {board.map((col) => (
          <div className={`column ${col.overWip ? 'over' : ''}`} key={col.id}>
            <div className="column-head">
              <span className="c-title">{col.title}</span>
              <span className="c-count">{col.count}{col.wip ? ` / ${col.wip}` : ''}</span>
            </div>
            <div className="column-body">
              {col.items.length === 0 && <div className="empty" style={{ padding: 14, fontSize: 12 }}>—</div>}
              {col.items.map((t) => (
                <div className="kcard" key={t.id}>
                  <Link to={`/tasks/${t.id}`} className="k-title k-link">{t.title}</Link>
                  <div className="k-meta">
                    <ClassBadge value={t.class} />
                    <Badge tone="gray">{t.type}</Badge>
                    {t.storyPoints ? <span className="pts">{t.storyPoints} SP</span> : null}
                  </div>
                  {t.status === 'blocked' && t.blockedReason && (
                    <div className="badge danger" style={{ whiteSpace: 'normal' }}>⛔ {t.blockedReason}</div>
                  )}
                  <div className="k-foot">
                    <span className="id">{t.id}</span>
                    <span className="muted" style={{ fontSize: 11 }}>{t.assignee || 'Sin asignar'}</span>
                  </div>
                  <div className="move-row">
                    <select value={t.status} onChange={(e) => move(t, e.target.value)}>
                      {board.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <CreateTaskModal
          board={board}
          currentUser={user}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); reload(); toast.success('Tarea creada.'); }}
        />
      )}
    </>
  );
}

function CreateTaskModal({ board, currentUser, onClose, onSaved }) {
  const toast = useToast();
  const { data: usersData } = useApi(() => UserModel.list(), []);
  const [form, setForm] = useState({
    title: '', description: '', type: 'Story', status: 'backlog', class: 'Standard',
    priority: 'Media', storyPoints: '', assigneeId: '', team: 'Nébula',
    valueStream: 'Cliente Digital', pi: '', iteration: '', dueDate: '', labels: '', ac: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('El título es obligatorio.');
    setSaving(true);
    try {
      await TaskModel.create({
        ...form,
        storyPoints: form.storyPoints === '' ? null : Number(form.storyPoints),
        reporterId: currentUser.id,
        ac: form.ac.split('\n').map((s) => s.trim()).filter(Boolean),
        labels: form.labels.split(',').map((s) => s.trim()).filter(Boolean),
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
          <h3>Nueva tarea</h3>
          <button type="button" className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <Field label="Título *"><input value={form.title} onChange={set('title')} /></Field>
          <Field label="Descripción"><textarea rows={2} value={form.description} onChange={set('description')} /></Field>
          <div className="grid cols-3">
            <Field label="Tipo">
              <select value={form.type} onChange={set('type')}>
                <option>Story</option><option>Feature</option><option>Enabler</option><option>Defect</option>
              </select>
            </Field>
            <Field label="Estado">
              <select value={form.status} onChange={set('status')}>
                {board.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </Field>
            <Field label="Clase">
              <select value={form.class} onChange={set('class')}>
                <option>Standard</option><option>Fixed Date</option><option>Intangible</option><option>Expedite</option>
              </select>
            </Field>
          </div>
          <div className="grid cols-3">
            <Field label="Prioridad">
              <select value={form.priority} onChange={set('priority')}>
                <option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option>
              </select>
            </Field>
            <Field label="Story Points"><input type="number" value={form.storyPoints} onChange={set('storyPoints')} /></Field>
            <Field label="Responsable">
              <select value={form.assigneeId} onChange={set('assigneeId')}>
                <option value="">—</option>
                {(usersData?.users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid cols-3">
            <Field label="Equipo"><input value={form.team} onChange={set('team')} /></Field>
            <Field label="PI"><input value={form.pi} onChange={set('pi')} placeholder="PI-2026.1" /></Field>
            <Field label="Iteración"><input value={form.iteration} onChange={set('iteration')} placeholder="Iter 2" /></Field>
          </div>
          <Field label="Criterios de aceptación (uno por línea)"><textarea rows={2} value={form.ac} onChange={set('ac')} /></Field>
          <Field label="Etiquetas (coma)"><input value={form.labels} onChange={set('labels')} /></Field>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Crear tarea'}</button>
        </div>
      </form>
    </div>
  );
}
