import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { SprintModel, ProjectModel } from '../models/api.js';
import { Card, Badge, Bar, Empty, Spinner, Field } from './components/UI.jsx';
import TaskLine from './components/TaskLine.jsx';

const CADENCE_LABEL = { weekly: 'Semanal', biweekly: 'Quincenal' };
const DAY_LABEL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SPRINT_TONE = { active: 'ok', planning: 'accent', completed: 'gray' };

export default function SprintsView() {
  const toast = useToast();
  const { data: projectsData } = useApi(() => ProjectModel.list(), []);
  const projects = projectsData?.projects || [];
  const [projectId, setProjectId] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState([]);
  const [target, setTarget] = useState('');

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const { data, loading, reload } = useApi(
    () => (projectId ? SprintModel.list(projectId) : Promise.resolve(null)),
    [projectId]
  );

  if (loading && !data) return <Spinner label="Cargando sprints…" />;

  const sprints = data?.sprints || [];
  const backlog = data?.backlog || [];
  const suggested = data?.suggested;
  const config = data?.sprintConfig;
  const project = projects.find((p) => p.id === projectId);

  const toggleSel = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const assignSelected = async () => {
    if (!target) return toast.error('Selecciona un sprint destino.');
    if (!selected.length) return toast.error('Selecciona al menos una tarea.');
    try {
      await SprintModel.assign(target, selected);
      toast.success(`${selected.length} tarea(s) subida(s) al sprint.`);
      setSelected([]);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const carryover = async (sprint) => {
    const planning = sprints.find((s) => s.status === 'planning' || s.status === 'active');
    const next = sprints.find((s) => s.startDate > sprint.startDate) || planning || null;
    try {
      const res = await SprintModel.carryover(sprint.id, next?.id || null);
      toast.success(`${res.moved} tarea(s) movida(s) a ${next ? next.name : 'el backlog (carryover)'}.`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const setStatus = async (sprint, status) => {
    try {
      await SprintModel.update(sprint.id, { status });
      toast.success(`Sprint "${sprint.name}" → ${status}`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Sprints</h1>
        <p>
          Sprints de miércoles a miércoles (o el día configurado por proyecto). Sube tareas del backlog
          a cada sprint según su prioridad y gestiona el carryover al siguiente.
        </p>
      </div>

      <div className="toolbar">
        <Field label="Proyecto">
          <select className="mini" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        {config && (
          <Badge tone="gray">
            Cadencia: {CADENCE_LABEL[config.cadence]} · inicio {DAY_LABEL[config.startDay]}
          </Badge>
        )}
        <div className="spacer" />
        <button className="btn primary" onClick={() => setCreating(true)} disabled={!projectId}>
          + Nuevo sprint
        </button>
      </div>

      <div className="grid cols-2">
        <div className="stack" style={{ gap: 16 }}>
          {sprints.length === 0 && <Card><Empty>Este proyecto aún no tiene sprints. Crea el primero.</Empty></Card>}
          {sprints.map((s) => (
            <Card key={s.id} className="sprint-card">
              <div className="row wrap" style={{ justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <Badge tone={SPRINT_TONE[s.status] || 'gray'} dot>{s.status}</Badge>
                    <h3 style={{ fontSize: 16 }}>{s.name}</h3>
                    <span className="muted-2" style={{ fontSize: 12 }}>{CADENCE_LABEL[s.cadence]}</span>
                  </div>
                  <div className="muted-2" style={{ fontSize: 12, marginTop: 4 }}>
                    📅 {s.startDate} → {s.endDate} {s.daysLeft > 0 ? `· ${s.daysLeft} días restantes` : ''}
                  </div>
                  {s.goal && <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>🎯 {s.goal}</div>}
                </div>
                <div style={{ minWidth: 180 }}>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span className="muted">Entregado</span>
                    <span>{s.doneCount}/{s.taskCount} · {s.percent}%</span>
                  </div>
                  <Bar value={s.percent} tone={s.percent === 100 ? 'ok' : ''} />
                </div>
              </div>

              <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
                {s.status !== 'active' && <button className="btn sm" onClick={() => setStatus(s, 'active')}>Iniciar</button>}
                {s.status !== 'completed' && <button className="btn sm ghost" onClick={() => setStatus(s, 'completed')}>Completar</button>}
                <button className="btn sm ghost" onClick={() => carryover(s)}>↪ Carryover no entregadas</button>
              </div>

              <div className="list" style={{ marginTop: 12, borderTop: '1px solid var(--border-soft)' }}>
                {s.tasks.length === 0
                  ? <div className="empty">Sin tareas asignadas.</div>
                  : s.tasks.map((t) => <TaskLine key={t.id} task={t} />)}
              </div>
            </Card>
          ))}
        </div>

        {/* Backlog sin programar */}
        <div className="stack" style={{ gap: 16 }}>
          <Card title="Backlog por programar" hint={`${backlog.length} tarea(s) sin sprint`}>
            {backlog.length === 0 ? (
              <Empty>No hay tareas pendientes de programar en este proyecto.</Empty>
            ) : (
              <>
                <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
                  <select className="mini grow" value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">Elegir sprint destino…</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} · {s.startDate}</option>
                    ))}
                  </select>
                  <button className="btn sm primary" onClick={assignSelected} disabled={!selected.length || !target}>
                    Subir ({selected.length})
                  </button>
                </div>
                <div className="stack" style={{ gap: 2 }}>
                  {backlog.map((t) => (
                    <div key={t.id} className="row" style={{ gap: 10, alignItems: 'center' }}>
                      <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSel(t.id)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <TaskLine task={t} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {suggested && (
            <Card title="Siguiente sprint sugerido">
              <div className="muted" style={{ fontSize: 13 }}>
                Primer día hábil configurado ({DAY_LABEL[config?.startDay]}): <strong>{suggested.startDate}</strong> → <strong>{suggested.endDate}</strong> · {CADENCE_LABEL[suggested.cadence]}
              </div>
              <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setCreating(true)}>Programarlo</button>
            </Card>
          )}
        </div>
      </div>

      {creating && (
        <SprintForm
          project={project}
          suggested={suggested}
          config={config}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); reload(); toast.success('Sprint creado.'); }}
        />
      )}
    </>
  );
}

function SprintForm({ project, suggested, config, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    cadence: config?.cadence || 'biweekly',
    startDate: suggested?.startDate || '',
    goal: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const duration = form.cadence === 'weekly' ? 7 : 14;
  const end = form.startDate
    ? new Date(new Date(`${form.startDate}T00:00:00Z`).getTime() + duration * 86400000).toISOString().slice(0, 10)
    : '';

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await SprintModel.create({ projectId: project.id, ...form });
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
          <h3>Nuevo sprint · {project?.name}</h3>
          <button type="button" className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <Field label="Nombre (opcional)">
            <input value={form.name} onChange={set('name')} placeholder="Se autogenera si se deja vacío" />
          </Field>
          <div className="grid cols-2">
            <Field label="Cadencia">
              <select value={form.cadence} onChange={set('cadence')}>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
              </select>
            </Field>
            <Field label="Fecha de inicio">
              <input type="date" value={form.startDate} onChange={set('startDate')} />
            </Field>
          </div>
          <div className="muted-2" style={{ fontSize: 12, marginTop: -6, marginBottom: 12 }}>
            {end ? `Cierre calculado: ${end}` : 'Selecciona una fecha de inicio.'}
          </div>
          <Field label="Objetivo del sprint">
            <textarea rows={2} value={form.goal} onChange={set('goal')} placeholder="¿Qué valor se entrega?" />
          </Field>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving || !form.startDate}>
            {saving ? 'Guardando…' : 'Crear sprint'}
          </button>
        </div>
      </form>
    </div>
  );
}
