import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { ProjectModel, TaskModel } from '../models/api.js';
import { Card, Badge, Bar, Empty, Spinner } from './components/UI.jsx';
import TaskLine from './components/TaskLine.jsx';
import RescheduleModal from './components/RescheduleModal.jsx';

export default function BacklogView() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => ProjectModel.tree(), []);
  const [openEpics, setOpenEpics] = useState({});
  const [rep, setRep] = useState(null);

  const toggle = (id) => setOpenEpics((s) => ({ ...s, [id]: !s[id] }));

  const changePoints = async (task, points) => {
    try {
      await TaskModel.update(task.id, { storyPoints: points });
      toast.success(`${task.id} · esfuerzo ajustado a ${points} SP.`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const lineProps = {
    onReschedule: setRep,
    onPoints: changePoints,
  };

  if (loading) return <Spinner label="Construyendo el backlog…" />;
  if (error) return <div className="error-box">No se pudo cargar el backlog: {error.message}</div>;

  const { projects = [], unassigned = [] } = data || {};

  return (
    <>
      <div className="page-head">
        <h1>Backlog por proyecto y épica</h1>
        <p>
          Estructura Proyecto → Épica → Tarea. Haz clic en cualquier tarea para abrir su página. Los
          <b> story points</b> (esfuerzo) se editan en línea y la <b>fecha de entrega</b> (cuándo) se
          reprograma siempre identificando el motivo.
        </p>
      </div>

      {projects.map((p) => (
        <Card key={p.id} className="project-block" style={{ marginBottom: 18 }}>
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="row" style={{ gap: 10 }}>
                <Badge tone="accent">{p.code}</Badge>
                <Link to={`/projects/${p.id}`}><h3 style={{ fontSize: 17 }}>{p.name}</h3></Link>
                <Badge tone={p.status === 'In Progress' ? 'ok' : 'gray'} dot>{p.status}</Badge>
              </div>
              <div className="muted-2" style={{ fontSize: 12, marginTop: 6 }}>
                {p.id} · {p.valueStream} · {p.epicCount} épicas · {p.progress.total} tareas
              </div>
            </div>
            <div style={{ minWidth: 220 }}>
              <div className="row between" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span className="muted">Progreso</span>
                <span>{p.progress.done}/{p.progress.total} · {p.progress.percent}%</span>
              </div>
              <Bar value={p.progress.percent} tone={p.progress.percent === 100 ? 'ok' : ''} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {p.epics.length === 0 && p.orphanTasks.length === 0 && <Empty>Sin tareas en este proyecto.</Empty>}

            {p.epics.map((e) => {
              const open = openEpics[e.id] !== false; // abierto por defecto
              return (
                <div key={e.id} className="epic-block">
                  <div className="epic-head" onClick={() => toggle(e.id)}>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="muted-2">{open ? '▾' : '▸'}</span>
                      <span>📘</span>
                      <div>
                        <div className="row" style={{ gap: 8 }}>
                          <span className="mono muted-2" style={{ fontSize: 11 }}>{e.id}</span>
                          <Link to={`/epics/${e.id}`} onClick={(ev) => ev.stopPropagation()}>
                            <strong>{e.name}</strong>
                          </Link>
                          <Badge tone={e.status === 'In Progress' ? 'ok' : 'gray'}>{e.status}</Badge>
                        </div>
                        <div className="muted-2" style={{ fontSize: 11.5, marginTop: 2 }}>
                          Epic Owner: {e.owner} · {e.tasks.length} tareas · BV {e.businessValue}
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="muted-2" style={{ fontSize: 12 }}>{e.progress.percent}%</span>
                      <div style={{ width: 90 }}><Bar value={e.progress.percent} tone={e.progress.percent === 100 ? 'ok' : ''} /></div>
                    </div>
                  </div>
                  {open && (
                    <div className="list" style={{ borderTop: '1px solid var(--border-soft)' }}>
                      {e.tasks.length === 0 ? <div className="empty">Sin tareas en esta épica.</div> : e.tasks.map((t) => <TaskLine key={t.id} task={t} {...lineProps} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {p.orphanTasks.length > 0 && (
              <div className="epic-block">
                <div className="epic-head" style={{ cursor: 'default' }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span>📄</span>
                    <strong>Tareas sin épica</strong>
                    <Badge tone="gray">{p.orphanTasks.length}</Badge>
                  </div>
                </div>
                <div className="list" style={{ borderTop: '1px solid var(--border-soft)' }}>
                  {p.orphanTasks.map((t) => <TaskLine key={t.id} task={t} {...lineProps} />)}
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}

      {unassigned.length > 0 && (
        <Card title="Tareas sin proyecto asignado" hint={`${unassigned.length} tareas`} tight>
          <div className="list">{unassigned.map((t) => <TaskLine key={t.id} task={t} {...lineProps} />)}</div>
        </Card>
      )}

      {rep && (
        <RescheduleModal
          kind="task"
          item={{ id: rep.id, currentDate: rep.dueDate }}
          onClose={() => setRep(null)}
          onChanged={reload}
        />
      )}
    </>
  );
}