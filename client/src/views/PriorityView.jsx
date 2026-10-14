import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { useAuth } from '../controllers/AuthContext.jsx';
import { TaskModel } from '../models/api.js';
import { Card, Badge, StatusBadge, Spinner, Empty } from './components/UI.jsx';

const REORDER_ROLES = ['product_manager', 'product_owner', 'lpm', 'rte', 'admin', 'epic_owner', 'business_owner'];

const PRIORITY_TONE = { 'Crítica': 'danger', Alta: 'warn', Media: 'info', Baja: 'gray' };

function wsjfTone(v) {
  if (v == null) return 'gray';
  if (v >= 9) return 'danger';
  if (v >= 6) return 'warn';
  if (v >= 4) return 'info';
  return 'gray';
}

const move = (list, fromId, toId) => {
  const ids = list.map((t) => t.id);
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from === -1 || to === -1 || from === to) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

function TaskRow({ t, index, total, draggable, onDragStart, onDragOver, onDrop, onDragEnd, dragging, onUp, onDown }) {
  return (
    <li
      className={`prio-row${dragging ? ' dragging' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <span className="prio-handle" title={draggable ? 'Arrastra para reordenar' : ''}>{draggable ? '⠿' : '·'}</span>
      <span className="prio-rank">{index + 1}</span>
      <div className="prio-main">
        <div className="prio-title">
          <span className="mono muted-2">{t.id}</span>
          <Link to={`/tasks/${t.id}`}>{t.title}</Link>
        </div>
        <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
          <Badge tone="gray">{t.type}</Badge>
          <Badge tone={PRIORITY_TONE[t.priority] || 'gray'}>{t.priority || 'Sin prioridad'}</Badge>
          {t.assignee ? <span className="muted-2">👤 {t.assignee}</span> : <span className="muted-2">Sin asignar</span>}
          {t.sprintId ? <span className="muted-2">🗓️ {t.sprintId}</span> : null}
        </div>
      </div>
      <div className="prio-metrics">
        <div className="prio-wsjf" title="WSJF = Costo del retraso ÷ Tamaño">
          <Badge tone={wsjfTone(t.wsjf)}><b>{t.wsjf ?? '—'}</b> WSJF</Badge>
        </div>
        <Badge tone="accent">{t.storyPoints ?? '—'} SP</Badge>
        <StatusBadge status={t.status} />
      </div>
      {draggable && (
        <div className="prio-move">
          <button className="btn xs ghost" title="Subir" disabled={index === 0} onClick={onUp}>▲</button>
          <button className="btn xs ghost" title="Bajar" disabled={index === total - 1} onClick={onDown}>▼</button>
        </div>
      )}
    </li>
  );
}

function Group({ group, canReorder, onReorder }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const scope = `project:${group.project.id}`;

  const drop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const next = move(group.tasks, dragId, targetId);
    onReorder(scope, next);
    setDragId(null);
    setOverId(null);
  };

  const swap = (id, dir) => {
    const idx = group.tasks.findIndex((t) => t.id === id);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= group.tasks.length) return;
    const next = [...group.tasks];
    [next[idx], next[to]] = [next[to], next[idx]];
    onReorder(scope, next);
  };

  return (
    <Card
      title={`${group.project.code} · ${group.project.name}`}
      hint={`${group.project.valueStream || 'Sin value stream'}${group.project.productManager ? ` · PM: ${group.project.productManager}` : ''}`}
      actions={(
        <div className="row" style={{ gap: 8 }}>
          <Badge tone="gray">{group.totals.tasks} tareas</Badge>
          <Badge tone="accent">{group.totals.points} SP</Badge>
          {group.totals.avgWsjf != null && <Badge tone="warn">WSJF medio {group.totals.avgWsjf}</Badge>}
        </div>
      )}
      style={{ marginBottom: 16 }}
    >
      {canReorder && (
        <div className="muted-2" style={{ fontSize: 11.5, marginBottom: 6 }}>
          Arrastra las filas (o usa ▲▼) para acomodar la prioridad. Por defecto se ordena por <b>WSJF</b> (Costo del retraso ÷ Tamaño).
        </div>
      )}
      <ul className="prio-list">
        {group.tasks.map((t, i) => (
          <TaskRow
            key={t.id}
            t={t}
            index={i}
            total={group.tasks.length}
            draggable={canReorder}
            dragging={dragId === t.id}
            onDragStart={() => setDragId(t.id)}
            onDragOver={(e) => { if (canReorder) { e.preventDefault(); setOverId(t.id); } }}
            onDrop={(e) => { if (canReorder) { e.preventDefault(); drop(t.id); } }}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
            onUp={() => swap(t.id, -1)}
            onDown={() => swap(t.id, 1)}
          />
        ))}
      </ul>
      {canReorder && (
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button
            className="btn ghost sm"
            onClick={() => onReorder(scope, [...group.tasks].sort((a, b) => (b.wsjf ?? -1) - (a.wsjf ?? -1) || (b.storyPoints ?? 0) - (a.storyPoints ?? 0)))}
          >
            ↺ Resetear a WSJF
          </button>
        </div>
      )}
    </Card>
  );
}

export default function PriorityView() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => TaskModel.prioritized(), []);
  const [groups, setGroups] = useState(null);
  const [saving, setSaving] = useState(false);
  const canReorder = REORDER_ROLES.includes(user?.role);

  useEffect(() => { if (data) setGroups(data.groups || []); }, [data]);

  const reorder = async (scope, orderedTasks) => {
    const ids = orderedTasks.map((t) => t.id);
    setGroups((gs) => gs.map((g) => (`project:${g.project.id}` === scope ? { ...g, tasks: orderedTasks } : g)));
    setSaving(true);
    try {
      await TaskModel.reorder(scope, ids);
    } catch (e) {
      toast.error(e.message);
      reload();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Calculando la prioridad (WSJF)…" />;
  if (error) return <div className="error-box">No se pudo cargar la priorización: {error.message}</div>;

  return (
    <>
      <div className="page-head">
        <h1>Priorización de tareas (WSJF)</h1>
        <p>
          Lista de todas las historias ordenadas por <b>prioridad</b> según el tipo de proyecto.
          El orden natural es <b>WSJF = Costo del retraso ÷ Tamaño del trabajo</b> (mayor WSJF = antes).
          {canReorder && ' Puedes arrastrar o usar ▲▼ para reordenar a mano; el orden queda guardado.'}
        </p>
      </div>

      <div className="toolbar">
        <Badge tone="warn">WSJF</Badge>
        <span className="muted-2" style={{ fontSize: 12 }}>
          Tamaño = Story Points · Costo del retraso = valor/urgencia del negocio
        </span>
        <div className="spacer" />
        {saving && <Badge tone="info" dot>Guardando orden…</Badge>}
      </div>

      {(!groups || groups.length === 0) ? (
        <Empty>No hay tareas para priorizar todavía.</Empty>
      ) : (
        groups.map((g) => <Group key={g.project.id} group={g} canReorder={canReorder} onReorder={reorder} />)
      )}
    </>
  );
}
