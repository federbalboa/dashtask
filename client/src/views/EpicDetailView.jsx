import { Link, useParams } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { EpicModel } from '../models/api.js';
import { Card, Badge, Bar, Empty, Spinner, RoleBadge } from './components/UI.jsx';
import TaskLine from './components/TaskLine.jsx';

export default function EpicDetailView() {
  const { id } = useParams();
  const { data, loading, error } = useApi(() => EpicModel.get(id), [id]);

  if (loading) return <Spinner label="Cargando épica…" />;
  if (error) return <div className="error-box">No se encontró la épica: {error.message}</div>;

  const { epic } = data;
  const lc = epic.leanCanvas || {};

  return (
    <>
      <div className="row wrap muted-2" style={{ fontSize: 12.5, marginBottom: 14, gap: 8 }}>
        <Link to="/backlog">Backlog</Link>
        {epic.project && <><span>/</span><Link to={`/projects/${epic.project.id}`}>{epic.project.name}</Link></>}
        <span>/</span><span className="mono">{epic.id}</span>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div className="row wrap" style={{ justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
              <span className="mono muted-2">{epic.id}</span>
              <Badge tone={epic.status === 'In Progress' ? 'ok' : 'gray'} dot>{epic.status}</Badge>
              <Badge tone="accent">Business Value {epic.businessValue}</Badge>
              <Badge tone="info">WSJF {epic.wsjf}</Badge>
            </div>
            <h1 style={{ fontSize: 26 }}>📘 {epic.name}</h1>
            <p className="muted" style={{ marginTop: 8, maxWidth: 720 }}>{epic.description}</p>
            <div className="row" style={{ gap: 10, marginTop: 12 }}>
              <span className="muted-2" style={{ fontSize: 12 }}>Epic Owner:</span>
              <RoleBadge role={epic.ownerRole} full />
              <span>{epic.owner}</span>
            </div>
          </div>
          <div style={{ minWidth: 220 }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span className="muted">Avance de la épica</span>
              <span>{epic.progress.done}/{epic.progress.total} · {epic.progress.percent}%</span>
            </div>
            <Bar value={epic.progress.percent} tone={epic.progress.percent === 100 ? 'ok' : ''} />
            <div className="muted-2" style={{ fontSize: 12, marginTop: 8 }}>{epic.progress.points} story points</div>
          </div>
        </div>
      </Card>

      <div className="grid cols-2">
        <Card title="Lean Canvas (resumen)">
          <dl className="kv">
            <dt>Problema</dt><dd>{lc.problem || '—'}</dd>
            <dt>Solución</dt><dd>{lc.solution || '—'}</dd>
            <dt>MVP</dt><dd>{lc.mvp || '—'}</dd>
            <dt>Métrica</dt><dd>{lc.metric || '—'}</dd>
          </dl>
        </Card>

        <Card title="Criterios de aceptación de la épica">
          {(!epic.acceptanceCriteria || epic.acceptanceCriteria.length === 0) ? (
            <Empty>Sin criterios definidos.</Empty>
          ) : (
            <ul className="ac-list">
              {epic.acceptanceCriteria.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
          <div className="tag-list" style={{ marginTop: 12 }}>
            {(epic.labels || []).map((l) => <Badge key={l} tone="info">{l}</Badge>)}
          </div>
        </Card>
      </div>

      <div className="section-title">Historias y tareas de la épica</div>
      <Card tight>
        {epic.tasks.length === 0 ? (
          <Empty>Esta épica aún no tiene tareas.</Empty>
        ) : (
          <div className="list">{epic.tasks.map((t) => <TaskLine key={t.id} task={t} />)}</div>
        )}
      </Card>
    </>
  );
}
