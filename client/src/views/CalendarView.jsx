import { useEffect, useState } from 'react';
import { useApi } from '../controllers/useApi.js';
import { CalendarModel } from '../models/api.js';
import { Card, Badge, Spinner, Field } from './components/UI.jsx';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const LEVEL_TONE = { Equipo: 'info', ART: 'accent', Portafolio: 'warn' };

function pad(n) { return String(n).padStart(2, '0'); }

export default function CalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1);
  const [projectId, setProjectId] = useState('');

  const monthStr = `${year}-${pad(month)}`;
  const { data, loading, reload } = useApi(() => CalendarModel.month(monthStr, projectId), [monthStr, projectId]);

  useEffect(() => { reload(); }, [monthStr, projectId]); // eslint-disable-line

  const shift = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m); setYear(y);
  };

  if (loading && !data) return <Spinner label="Cargando calendario…" />;

  const events = data?.events || {};
  const upcoming = data?.upcoming || [];
  const projects = data?.projects || [];
  const firstWeekday = data?.firstWeekday ?? 0; // 0=Dom
  const daysInMonth = data?.daysInMonth ?? 30;
  const offset = (firstWeekday + 6) % 7; // grilla lunes-primero
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const todayKey = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;

  return (
    <>
      <div className="page-head">
        <h1>Calendario</h1>
        <p>Programación visual de ceremonias y sprints por proyecto. Las ceremonias se repiten según su recurrencia; los sprints marcan su inicio y cierre.</p>
      </div>

      <div className="toolbar">
        <button className="btn sm" onClick={() => shift(-1)}>‹</button>
        <h3 style={{ minWidth: 180, textAlign: 'center' }}>{MONTHS[month - 1]} {year}</h3>
        <button className="btn sm" onClick={() => shift(1)}>›</button>
        <div className="spacer" />
        <Field label="Proyecto">
          <select className="mini" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Todos los proyectos</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="cal-legend">
        <Badge tone="info" dot>Ceremonia de equipo</Badge>
        <Badge tone="accent" dot>Ceremonia de ART</Badge>
        <Badge tone="warn" dot>Ceremonia de portafolio</Badge>
        <Badge tone="ok" dot>Inicio de sprint</Badge>
        <span className="badge danger dot">Cierre de sprint</span>
      </div>

      <div className="grid cal-layout">
        <Card tight className="cal-card">
          <div className="cal-grid">
            {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
            {cells.map((day, i) => {
              if (day === null) return <div className="cal-cell empty" key={`e${i}`} />;
              const key = `${year}-${pad(month)}-${pad(day)}`;
              const dayEvents = events[key] || [];
              return (
                <div className={`cal-cell ${key === todayKey ? 'today' : ''}`} key={key}>
                  <div className="cal-day">{day}</div>
                  <div className="cal-events">
                    {dayEvents.map((ev, j) => (
                      <div className={`cal-ev ${ev.type === 'ceremony' ? `cer lev-${ev.level}` : ev.type}`} key={j}
                        title={ev.goal ? `${ev.title} — ${ev.goal}` : ev.title}>
                        {ev.type === 'sprint-start' ? '▶ ' : ev.type === 'sprint-end' ? '⏹ ' : ''}{ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Próximas ceremonias" hint="Siguientes 60 días">
          {upcoming.length === 0 ? (
            <div className="empty">Sin ceremonias próximas en el rango.</div>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {upcoming.map((ev, i) => (
                <div key={i} className="row" style={{ justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</div>
                    <div className="muted-2" style={{ fontSize: 11.5 }}>
                      {ev.facilitatorLabel || ev.projectName}
                      {ev.duration ? ` · ${ev.duration}` : ''}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    {ev.level && <Badge tone={LEVEL_TONE[ev.level] || 'gray'}>{ev.level}</Badge>}
                    <span className="mono muted-2" style={{ fontSize: 11.5 }}>{ev.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
