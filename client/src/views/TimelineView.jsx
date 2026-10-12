import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../controllers/AuthContext.jsx';
import { useApi } from '../controllers/useApi.js';
import { TimelineModel, ResourceModel, TaskModel } from '../models/api.js';
import { Spinner, Empty, Badge, StatRow, Stat, Card } from './components/UI.jsx';
import GanttChart from './components/Gantt.jsx';
import { STATUS_META } from '../config/roles.js';

const labelOf = (s) => STATUS_META[s]?.label || s;
const trunc = (s, n = 44) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);

const TABS = {
  mine: { label: 'Mi línea de tiempo', icon: '🧑‍💻', desc: 'Tus tareas asignadas y su avance en el Kanban, sobre la línea del tiempo.' },
  byPI: { label: 'General · Program Increments', icon: '🧭', desc: 'El ART completo: tareas del Program Backlog asignadas por Program Increment e iteración.' },
  projects: { label: 'Panorama de proyectos', icon: '🗺️', desc: 'Proyectos del portafolio: proyectos, épicas, sprints y tareas en una sola línea de tiempo.' },
  resources: { label: 'Recursos disponibles', icon: '🧰', desc: 'Capacidad y Story Points libres de los recursos por sprint (1 SP = 1 día).' },
};

const DRAG_ROLES = ['product_manager', 'rte', 'lpm'];
const RESOURCE_ROLES = ['product_manager', 'rte', 'lpm'];

const STATUS_TONES = ['backlog', 'in_progress', 'qa', 'uat', 'release', 'blocked'];

function Legend({ role }) {
  return (
    <div className="row wrap muted" style={{ fontSize: 11.5, gap: 14, marginTop: 14, opacity: 0.9 }}>
      <span className="muted-2" style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 10.5, fontWeight: 700 }}>Leyenda:</span>
      {STATUS_TONES.map((s) => (
        <span className="row" key={s} style={{ gap: 6 }}>
          <i className={`gantt-swatch tone-${s}`} />
          {labelOf(s)}
        </span>
      ))}
      <span className="row" style={{ gap: 6 }}><i className="gantt-swatch tone-sprint" />Sprint / PI</span>
      <span className="row" style={{ gap: 6 }}><i className="gantt-swatch tone-milestone" />⚑ Ceremonia (fecha)</span>
      <span className="row" style={{ gap: 6 }}><i className="gantt-swatch tone-stripes" />Capacidad libre</span>
      {(role === 'rte' || role === 'lpm' || role === 'epic_owner' || role === 'business_owner' || role === 'system_architect' || role === 'product_manager') && (
        <>
          <span className="row" style={{ gap: 6 }}><i className="gantt-swatch tone-project" />Proyecto</span>
          <span className="row" style={{ gap: 6 }}><i className="gantt-swatch tone-epic" />Épica</span>
        </>
      )}
    </div>
  );
}

function MineTab({ data, canDrag, onReschedule }) {
  const { mine } = data;
  if (!mine || !mine.tasks.length) {
    return <Empty>No tienes tareas asignadas todavía. Las tuyas aparecerán aquí en la línea del tiempo.</Empty>;
  }
  const sprintBands = [...new Set((mine.tasks || []).map((t) => t.sprint?.name).filter(Boolean))].map((n) => {
    const t = mine.tasks.find((x) => x.sprint?.name === n);
    return { start: t.sprint.startDate, end: t.sprint.endDate, tone: 'sprint', title: n };
  });
  const items = mine.tasks.map((t) => {
    const group = t.sprint ? `${t.sprint.name} · Sprint` : t.project ? t.project.name : 'Sin asignar';
    return {
      id: t.id,
      title: `${t.id} · ${trunc(t.title, 38)}`,
      subtitle: `${labelOf(t.status)} · ${t.storyPoints || 0} SP${t.sprint ? ` · ${t.sprint.name}` : ''}`,
      start: t.span.start,
      end: t.span.end,
      tone: t.tone,
      to: `/tasks/${t.id}`,
      group,
      groupStart: t.sprint?.startDate || t.span.start,
      groupEnd: t.sprint?.endDate || t.span.end,
      bands: sprintBands,
      project: t.project,
    };
  });

  return (
    <>
      <StatRow
        items={[
          { label: 'Mis tareas', value: mine.totals.tasks, hint: 'asignadas a ti', tone: 'neutral' },
          { label: 'Story Points', value: mine.tasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0), hint: 'esfuerzo total comprometido' },
          { label: 'Entregadas (Release)', value: mine.totals.done, hint: 'valor liberado', tone: 'ok' },
          { label: 'Avance', value: `${mine.totals.donePct}%`, hint: 'de tus tareas completadas' },
        ]}
      />
      <div className="row" style={{ gap: 8, margin: '16px 0 6px' }}>
        <span className="section-title" style={{ margin: 0 }}>Mi Kanban</span>
        <NavLink to="/kanban" className="btn ghost sm">Ver tablero completo →</NavLink>
      </div>
      <div className="grid cols-6" style={{ marginBottom: 18 }}>
        {mine.kanban.map((c) => (
          <div key={c.id} className="mini-kanban">
            <div className="mk-title">{c.title}</div>
            <div className={`mk-count tone-${c.id}`}>{c.count}</div>
          </div>
        ))}
      </div>

      <Card title="Línea del tiempo de mis tareas" hint="Basada en lo programado en el sprint: la barra dura tantos días como Story Points tiene la tarea (1 SP = 1 día).">
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <GanttChart
            items={items}
            bands={sprintBands}
            today={data.today}
            milestones={data.milestones || []}
            draggable={canDrag}
            onReschedule={onReschedule}
            sprints={data.sprints || []}
          />
        </div>
        <Legend role={data.role?.id} />
      </Card>
    </>
  );
}

function ByPITab({ data, canDrag, onReschedule }) {
  const { byPI } = data;
  if (!byPI) return null;
  const items = [];
  byPI.programIncrements.forEach((pi) => {
    const piBand = [{ start: pi.startDate, end: pi.endDate, tone: 'band', title: pi.name }];
    pi.iterations.forEach((it) => {
      items.push({
        id: `${pi.id}-iter-${it.name}`,
        title: it.name,
        subtitle: `${it.tasks.length} tareas · ${it.tasks.reduce((s, t) => s + (Number(t.storyPoints) || 0), 0)} SP`,
        start: it.range.start,
        end: it.range.end,
        tone: 'iter',
        group: pi.name,
        groupStart: pi.startDate,
        groupEnd: pi.endDate,
        bands: piBand,
      });
      it.tasks.forEach((t) =>
        items.push({
          id: `${pi.id}-${t.id}`,
          title: `${t.id} · ${trunc(t.title, 38)}`,
          subtitle: `${labelOf(t.status)} · ${t.storyPoints || 0} SP${t.assignee ? ` · ${t.assignee}` : ''}${t.iteration ? ` · ${t.iteration}` : ''}`,
          start: t.span.start,
          end: t.span.end,
          tone: t.tone,
          to: `/tasks/${t.id}`,
          group: pi.name,
          groupStart: pi.startDate,
          groupEnd: pi.endDate,
          bands: piBand,
          project: t.project,
        })
      );
    });
  });
  if (!byPI.programIncrements.length && !byPI.unassigned.length) return <Empty>Sin Program Increments todavía.</Empty>;

  return (
    <>
      <div className="grid cols-3">
        {byPI.programIncrements.map((pi) => (
          <Stat key={pi.id} label={pi.name} value={pi.totals.tasks} hint={`${pi.startDate} → ${pi.endDate}`} tone="neutral" />
        ))}
      </div>
      {byPI.unassigned.length > 0 && (
        <div className="row wrap" style={{ gap: 6, margin: '14px 0' }}>
          <Badge tone="warn">Sin PI ({byPI.unassigned.length})</Badge>
          {byPI.unassigned.map((t) => (
            <NavLink key={t.id} to={`/tasks/${t.id}`} className="badge" tone="gray">
              {t.id} · {trunc(t.title, 24)}
            </NavLink>
          ))}
        </div>
      )}
      <Card title="Timeline del ART por Program Increment" hint="Tareas del Program Backlog asignadas por PI e iteración; el largo de cada barra = Story Points (1 SP = 1 día). Arrastra las barras para reprogramar.">
        <GanttChart
          items={items}
          today={data.today}
          milestones={data.milestones || []}
          draggable={canDrag}
          onReschedule={onReschedule}
          sprints={data.sprints || []}
        />
        <Legend role={data.role?.id} />
      </Card>
    </>
  );
}

function ProjectsTab({ data, canDrag, onReschedule }) {
  const { projects } = data.projects;
  const items = [];
  projects.forEach((p) => {
    const sprints = p.sprints.map((s) => ({ start: s.startDate, end: s.endDate, tone: 'sprint', title: s.name }));
    const group = `${p.code} · ${p.name}${p.productManager ? ` — PM: ${p.productManager}` : ''}`;
    const base = { group, groupStart: p.startDate, groupEnd: p.targetDate, bands: sprints };
    items.push({
      id: `proj-${p.id}`,
      title: p.name,
      subtitle: `Proyecto · ${p.startDate} → ${p.targetDate}`,
      start: p.startDate,
      end: p.targetDate,
      tone: 'project',
      to: `/projects/${p.id}`,
      ...base,
    });
    p.epics.forEach((e) => {
      items.push({
        id: `epic-${e.id}`,
        title: trunc(e.name, 46),
        subtitle: `Épica · ${e.tasks.length} tareas`,
        start: e.span.start,
        end: e.span.end,
        tone: 'epic',
        to: `/epics/${e.id}`,
        ...base,
      });
      e.tasks.forEach((t) =>
        items.push({
          id: t.id,
          title: `${t.id} · ${trunc(t.title, 38)}`,
          subtitle: `${labelOf(t.status)} · ${t.storyPoints || 0} SP${t.assignee ? ` · ${t.assignee}` : ''}${t.sprint ? ` · ${t.sprint.name}` : ''}${t.epic ? '' : ' · sin épica'}`,
          start: t.span.start,
          end: t.span.end,
          tone: t.tone,
          to: `/tasks/${t.id}`,
          ...base,
          project: t.project,
        })
      );
    });
    p.orphanTasks.forEach((t) =>
      items.push({
        id: t.id,
        title: `${t.id} · ${trunc(t.title, 38)}`,
        subtitle: `${labelOf(t.status)} · ${t.storyPoints || 0} SP${t.assignee ? ` · ${t.assignee}` : ''}${t.sprint ? ` · ${t.sprint.name}` : ''}`,
        start: t.span.start,
        end: t.span.end,
        tone: t.tone,
        to: `/tasks/${t.id}`,
        ...base,
        project: t.project,
      })
    );
  });

  return (
    <>
      <div className="grid cols-3">
        {projects.map((p) => (
          <Stat
            key={p.id}
            label={`${p.code} · ${trunc(p.name, 22)}`}
            value={p.totals.tasks}
            hint={`${p.totals.epics} épicas · ${p.totals.done} liberadas · ${p.totals.points} SP`}
          />
        ))}
      </div>
      <Card title="Panorama general de proyectos" hint="Proyectos → épicas → tareas, con los sprints como franjas verticales; cada barra dura sus Story Points (1 SP = 1 día). Arrastra para reprogramar.">
        <GanttChart
          items={items}
          today={data.today}
          milestones={data.milestones || []}
          draggable={canDrag}
          onReschedule={onReschedule}
          sprints={data.sprints || []}
        />
        <Legend role={data.role?.id} />
      </Card>
    </>
  );
}

/** Pestaña "Recursos disponibles": el PM registra desarrolladores y ve cuántos SP libres tienen por sprint. */
function ResourcesTab({ data }) {
  const projects = data.projects?.projects || [];
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [resData, setResData] = useState(null);
  const [cands, setCands] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setResData(null);
    loadResources(projectId);
    loadCandidates(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadResources(id) {
    try { setResData(await ResourceModel.list(id)); } catch (e) { setResData({ error: e.message }); }
  }
  async function loadCandidates(id) {
    try { setCands(await ResourceModel.candidates(id)); } catch { setCands(null); }
  }

  async function addResource(userId) {
    setBusy(true);
    try {
      await ResourceModel.add(projectId, userId);
      await loadResources(projectId);
      await loadCandidates(projectId);
    } finally { setBusy(false); }
  }
  async function removeResource(id) {
    setBusy(true);
    try {
      await ResourceModel.remove(id);
      await loadResources(projectId);
      await loadCandidates(projectId);
    } finally { setBusy(false); }
  }

  const activeProject = resData?.projects?.[0] || null;
  const resources = activeProject?.resources || [];

  return (
    <>
      <div className="row wrap" style={{ gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 12.5 }}>Proyecto:</span>
        <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ width: 300 }}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code} · {p.name}{p.productManager ? ` — PM: ${p.productManager}` : ''}</option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: 12 }}>Capacidad: <b>{activeProject?.spPerDay ?? 1} SP</b> por día por recurso.</span>
        {activeProject?.project.productManager && <Badge tone="accent">PM: {activeProject.project.productManager}</Badge>}
        {activeProject?.project.valueStream && <Badge tone="gray">{activeProject.project.valueStream}</Badge>}
      </div>

      {(!activeProject || !projects.length) && <Empty>No hay proyectos de los que calcular recursos.</Empty>}

      {activeProject && (
        <Card title={`Recursos · ${activeProject.project.code} ${activeProject.project.name}`} hint="Los Story Points asignados a cada recurso en el sprint restan días de su capacidad (1 SP = 1 día).">
          {!resources.length && <Empty>Sin recursos registrados todavía. Usa “Agregar recurso”.</Empty>}
          <div className="res-table">
            <div className="tr th">
              <span>Recurso</span>
              <span>Registro</span>
              <span>Sprints del proyecto</span>
            </div>
            {resources.map((r) => (
              <div className="tr" key={`${r.userId}-${r.inferred ? 'i' : 'r'}`}>
                <span className="row" style={{ gap: 8 }}>
                  <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{r.avatar || r.name.slice(0, 2)}</span>
                  <span>
                    <b>{r.name}</b> <span className="muted" style={{ fontSize: 11 }}>· {r.roleLabel}</span>
                    {r.inferred && <Badge tone="warn">asignado</Badge>}
                  </span>
                </span>
                <span className="mono" style={{ fontSize: 12 }}>
                  {r.totals.capacity} puestos · {r.totals.assigned} SP asignados · <b style={r.totals.free < 0 ? { color: 'var(--danger)' } : undefined}>{Math.max(0, r.totals.free)} SP libres</b>
                  {r.inferred && !r.id ? null : (
                    <button className="btn ghost xs" style={{ marginLeft: 8 }} onClick={() => removeResource(r.id)}>quitar</button>
                  )}
                </span>
                <span className="row wrap" style={{ gap: 4 }}>
                  {r.availability.map((a) => (
                    <span
                      key={a.sprint.id}
                      className={`cap-chip${a.over ? ' over' : ''}`}
                      title={`${a.sprint.name} (${a.sprint.startDate} → ${a.sprint.endDate}): ${a.days} días hábiles · ${a.capacity} SP capacidad · ${a.assigned} SP asignados`}
                    >
                      <b>{a.sprint.name}</b> {Math.max(0, a.free)}/ {a.capacity} SP libres
                      {a.over && ' ⚠'}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeProject && cands && (
        <Card title="Agregar recurso disponible" hint="Candidatos del nivel equipo/ART que aún no están registrados en este proyecto, con sus SP libres según asignaciones en otros proyectos.">
          {!cands.candidates.length && <Empty>No hay candidatos disponibles.</Empty>}
          <div className="res-table">
            <div className="tr th"><span>Candidato</span><span>Capacidad</span><span /></div>
            {cands.candidates.map((c) => (
              <div className="tr" key={c.userId}>
                <span className="row" style={{ gap: 8 }}>
                  <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{c.name.slice(0, 2)}</span>
                  <span><b>{c.name}</b> <span className="muted" style={{ fontSize: 11 }}>· {c.roleLabel}</span></span>
                </span>
                <span className="mono" style={{ fontSize: 12 }}>
                  {c.totals.capacity} puestos · {c.totals.assigned} SP en otros proyectos · <b>{Math.max(0, c.totals.free)} SP libres</b>
                </span>
                <span className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                  {c.perSprint.map((t) => (
                    <Badge key={t.id} tone="gray">{t.sprintName || 'backlog'}·{t.storyPoints}SP</Badge>
                  ))}
                  <button className="btn primary xs" disabled={busy} onClick={() => addResource(c.userId)}>+ Añadir</button>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

export default function TimelineView() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => TimelineModel.get(), [user.role]);

  const [tab, setTab] = useState(null);
  const canDrag = DRAG_ROLES.includes(user.role);
  const order = [...(data?.tabs ? orderInner(data) : ['mine'])];
  const available = data?.tabs ? order.filter((t) => data.tabs[t]) : [];
  const active = tab && available.includes(tab) ? tab : available[0] || null;

  async function reschedule(taskId, sprintId) {
    try {
      await TaskModel.assignSprint(taskId, sprintId);
      await reload();
    } catch (e) {
      // falla silenciosa: el Gantt se mantiene sin cambios
      console.error('No se pudo reprogramar:', e.message);
    }
  }

  if (loading) return <Spinner label="Preparando la línea de tiempo…" />;
  if (error) return <div className="error-box">No se pudo cargar el timeline: {error.message}</div>;
  if (!data) return null;

  return (
    <>
      <div className="page-head">
        <h1>Línea de tiempo (Gantt)</h1>
        <p>
          {data.role?.icon} {data.role?.label} · {active ? TABS[active].desc : ''}
        </p>
      </div>

      {canDrag && (
        <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <Badge tone="ok">Arrastra las barras para reprogramar en otro sprint (1 SP = 1 día)</Badge>
        </div>
      )}

      <div className="tl-tabs">
        {available.map((t) => (
          <button
            key={t}
            className={`btn sm ${t === active ? 'primary' : 'ghost'}`}
            onClick={() => setTab(t)}
          >
            <span>{TABS[t].icon}</span> {TABS[t].label}
          </button>
        ))}
      </div>

      {active === 'mine' && <MineTab data={data} canDrag={canDrag} onReschedule={reschedule} />}
      {active === 'byPI' && <ByPITab data={data} canDrag={canDrag} onReschedule={reschedule} />}
      {active === 'projects' && <ProjectsTab data={data} canDrag={canDrag} onReschedule={reschedule} />}
      {active === 'resources' && <ResourcesTab data={data} />}
    </>
  );
}

function orderInner(data) {
  const base = [];
  if (data.tabs.mine) base.push('mine');
  if (data.tabs.byPI) base.push('byPI');
  if (data.tabs.projects) base.push('projects');
  if (data.tabs.resources) base.push('resources');
  return base;
}