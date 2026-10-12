import { getRole, STATUS_META, CLASS_META } from '../../config/roles.js';

export function Card({ title, hint, actions, children, tight, className = '', style }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {hint && <div className="hint">{hint}</div>}
          </div>
          {actions}
        </header>
      )}
      <div className={`card-body ${tight ? 'tight' : ''}`}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'neutral' }) {
  return (
    <div className={`card stat tone-${tone}`}>
      <div className="k-label">{label}</div>
      <div className="k-value">{value}</div>
      {hint && <div className="k-hint">{hint}</div>}
    </div>
  );
}

export function StatRow({ items = [] }) {
  return (
    <div className="grid cols-4">
      {items.map((k, i) => (
        <Stat key={i} {...k} />
      ))}
    </div>
  );
}

export function Badge({ children, tone = 'gray', dot }) {
  return <span className={`badge ${tone} ${dot ? 'dot' : ''}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, tone: 'gray' };
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}

export function ClassBadge({ value }) {
  if (!value) return null;
  const tone = CLASS_META[value]?.tone || 'gray';
  return <Badge tone={tone}>{value}</Badge>;
}

export function RoleBadge({ role, full }) {
  const r = getRole(role);
  return (
    <span className="badge" style={{ color: r.color, borderColor: `${r.color}66`, background: `${r.color}1a` }}>
      <span>{r.icon}</span> {full ? r.label : r.short}
    </span>
  );
}

export function Bar({ value, max = 100, tone = '' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`bar ${tone}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ name = '?', color = '#6366f1', size = 36 }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function Empty({ children = 'Sin datos para mostrar.' }) {
  return <div className="empty">{children}</div>;
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
