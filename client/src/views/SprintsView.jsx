import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../controllers/useApi.js';
import { useAuth } from '../controllers/AuthContext.jsx';
import { useToast } from '../controllers/ToastContext.jsx';
import { SprintModel, ProjectModel, ResourceModel, TaskModel } from '../models/api.js';
import { Card, Badge, Bar, Empty, Spinner, Field, Avatar } from './components/UI.jsx';
import TaskLine from './components/TaskLine.jsx';
import ResourcePool from './components/ResourcePool.jsx';

const CADENCE_LABEL = { weekly: 'Semanal', biweekly: 'Quincenal' };
const DAY_LABEL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SPRINT_TONE = { active: 'ok', planning: 'accent', completed: 'gray' };
const SPRINT_LABEL = { active: 'activo', planning: 'planificación', completed: 'completado' };
const RESOURCE_ROLES = ['product_manager', 'rte', 'lpm'];

export default function SprintsView() {
  const toast = useToast();
  const { user } = useAuth();
  const canSeeResources = RESOURCE_ROLES.includes(user?.role);
  const { data: projectsData } = useApi(() => ProjectModel.list(), []);
  const projects = projectsData?.projects || [];

  const [projectId, setProjectId] = useState('');
  const [creating, setCreating] = useState(false);
  const [picked, setPicked] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [planning, setPlanning] = useState(null);
  const [planSelected, setPlanSelected] = useState([]);
  const [planAssignee, setPlanAssignee] = useState('');
  const [planBusy, setPlanBusy] = useState(false);

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const { data, loading, reload } = useApi(
    () => (projectId ? SprintModel.list(projectId) : Promise.resolve(null)),
    [projectId]
  );
  const { data: resData, reload: reloadResources } = useApi(
    () => (canSeeResources && projectId ? ResourceModel.list(projectId) : Promise.resolve(null)),
    [projectId, canSeeResources]
  );
  const { data: candData, reload: reloadCandidates } = useApi(
    () => (canSeeResources && projectId ? ResourceModel.candidates(projectId) : Promise.resolve(null)),
    [projectId, canSeeResources]
  );

  const sprints = data?.sprints || [];
  const suggested = data?.suggested;
  const config = data?.sprintConfig;
  const rosterById = useMemo(() => {
    const m = {};
    (resData?.projects?.[0]?.roster || []).forEach((r) => { m[r.sprint.id] = r; });
    return m;
  }, [resData]);
  const project = projects.find((p) => p.id === projectId);

  const pick = (person) => {
    setPicked((p) => (p && p.userId === person.userId && p.kind === person.kind ? null : person));
  };

  const assignPerson = async (person, sprintId) => {
    if (!person || !sprintId) return;
    setBusy(true);
    try {
      if (person.kind === 'candidate') {
        await ResourceModel.add(projectId, person.userId, sprintId);
      } else {
        await ResourceModel.assignSprint(person.resourceId, sprintId);
      }
      toast.success(`${person.name} asignado al sprint.`);
      setPicked(null);
      setDragging(null);
      await reloadResources();
      await reloadCandidates();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const unassign = async (member, sprint) => {
    setBusy(true);
    try {
      if (member.resourceId) await ResourceModel.unassignSprint(member.resourceId, sprint.id);
      toast.success(`${member.name} quitado de ${sprint.name}.`);
      await reloadResources();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeResource = async (resource) => {
    setBusy(true);
    try {
      await ResourceModel.remove(resource.id);
      toast.success(`${resource.name} quitado del proyecto.`);
      await reloadResources();
      await reloadCandidates();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitPlan = async (sprint) => {
    if (!planSelected.length) return toast.error('Selecciona al menos una tarea del backlog.');
    setPlanBusy(true);
    try {
      await SprintModel.assign(sprint.id, planSelected);
      if (planAssignee) {
        await Promise.all(
          planSelected.map((id) => TaskModel.update(id, { assigneeId: planAssignee === '__none__' ? null : planAssignee }))
        );
      }
      toast.success(`${planSelected.length} tarea(s) subida(s) a ${sprint.name}.`);
      setPlanSelected([]);
      setPlanning(null);
      reload();
      if (canSeeResources) reloadResources();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPlanBusy(false);
    }
  };

  const carryover = async (sprint) => {
    const next = sprints.find((s) => s.startDate > sprint.startDate) || null;
    try {
      const res = await SprintModel.carryover(sprint.id, next?.id || null);
      toast.success(`${res.moved} tarea(s) movida(s) a ${next ? next.name : 'el backlog'}.`);
      reload();
      if (canSeeResources) reloadResources();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const setStatus = async (sprint, status) => {
    try {
      await SprintModel.update(sprint.id, { status });
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading && !data) return <Spinner label="Cargando sprints…" />;

  const sprintsSorted = sprints;
  const backlogCount = data?.backlog?.length || 0;
  const activePerson = dragging || picked;

  const cards = sprintsSorted.map((s) => (
    <SprintColumn
      key={s.id}
      sprint={s}
      roster={rosterById[s.id]}
      backlog={data?.backlog || []}
      planning={planning}
      planSelected={planSelected}
      planAssignee={planAssignee}
      planBusy={planBusy}
      canManage={canSeeResources}
      activePerson={activePerson}
      dropTarget={dropTarget}
      busy={busy}
      onTogglePlan={() => { setPlanning(planning === s.id ? null : s.id); setPlanSelected([]); }}
      onToggleTask={(taskId) => setPlanSelected((arr) => (arr.includes(taskId) ? arr.filter((x) => x !== taskId) : [...arr, taskId]))}
      onPlanAssignee={setPlanAssignee}
      onSubmitPlan={() => submitPlan(s)}
      onDropTargetChange={setDropTarget}
      onDrop={() => assignPerson(dragging, s.id)}
      onAssignPicked={() => assignPerson(activePerson, s.id)}
      onUnassign={(m) => unassign(m, s)}
      onSetStatus={(st) => setStatus(s, st)}
      onCarryover={() => carryover(s)}
    />
  ));

  return (
    <>
      <div className="page-head">
        <h1>🧭 Tablero de planificación de sprints</h1>
        <p>
          Arma cada iteración a partir de las personas del equipo: la <b>capacidad se calcula sola</b> con los
          <b> días hábiles (Lun–Vie)</b> del sprint × SP/día. Una persona puede participar en varios sprints.
        </p>
      </div>

      <div className="toolbar">
        <Field label="Proyecto">
          <select className="mini" value={projectId} onChange={(e) => { setProjectId(e.target.value); setPicked(null); }}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        {config && (
          <Badge tone="gray">
            Cadencia: {CADENCE_LABEL[config.cadence]} · inicio {DAY_LABEL[config.startDay]} · {config.spPerDay ?? 1} SP/día
          </Badge>
        )}
        <div className="spacer" />
        <button className="btn primary" onClick={() => setCreating(true)} disabled={!projectId}>+ Nuevo sprint</button>
      </div>

      {picked && (
        <div className="pick-hint">
          <Avatar name={picked.name} size={22} />
          <span>Seleccionaste a <b>{picked.name}</b>. Haz clic en “Asignar aquí” en un sprint, o arrástralo desde el panel.</span>
          <button className="btn ghost xs" onClick={() => setPicked(null)}>Cancelar</button>
        </div>
      )}

      <div className={`board-layout${canSeeResources ? '' : ' full'}`}>
        {canSeeResources && (
          <aside className="board-rail">
            <ResourcePool
              projects={projects}
              projectId={projectId}
              registered={resData?.projects?.[0]?.resources?.filter((r) => !r.inferred) || []}
              candidates={candData?.candidates || []}
              picked={picked}
              onPick={pick}
              onDragStart={setDragging}
              onDragEnd={() => setDragging(null)}
              onRemoveResource={removeResource}
              busy={busy}
            />
          </aside>
        )}

        <section className="board-scroll">
          {sprintsSorted.length === 0 ? (
            <Card><Empty>Este proyecto aún no tiene sprints. Crea el primero con “+ Nuevo sprint”.</Empty></Card>
          ) : (
            <div className="board-columns">
              {cards}
              <button className="sprint-col add-col" onClick={() => setCreating(true)}>
                <span style={{ fontSize: 28 }}>＋</span>
                <span>Nuevo sprint</span>
                {suggested && (
                  <span className="muted-2" style={{ fontSize: 11.5 }}>
                    sugerido {suggested.startDate} → {suggested.endDate}
                  </span>
                )}
                {backlogCount > 0 && <Badge tone="gray">{backlogCount} en backlog</Badge>}
              </button>
            </div>
          )}
        </section>
      </div>

      {creating && (
        <SprintForm
          project={projects.find((p) => p.id === projectId)}
          suggested={data?.suggested}
          config={data?.sprintConfig}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); reload(); toast.success('Sprint creado.'); }}
        />
      )}
    </>
  );
}

function SprintColumn({
  sprint, roster, backlog, planning, planSelected, planAssignee, planBusy, canManage,
  activePerson, dropTarget, busy,
  onTogglePlan, onToggleTask, onPlanAssignee, onSubmitPlan,
  onDropTargetChange, onDrop, onAssignPicked, onUnassign, onSetStatus, onCarryover,
}) {
  const r = roster || { members: [], capacity: 0, assigned: 0, free: 0, over: false, pct: 0, capacityPerPerson: 0 };
  const isDropTarget = dropTarget === sprint.id && activePerson;
  const assignedSp = sprint.tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
  const capacity = r.capacity || 0;
  const free = capacity - assignedSp;
  const pct = capacity ? Math.round((assignedSp / capacity) * 100) : 0;
  const over = assignedSp > capacity;

  return (
    <div
      className={`sprint-col${isDropTarget ? ' drop-target' : ''}`}
      onDragOver={(e) => { e.preventDefault(); if (activePerson) onDropTargetChange(sprint.id); }}
      onDragLeave={() => onDropTargetChange('')}
      onDrop={(e) => { e.preventDefault(); onDrop(); onDropTargetChange(''); }}
    >
      <div className="sprint-col-head">
        <div className="row wrap" style={{ gap: 6, alignItems: 'center' }}>
          <Badge tone={SPRINT_TONE[sprint.status] || 'gray'} dot>{SPRINT_LABEL[sprint.status] || sprint.status}</Badge>
          <strong>{sprint.name}</strong>
        </div>
        <div className="muted-2" style={{ fontSize: 11.5, marginTop: 3 }}>
          📅 {sprint.startDate} → {sprint.endDate}
        </div>
        {sprint.goal && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>🎯 {sprint.goal}</div>}
      </div>

      {canManage && (
        <div className={`sprint-capacity${over ? ' over' : ''}`}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="muted-2" style={{ fontSize: 11.5 }}>
              👥 {r.members.length} {r.capacityPerPerson ? `× ${r.capacityPerPerson} SP` : ''}
            </span>
            <span style={{ fontSize: 12 }}>
              <b>{assignedSp}</b> / {capacity} SP
            </span>
          </div>
          <Bar value={Math.min(100, pct)} tone={over ? 'danger' : pct >= 90 ? 'warn' : 'ok'} />
          <div className="muted-2" style={{ fontSize: 11, marginTop: 2 }}>
            Libre <b style={{ color: over ? 'var(--danger)' : 'var(--ok)' }}>{free} SP</b>
            {over ? ' ⚠ sobre capacidad' : ''}
          </div>
        </div>
      )}

      {canManage && (
        <div className="sprint-team">
          {r.members.length === 0 && (
            <div className="drop-empty">{isDropTarget ? 'Suelta aquí 👇' : 'Arrastra personas aquí'}</div>
          )}
          {r.members.map((m) => (
            <span key={m.id} className={`team-chip${m.registered ? '' : ' inferred'}`} title={`${m.name} · ${m.roleLabel}`}>
              <Avatar name={m.name} size={20} />
              <span className="team-chip-name">{m.name.split(' ')[0]}</span>
              {m.registered ? (
                <button className="team-chip-x" disabled={busy} title="Quitar del sprint" onClick={() => onUnassign(m)}>✕</button>
              ) : (
                <span className="team-chip-tag">por tareas</span>
              )}
            </span>
          ))}
        </div>
      )}

      {canManage && activePerson && (
        <button className={`btn sm drop-btn${isDropTarget ? ' primary' : ''}`} disabled={busy} onClick={onAssignPicked}>
          ＋ Asignar a {activePerson.name.split(' ')[0]} aquí
        </button>
      )}

      <div className="sprint-tasks">
        {sprint.tasks.length === 0
          ? <div className="muted-2" style={{ fontSize: 12, padding: '6px 0' }}>Sin tareas asignadas.</div>
          : sprint.tasks.map((t) => <TaskLine key={t.id} task={t} />)}
      </div>

      <div className="sprint-col-foot">
        <div className="row wrap" style={{ gap: 6 }}>
          {sprint.status !== 'active' && <button className="btn xs" onClick={() => onSetStatus('active')}>Iniciar</button>}
          {sprint.status !== 'completed' && <button className="btn xs ghost" onClick={() => onSetStatus('completed')}>Completar</button>}
          <button className="btn xs ghost" onClick={onCarryover}>↪ Carryover</button>
        </div>
      </div>

      {canManage && backlog.length > 0 && (
        <div className="sprint-plan">
          <button className="btn ghost xs" style={{ width: '100%' }} onClick={onTogglePlan}>
            {planning === sprint.id ? '▾' : '▸'} ＋ Planificar backlog ({backlog.length})
          </button>
          {planning === sprint.id && (
            <div className="plan-box">
              <select className="mini" value={planAssignee} onChange={(e) => onPlanAssignee(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
                <option value="">Asignar tareas a: — sin asignar —</option>
                {r.members.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.roleLabel}</option>)}
              </select>
              <div className="stack" style={{ gap: 2, maxHeight: 240, overflowY: 'auto', marginBottom: 8 }}>
                {backlog.map((t) => (
                  <label key={t.id} className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={planSelected.includes(t.id)} onChange={() => onToggleTask(t.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}><TaskLine task={t} /></div>
                  </label>
                ))}
              </div>
              <button className="btn primary sm" style={{ width: '100%' }} disabled={planBusy || !planSelected.length} onClick={onSubmitPlan}>
                Subir {planSelected.length ? `(${planSelected.length})` : ''} a {sprint.name}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
