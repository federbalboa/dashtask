import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../controllers/AuthContext.jsx';
import { useApi } from '../controllers/useApi.js';
import { TimelineModel, TaskModel } from '../models/api.js';
import { Spinner, Empty, Badge, StatRow, Stat, Card } from './components/UI.jsx';
import GanttChart from './components/Gantt.jsx';
import { STATUS_META } from '../config/roles.js';

const labelOf = (s) => STATUS_META[s]?.label || s;
const trunc = (s, n = 44) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);

const TABS = {
  mine: { label: 'Mi línea de tiempo', icon: '🧑‍💻', desc: 'Tus tareas asignadas y las que te corresponden por rol, con los sprints como franjas (1 SP = 1 día).' },
  byPI: { label: 'General · Program Increments', icon: '🧭', desc: 'El ART completo: tareas del Program Backlog asignadas por Program Increment e iteración.' },
  projects: { label: 'Panorama de proyectos', icon: '🗺️', desc: 'Proyectos → épicas → tareas, con los sprints como franjas verticales (1 SP = 1 día).' },
};

const DRAG_ROLES = ['product_manager', 'rte', 'lpm'];

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
    return <Empty>No hay tareas {mine?.scopeLabel || 'asignadas a ti'} todavía. Cuando te correspondan tareas, aparecerán aquí en la línea del tiempo.</Empty>;
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
          { label: 'Mis tareas', value: mine.totals.tasks, hint: mine.scopeLabel || 'asignadas a ti', tone: 'neutral' },
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

export default function TimelineView() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => TimelineModel.get(), [user.role]);

  const [tab, setTab] = useState(null);
  const canDrag = DRAG_ROLES.includes(user.role);
  const order = [...(data?.tabs ? orderInner(data) : ['mine'])];
  const available = data?.tabs ? order.filter((t) => data.tabs[t]) : [];
  const hasData = (t) =>
    (t === 'mine' && data?.mine?.tasks?.length) ||
    (t === 'byPI' && (data?.byPI?.programIncrements?.length || data?.byPI?.unassigned?.length)) ||
    (t === 'projects' && data?.projects?.projects?.length);
  const active = tab && available.includes(tab) ? tab : available.find(hasData) || available[0] || null;

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
    </>
  );
}

function orderInner(data) {
  const base = [];
  if (data.tabs.mine) base.push('mine');
  if (data.tabs.byPI) base.push('byPI');
  if (data.tabs.projects) base.push('projects');
  return base;
}