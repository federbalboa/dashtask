import { Link, useParams } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { ProjectModel } from '../models/api.js';
import { Card, Badge, Bar, Empty, Spinner, RoleBadge } from './components/UI.jsx';
import TaskLine from './components/TaskLine.jsx';

export default function ProjectDetailView() {
  const { id } = useParams();
  const { data, loading, error } = useApi(() => ProjectModel.get(id), [id]);

  if (loading) return <Spinner label="Cargando proyecto…" />;
  if (error) return <div className="error-box">No se encontró el proyecto: {error.message}</div>;

  const { project } = data;

  return (
    <>
      <div className="row wrap muted-2" style={{ fontSize: 12.5, marginBottom: 14, gap: 8 }}>
        <Link to="/backlog">Backlog</Link>
        <span>/</span><span className="mono">{project.id}</span>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div className="row wrap" style={{ justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
              <Badge tone="accent">{project.code}</Badge>
              <span className="mono muted-2">{project.id}</span>
              <Badge tone={project.status === 'In Progress' ? 'ok' : 'gray'} dot>{project.status}</Badge>
            </div>
            <h1 style={{ fontSize: 26 }}>{project.name}</h1>
            <p className="muted" style={{ marginTop: 8, maxWidth: 720 }}>{project.description}</p>
            <div className="row wrap" style={{ gap: 16, marginTop: 12 }}>
              <span className="row" style={{ gap: 8 }}><span className="muted-2" style={{ fontSize: 12 }}>Owner:</span><RoleBadge role={project.ownerRole} full /><span>{project.owner}</span></span>
              <span className="muted-2" style={{ fontSize: 12 }}>Product Mgmt: {project.productManager}</span>
              <span className="muted-2" style={{ fontSize: 12 }}>Value Stream: {project.valueStream}</span>
            </div>
          </div>
          <div style={{ minWidth: 220 }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span className="muted">Avance del proyecto</span>
              <span>{project.progress.done}/{project.progress.total} · {project.progress.percent}%</span>
            </div>
            <Bar value={project.progress.percent} tone={project.progress.percent === 100 ? 'ok' : ''} />
            <div className="muted-2" style={{ fontSize: 12, marginTop: 8 }}>
              {project.epicCount} épicas · inicio {project.startDate} → {project.targetDate}
            </div>
          </div>
        </div>
      </Card>

      <div className="section-title">Épicas del proyecto</div>
      {project.epics.length === 0 && <Card><Empty>Este proyecto aún no tiene épicas.</Empty></Card>}

      {project.epics.map((e) => (
        <Card key={e.id} style={{ marginBottom: 16 }}>
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div className="row" style={{ gap: 10 }}>
              <span>📘</span>
              <Link to={`/epics/${e.id}`}><strong style={{ fontSize: 15 }}>{e.name}</strong></Link>
              <span className="mono muted-2" style={{ fontSize: 11 }}>{e.id}</span>
              <Badge tone={e.status === 'In Progress' ? 'ok' : 'gray'}>{e.status}</Badge>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span className="muted-2" style={{ fontSize: 12 }}>{e.progress.done}/{e.progress.total}</span>
              <div style={{ width: 90 }}><Bar value={e.progress.percent} tone={e.progress.percent === 100 ? 'ok' : ''} /></div>
            </div>
          </div>
          {e.tasks.length === 0 ? (
            <Empty>Sin tareas.</Empty>
          ) : (
            <div className="list" style={{ border: '1px solid var(--border-soft)', borderRadius: 10, overflow: 'hidden' }}>
              {e.tasks.map((t) => <TaskLine key={t.id} task={t} />)}
            </div>
          )}
        </Card>
      ))}

      {project.orphanTasks.length > 0 && (
        <Card title="Tareas sin épica" hint={`${project.orphanTasks.length}`} tight>
          <div className="list">{project.orphanTasks.map((t) => <TaskLine key={t.id} task={t} />)}</div>
        </Card>
      )}
    </>
  );
}
