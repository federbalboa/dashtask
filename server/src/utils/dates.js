/** Utilidades de fecha (UTC, sin dependencias externas). */

const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function toDate(value) {
  if (value instanceof Date) return value;
  return new Date(`${value}T00:00:00Z`);
}

export function fmt(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function addDays(value, days) {
  const d = toDate(value);
  return fmt(new Date(d.getTime() + days * DAY_MS));
}

/** Próxima fecha (>= from) que caiga en `weekday` (0=Dom … 6=Sáb). */
export function nextWeekday(from, weekday) {
  const d = toDate(from);
  const diff = (weekday - d.getUTCDay() + 7) % 7;
  return fmt(new Date(d.getTime() + diff * DAY_MS));
}

/** Diferencia en días entre dos fechas (b - a). */
export function diffDays(a, b) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
}

export function startOfMonth(year, month /* 1-12 */) {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function daysInMonth(year, month /* 1-12 */) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Acontecimientos de una ceremonia dentro de un mes, según su recurrencia.
 * recurrence: { freq: 'daily'|'weekly'|'biweekly'|'monthly'|'once', dayOfWeek?, dayOfMonth?, date? }
 */
export function occurrencesInMonth(recurrence, year, month /* 1-12 */) {
  const out = [];
  const total = daysInMonth(year, month);
  const add = (day) => out.push(fmt(new Date(Date.UTC(year, month - 1, day))));
  const r = recurrence || { freq: 'once' };

  if (r.freq === 'once') {
    if (r.date) {
      const d = toDate(r.date);
      if (d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month) add(d.getUTCDate());
    }
    return out;
  }

  if (r.freq === 'monthly') {
    const day = r.dayOfMonth || (r.date ? toDate(r.date).getUTCDate() : 1);
    if (day <= total) add(day);
    return out;
  }

  if (r.freq === 'daily') {
    for (let day = 1; day <= total; day += 1) {
      const wd = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      if (wd >= 1 && wd <= 5) add(day); // días hábiles
    }
    return out;
  }

  // weekly / biweekly
  const weekday = r.dayOfWeek ?? (r.date ? toDate(r.date).getUTCDay() : 3);
  const step = r.freq === 'biweekly' ? 14 : 7;
  const anchor = r.anchor || r.date;
  for (let day = 1; day <= total; day += 1) {
    const cur = new Date(Date.UTC(year, month - 1, day));
    if (cur.getUTCDay() !== weekday) continue;
    if (step === 14 && anchor) {
      const weeks = Math.round(diffDays(anchor, fmt(cur)) / 7);
      if (weeks % 2 !== 0) continue;
    }
    add(day);
  }
  return out;
}
