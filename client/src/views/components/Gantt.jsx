import { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const DAY_MS = 86400000;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const parseDate = (s) => {
  const str = s instanceof Date ? s.toISOString().slice(0, 10) : String(s).slice(0, 10);
  return new Date(`${str}T00:00:00Z`);
};
const fmtDate = (d) => d.toISOString().slice(0, 10);
function diffDays(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / DAY_MS);
}
function addDays(d, n) {
  return new Date(d.getTime() + n * DAY_MS);
}
function mondayBefore(d) {
  const shift = (d.getUTCDay() + 6) % 7;
  return addDays(d, -shift);
}
function shortDate(s) {
  const [, m, day] = String(s).split('-');
  return `${day} ${MONTHS[parseInt(m, 10) - 1]}`;
}

/** Elige el sprint más cercano al rango que contiene `date` (o el más próximo por margen). */
export function pickSprint(sprints, projectId, date) {
  const pool = projectId ? sprints.filter((s) => String(s.projectId) === String(projectId)) : sprints || [];
  const target = parseDate(date);
  let best = null;
  let bestDist = Infinity;
  pool.forEach((s) => {
    if (!s.startDate || !s.endDate) return;
    const sStart = parseDate(s.startDate);
    const sEnd = parseDate(s.endDate);
    let dist;
    if (target >= sStart && target <= sEnd) dist = 0;
    else if (target < sStart) dist = Math.round((sStart - target) / DAY_MS);
    else dist = Math.round((target - sEnd) / DAY_MS);
    if (dist < bestDist || (dist === bestDist && (best ? s.startDate < best.startDate : true))) {
      bestDist = dist;
      best = s;
    }
  });
  return bestDist <= 7 ? best : null;
}

/**
 * GANTT: línea de tiempo horizontal.
 * items: [{ id, title, subtitle, group, groupStart, groupEnd, start, end, tone, to, project? }]
 * bands: [{ start, end, tone, title }] — franjas verticales (sprints / PIs).
 * milestones: [{ date, id, title, level, tone, facilitatorLabel }] — fechas de ceremonias (⚑).
 * draggable + onReschedule(id, sprintId|null): permite arrastrar barras hacia
 * adelante/atrás para reprogramar la tarea en un sprint.
 */
export default function GanttChart({
  items = [], bands = [], today = '', dayWidth = 14, milestones = [],
  draggable = false, onReschedule = null, sprints = [],
}) {
  const [drag, setDrag] = useState(null);
  const movedRef = useRef(false);
  const navigate = useNavigate();

  const ranges = [];
  items.forEach((it) => {
    if (it.start) ranges.push(parseDate(it.start));
    if (it.end) ranges.push(parseDate(it.end));
    if (it.groupStart) ranges.push(parseDate(it.groupStart));
    if (it.groupEnd) ranges.push(parseDate(it.groupEnd));
  });
  bands.forEach((b) => {
    ranges.push(parseDate(b.start));
    ranges.push(parseDate(b.end));
  });
  if (!ranges.length) return null;

  // Días extra a cada lado para poder desplazar la línea de tiempo hacia atrás y adelante.
  const PAD_DAYS = 45;
  const minDate = new Date(Math.min(...ranges.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...ranges.map((d) => d.getTime())));
  const axisStart = addDays(mondayBefore(minDate), -PAD_DAYS);
  const axisEnd = mondayBefore(addDays(maxDate, PAD_DAYS + 6));
  const totalDays = diffDays(axisStart, axisEnd) + 1;
  const totalPx = Math.max(320, totalDays * dayWidth);

  const x = (s) => (s ? diffDays(axisStart, s) * dayWidth : 0);
  const w = (s, e) => (s && e ? Math.max(10, (diffDays(s, e) + 1) * dayWidth) : 10);

  const gridLines = [];
  for (let i = 1; i < Math.ceil(totalDays / 7); i += 1) gridLines.push(i * 7 * dayWidth);

  const dayLines = [];
  for (let i = 1; i < totalDays; i += 1) dayLines.push(i * dayWidth);

  // Límites de sprint visibles en el eje (todas las líneas verticales de guía).
  const visibleSprints = (sprints || [])
    .filter((s) => s.startDate && s.endDate)
    .map((s) => ({ ...s, start: parseDate(s.startDate), end: parseDate(s.endDate) }))
    .filter((s) => s.end >= new Date(Math.min(...ranges.map((d) => d.getTime()))) && s.start <= axisEnd)
    .sort((a, b) => a.start - b.start);

  const startDrag = (e, item) => {
    if (!draggable || !onReschedule) return;
    e.preventDefault();
    movedRef.current = false;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const widthDays = Math.max(1, diffDays(item.start, item.end) + 1);
    setDrag({ id: item.id, startX: e.clientX, origStart: item.start, widthDays, targetStart: item.start, active: false });
  };

  const moveDrag = (e, item) => {
    if (!drag || drag.id !== item.id) return;
    const dx = e.clientX - drag.startX;
    const delta = Math.round(dx / dayWidth);
    if (!drag.active && Math.abs(delta) === 0) return;
    movedRef.current = true;
    let newStart = addDays(parseDate(item.start), delta);
    const clamp = diffDays(axisStart, axisEnd) - drag.widthDays;
    let days = diffDays(axisStart, newStart);
    if (days < 0) { days = 0; newStart = axisStart; }
    if (days > clamp) { days = clamp; newStart = addDays(axisStart, clamp); }
    const target = pickSprint(sprints, item.project?.id, fmtDate(newStart));
    setDrag({ ...drag, active: true, newStart: fmtDate(newStart), targetStart: fmtDate(newStart), targetSprint: target });
  };

  const endDrag = (item) => {
    if (!drag || drag.id !== item.id) return;
    if (!drag.active) { setDrag(null); return; }
    const target = drag.targetSprint || pickSprint(sprints, item.project?.id, drag.targetStart);
    if (onReschedule) onReschedule(item.id, target ? target.id : null);
    setDrag(null);
  };

  const rows = [];
  let lastGroup = null;
  items.forEach((item) => {
    if (item.group && item.group !== lastGroup) {
      rows.push(<div key={`g-${item.group}`} className="gantt-track gantt-group">
        <div className="gantt-label">
          <span className="gantt-group-title">{item.group}</span>
        </div>
        <div className="gantt-line">
          <span className="gantt-weeklines">
            {gridLines.map((g) => <i key={g} style={{ left: g }} />)}
          </span>
          <span className="gantt-daylines">
            {dayLines.map((d) => <i key={d} style={{ left: d }} />)}
          </span>
          <span className="gantt-sprintguides">
            {visibleSprints.map((s) => <i key={s.id} style={{ left: x(fmtDate(s.start)) }} title={`Inicio ${s.name} (${s.startDate})`} />)}
          </span>
          <span className="gantt-bar bar-group" style={{ left: x(item.groupStart), width: w(item.groupStart, item.groupEnd) }} />
          {today && <span className="gantt-today" style={{ left: x(today) }} />}
        </div>
      </div>);
      lastGroup = item.group;
    }
    const rowBands = item.bands?.length ? item.bands : bands;
    const isDragging = drag && drag.id === item.id && drag.active;
    const barStart = isDragging ? drag.newStart : item.start;
    const barEnd = isDragging ? addDays(parseDate(barStart), Math.max(0, diffDays(item.start, item.end))) : item.end;
    rows.push(
      <div key={item.id} className={`gantt-track${isDragging ? ' gantt-dragging' : ''}`}>
        <div className="gantt-label" title={item.subtitle}>
          {item.to ? (
            <NavLink to={item.to} className="gantt-cell-link">
              <span className="gantt-title">{item.title}</span>
              {item.subtitle && <span className="gantt-sub">{item.subtitle}</span>}
            </NavLink>
          ) : (
            <>
              <span className="gantt-title">{item.title}</span>
              {item.subtitle && <span className="gantt-sub">{item.subtitle}</span>}
            </>
          )}
        </div>
        <div className="gantt-line">
          <span className="gantt-weeklines">
            {gridLines.map((g) => <i key={g} style={{ left: g }} />)}
          </span>
          <span className="gantt-daylines">
            {dayLines.map((d) => <i key={d} style={{ left: d }} />)}
          </span>
          <span className="gantt-sprintguides">
            {visibleSprints.map((s) => <i key={s.id} style={{ left: x(fmtDate(s.start)) }} title={`Inicio ${s.name} (${s.startDate})`} />)}
          </span>
          {rowBands.map((b, i) => (
            <span key={i} className={`gantt-band tone-${b.tone || 'band'}`} style={{ left: x(b.start), width: w(b.start, b.end) }} title={b.title} />
          ))}
          <span
            className={`gantt-bar tone-${item.tone || 'backlog'}${draggable ? ' gantt-bar-drag' : ''}${isDragging ? ' dragging' : ''}`}
            style={{ left: x(barStart), width: w(barStart, barEnd) }}
            title={item.subtitle ? `${item.title} · ${item.subtitle}` : item.title}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onClick={draggable && item.to ? () => { if (movedRef.current) return; navigate(item.to); } : undefined}
            onPointerDown={draggable ? (e) => startDrag(e, item) : undefined}
            onPointerMove={draggable ? (e) => moveDrag(e, item) : undefined}
            onPointerUp={draggable ? () => endDrag(item) : undefined}
            onPointerCancel={draggable ? () => setDrag(null) : undefined}
          >
            {item.to && !draggable && <NavLink to={item.to} className="gantt-bar-link" />}
          </span>
          {isDragging && (
            <span className="gantt-drag-hint" style={{ left: Math.max(4, x(barStart)) }}>
              {shortDate(drag.targetStart)}
              {drag.targetSprint ? ` → ${drag.targetSprint.name}` : ' → backlog'}
            </span>
          )}
          {today && !isDragging && <span className="gantt-today" style={{ left: x(today) }} />}
        </div>
      </div>
    );
  });

  const headerDays = [];
  for (let i = 0; i < totalDays; i += 1) headerDays.push(addDays(axisStart, i));
  const todayOnAxis = today && x(today) > 0 && x(today) <= totalPx;

  // Celdas de mes (agrupando los días del eje) para la fila superior.
  const monthCells = [];
  let monthAcc = 0;
  headerDays.forEach((d) => {
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const last = monthCells[monthCells.length - 1];
    if (last && last.key === key) last.count += 1;
    else monthCells.push({ key, count: 1, offset: monthAcc, label: MONTHS[d.getUTCMonth()], year: d.getUTCFullYear() });
    monthAcc += dayWidth;
  });

  // Columnas de fechas de los sprints (qué vence antes de cada uno).
  const sprintCells = visibleSprints.map((s) => {
    const left = x(fmtDate(s.start));
    const width = w(fmtDate(s.start), fmtDate(s.end));
    return { left, width, s };
  });

  // Marcadores de ceremonias (⚑) agrupados por fecha y luego por proximidad en píxeles.
  const byDate = new Map();
  milestones.forEach((m) => {
    if (!m.date) return;
    const d = x(m.date);
    if (d < 0 || d > totalPx) return;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(m);
  });
  const rawCells = [...byDate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([left, list]) => ({ left, list }));
  // Agrupar ceremonias que caigan a menos de 26px para no saturar el eje.
  const milestoneCells = [];
  rawCells.forEach((cell) => {
    const last = milestoneCells[milestoneCells.length - 1];
    if (last && cell.left - last.right < 26) {
      last.list = last.list.concat(cell.list);
      last.right = Math.max(last.right, cell.left);
    } else {
      milestoneCells.push({ left: cell.left, right: cell.left, list: [...cell.list] });
    }
  });

  return (
    <div className="gantt" style={{ '--gantt-day': `${dayWidth}px` }}>
      <div className="gantt-axis">
        <div className="gantt-axis-label">Fecha</div>
        <div className="gantt-axis-stack" style={{ width: totalPx }}>
          {/* Fila 0: meses */}
          <div className="gantt-axis-line gantt-month-line">
            {monthCells.map((m) => (
              <span key={m.key} className="gantt-month" style={{ left: m.offset, width: m.count * dayWidth }} title={`${m.label} ${m.year}`}>
                {m.count * dayWidth > 54 ? `${m.label} ${m.year}` : m.label}
              </span>
            ))}
          </div>

          {/* Fila 1: días (con fin de semana sombreado) */}
          <div className="gantt-axis-line gantt-day-line">
            {headerDays.map((d) => {
              const dd = fmtDate(d);
              const dow = d.getUTCDay();
              const weekend = dow === 0 || dow === 6;
              const weekStart = dow === 1;
              const isToday = todayOnAxis && x(dd) === x(today);
              return (
                <span
                  key={dd}
                  className={`gantt-day${weekend ? ' weekend' : ''}${weekStart ? ' week-start' : ''}${isToday ? ' is-today' : ''}`}
                  style={{ width: dayWidth }}
                  title={dd}
                >
                  {dayWidth >= 13 && <span className="gantt-dow">{DOW[dow]}</span>}
                  <span className="gantt-dom">{d.getUTCDate()}</span>
                </span>
              );
            })}
            <span className="gantt-weeklines">
              {gridLines.map((g) => <i key={g} style={{ left: g }} />)}
            </span>
            {todayOnAxis && <span className="gantt-week-today" style={{ left: x(today) }}>hoy</span>}
          </div>

          {/* Fila 2: franjas de sprint con sus fechas */}
          <div className="gantt-axis-line gantt-sprint-line">
            {sprintCells.map((c) => (
              <span
                key={`${c.s.id}-${c.s.startDate}`}
                className="gantt-sprint-axis"
                style={{ left: c.left, width: c.width }}
                title={`${c.s.name} · ${c.s.startDate} → ${c.s.endDate}`}
              >
                {c.width > 30 ? `${c.s.name} · ${shortDate(c.s.startDate)}` : (c.width > 12 ? shortDate(c.s.startDate) : '')}
              </span>
            ))}
          </div>

          {/* Fila 3: fechas de ceremonias del usuario */}
          {milestoneCells.length > 0 && (
            <div className="gantt-axis-line gantt-milestone-line">
              {milestoneCells.map((c, i) => (
                <span
                  key={`${c.left}-${i}`}
                  className={`gantt-milestone tone-${c.list[0].tone || 'accent'}`}
                  style={{ left: c.left, top: -2 - Math.min(c.list.length - 1, 5) * 12 }}
                  title={c.list.map((m) => `${m.date} · ${m.title} (${m.level}) · ${m.facilitatorLabel}`).join('\n')}
                >
                  ⚑ {c.list.length > 1 ? `${c.list.length}·` : ''}{shortDate(c.list[0].date)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="gantt-body">{rows}</div>
    </div>
  );
}