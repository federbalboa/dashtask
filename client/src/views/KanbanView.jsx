import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { useAuth } from '../controllers/AuthContext.jsx';
import { TaskModel, UserModel, SettingsModel } from '../models/api.js';
import { Badge, Spinner, Field, ClassBadge } from './components/UI.jsx';
const MOVE_ROLES = ['product_manager', 'product_owner', 'scrum_master', 'team_lead', 'tech_lead', 'developer', 'rte', 'lpm', 'admin', 'system_architect', 'epic_owner', 'business_owner'];

export default function KanbanView() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, reload } = useApi(() => TaskModel.board(), []);
  const { data: settingsData } = useApi(() => SettingsModel.get(), []);
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [order, setOrder] = useState({});

  useEffect(() => {
    if (settingsData?.settings?.taskOrder) setOrder(settingsData.settings.taskOrder);
  }, [settingsData]);

  const canMove = MOVE_ROLES.includes(user?.role);

  const move = async (task, status) => {
    if (!canMove || !task || task.status === status) return;
    try {
      await TaskModel.move(task.id, status);
      toast.success(`${task.id} → ${status}`);
      reload();
    } catch (e) {
      showMoveError(e, status);
    }
  };

  const showMoveError = (e, status) => {
    if (e?.status === 409 && e.data?.wip) {
      const w = e.data.wip;
      toast.error(`"${w.title}" está en ${w.count}/${w.limit} (límite WIP). ${e.message}`);
    } else {
      toast.error(e.message);
    }
  };

  const sortedItems = (col) => {
    const ids = order[`column:${col.id}`] || [];
    const idx = new Map(ids.map((id, i) => [id, i]));
    return [...col.items].sort((a, b) => {
      const ai = idx.has(a.id) ? idx.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bi = idx.has(b.id) ? idx.get(b.id) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  };

  const findTask = (id) => (data?.board || []).flatMap((c) => c.items).find((t) => t.id === id);

  const reorderInColumn = async (col, beforeId) => {
    const ids = sortedItems(col).map((t) => t.id).filter((id) => id !== dragId);
    const at = beforeId ? ids.indexOf(beforeId) : ids.length;
    ids.splice(at < 0 ? ids.length : at, 0, dragId);
    const scope = `column:${col.id}`;
    setOrder((o) => ({ ...o, [scope]: ids }));
    try {
      await TaskModel.reorder(scope, ids);
    } catch (e) {
      toast.error(e.message);
      reload();
    }
  };

  const onDropCard = async (col, card) => {
    const task = findTask(dragId);
    setOverCol(null);
    if (!task) return;
    if (task.status !== col.id) return move(task, col.id);
    return reorderInColumn(col, card.id);
  };

  const onDropColumn = async (col) => {
    const task = findTask(dragId);
    setOverCol(null);
    if (!task) return;
    if (task.status !== col.id) return move(task, col.id);
    return reorderInColumn(col, null);
  };

  if (loading) return <Spinner label="Cargando tablero…" />;
  const { board, totals } = data;

  return (
    <>
      <div className="page-head">
        <h1>Tablero Kanban</h1>
        <p>Flujo de trabajo con límites WIP. Arrastra una tarjeta a otra columna para cambiar su etapa, o dentro de la columna para reordenarla.</p>
      </div>

      <div className="toolbar">
        <Badge tone="gray">{totals.items} tarjetas</Badge>
        <Badge tone="accent">{totals.points} story points</Badge>
        {totals.blocked > 0 && <Badge tone="danger" dot>{totals.blocked} bloqueadas</Badge>}
        {totals.wipExceeded.length > 0 && <Badge tone="warn" dot>WIP excedido: {totals.wipExceeded.join(', ')}</Badge>}
        <div className="spacer" />
        <button className="btn primary" onClick={() => setCreating(true)}>+ Nueva tarea</button>
      </div>

      <div className="wip-note">
        <b>¿Qué es el límite WIP?</b> Es el tope de tarjetas por columna (Work in Progress = trabajo en curso).
        Sirve para no empezar más de lo que el equipo puede terminar. Se cuenta la columna completa, por eso
        puedes ver “9 / 5”. Si está lleno, no deja entrar otra tarjeta hasta que liberes espacio. Configúralo en <Link to="/admin">Admin</Link>.
      </div>

      <div className="kanban">
        {board.map((col) => {
          const items = sortedItems(col);
          const full = col.wip != null && col.count >= col.wip;
          return (
            <div className={`column ${col.overWip ? 'over' : ''} ${overCol === col.id ? 'drop-target' : ''}`} key={col.id}>
              <div className="column-head">
                <span className="c-title">{col.title}</span>
                <span className="c-count" title={col.wip != null ? `Límite WIP: ${col.wip}` : 'Sin límite'}>
                  {col.count}{col.wip != null ? ` / ${col.wip}` : ''}
                </span>
              </div>
              {col.wip != null && (
                <div className="column-wipbar">
                  <span className={`wip-fill ${col.overWip ? 'over' : col.count >= col.wip ? 'full' : ''}`} style={{ width: `${Math.min(100, (col.count / col.wip) * 100)}%` }} />
                </div>
              )}
              <div
                className="column-body"
                onDragOver={canMove ? (e) => { e.preventDefault(); setOverCol(col.id); } : undefined}
                onDragLeave={canMove ? () => setOverCol((c) => (c === col.id ? null : c)) : undefined}
                onDrop={canMove ? (e) => { e.preventDefault(); onDropColumn(col); } : undefined}
              >
                {col.items.length === 0 && <div className="empty" style={{ padding: 14, fontSize: 12 }}>—</div>}
                {sortedItems(col).map((t) => (
                  <div
                    className={`kcard ${dragId === t.id ? 'dragging' : ''}`}
                    key={t.id}
                    draggable={canMove}
                    onDragStart={canMove ? () => setDragId(t.id) : undefined}
                    onDragEnd={canMove ? () => { setDragId(null); setOverCol(null); } : undefined}
                    onDragOver={canMove ? (e) => { e.preventDefault(); } : undefined}
                    onDrop={canMove ? (e) => { e.preventDefault(); e.stopPropagation(); onDropCard(col, t); } : undefined}
                  >
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
                    {canMove && (
                      <div className="move-row">
                        <select value={t.status} onChange={(e) => move(t, e.target.value)}>
                          {board.map((c) => (
                            <option key={c.id} value={c.id} disabled={c.id !== t.status && c.wip != null && c.count >= c.wip}>
                              {c.title}{c.wip != null ? ` (${c.count}/${c.wip})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
                {col.wip != null && col.count >= col.wip && (
                  <div className="wip-full-hint">
                    {col.overWip ? `En ${col.count}/${col.wip}: por encima del límite WIP.` : `En el límite WIP (${col.wip}). No entran más tareas.`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
