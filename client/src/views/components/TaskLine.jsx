import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, StatusBadge } from './UI.jsx';

/** Línea de tarea con enlace a su página de detalle (single page). */
export default function TaskLine({ task, showPoints = true, onReschedule, onPoints }) {
  const [editing, setEditing] = useState(false);
  const [pts, setPts] = useState('');
  const overdue = task.dueDate && task.status !== 'done' && task.status !== 'release'
    && new Date(task.dueDate) < new Date(Date.now() - 86400000);

  const savePoints = () => {
    const n = Number(pts);
    if (!Number.isNaN(n) && n >= 0) onPoints?.(task, n);
    setEditing(false);
  };

  return (
    <Link to={`/tasks/${task.id}`} className="list-item" style={{ color: 'inherit' }}>
      <div className="li-main">
        <div className="li-title">
          <span className="mono muted-2">{task.id}</span>
          <span style={{ margin: '0 8px' }}>·</span>
          {task.title}
        </div>
        <div className="li-sub row wrap" style={{ gap: 8, marginTop: 4 }}>
          <Badge tone="gray">{task.type}</Badge>
          {task.assignee ? <span>👤 {task.assignee}</span> : <span className="muted-2">Sin asignar</span>}
          {task.userStories?.length ? <span>📝 {task.userStories.length} historias</span> : null}
          {task.ac?.length ? <span>✅ {task.ac.length} AC</span> : null}
          {task.dueDate ? (
            <span className={`badge ${overdue ? 'danger' : 'gray'}`} style={{ gap: 4 }}>
              📅 {task.dueDate} {overdue ? '· atrasada' : ''}
            </span>
          ) : null}
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {showPoints &&
          (editing ? (
            <span className="row" style={{ gap: 4 }} onClick={(e) => e.preventDefault()}>
              <input
                className="mini"
                type="number"
                min="0"
                autoFocus
                style={{ width: 62 }}
                placeholder={task.storyPoints ?? 'SP'}
                value={pts}
                onChange={(e) => setPts(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') savePoints(); if (e.key === 'Escape') setEditing(false); }}
                onBlur={savePoints}
              />
            </span>
          ) : (
            <Badge tone="accent" >
              <span
                title={onPoints ? 'Editar story points (esfuerzo)' : ''}
                onClick={(e) => { e.preventDefault(); if (onPoints) { setEditing(true); setPts(task.storyPoints ?? ''); } }}
                style={{ cursor: onPoints ? 'pointer' : 'default' }}
              >
                {task.storyPoints ?? '—'} SP{onPoints ? ' ✎' : ''}
              </span>
            </Badge>
          ))}
        {onReschedule && task.dueDate && (
          <button
            className="btn xs ghost"
            title="Reprogramar la entrega identificando el motivo"
            onClick={(e) => { e.preventDefault(); onReschedule(task); }}
          >
            📅
          </button>
        )}
        <StatusBadge status={task.status} />
      </div>
    </Link>
  );
}