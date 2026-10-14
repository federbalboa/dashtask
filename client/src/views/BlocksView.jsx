import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { BlockModel } from '../models/api.js';
import { Card, Badge, Spinner, Field, RoleBadge } from './components/UI.jsx';

/**
 * Bloqueos de tareas: las solicitudes de bloqueo requieren autorización de
 * Portfolio Lead (LPM), Product Management, el Admin o quien tenga el permiso
 * global "aprobar bloqueos" (otorgado desde Administración).
 */
export default function BlocksView() {
  const { data, loading, reload } = useApi(() => BlockModel.list(), []);
  const toast = useToast();
  const [decide, setDecide] = useState(null);
  const [busy, setBusy] = useState('');

  if (loading) return <Spinner label="Cargando bloqueos…" />;

  const blocks = data?.blocks || [];
  const canDecide = !!data?.canDecide;
  const pending = blocks.filter((b) => b.status === 'pending');
  const history = blocks.filter((b) => b.status !== 'pending');

  const act = async (b, approve) => {
    setBusy(b.id);
    try {
      await BlockModel.decide(b.id, { approve, note: decide?.decisionNote || '' });
      toast.success(approve ? 'Bloqueo autorizado: la tarea pasa a “Bloqueado”.' : 'Bloqueo rechazado: la tarea continúa.');
      setDecide(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>⛔ Bloqueos de tareas</h1>
        <p>
          Bloquear una tarea requiere autorización de <b>Portfolio Lead (LPM)</b>, <b>Product Management</b>, el <b>Admin</b> o
          quien tenga el permiso global de <b>aprobar bloqueos</b>. Hasta que se autorice, la tarea sigue su curso.
        </p>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <Stat value={data?.stats?.pending ?? 0} label="Por autorizar" tone="warn" />
        <Stat value={data?.stats?.approved ?? 0} label="Autorizados" tone="ok" />
        <Stat value={data?.stats?.rejected ?? 0} label="Rechazados" tone="danger" />
      </div>

      {!canDecide && (
        <div className="hint" style={{ marginBottom: 16 }}>
          Tu rol consulta este tablero. Autorizan Portfolio Lead, Product Management, el Admin o quienes reciban el permiso.
        </div>
      )}

      <div className="section-title">Requieren autorización</div>
      {pending.length === 0 ? (
        <Card tight><div className="empty">Sin solicitudes de bloqueo pendientes. ✓</div></Card>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {pending.map((b) => (
            <BlockRow key={b.id} b={b} canDecide={canDecide} onDecide={() => setDecide(decide?.id === b.id ? null : { id: b.id, decisionNote: '' })} selected={decide?.id === b.id} />
          ))}
        </div>
      )}

      {pending.length > 0 && decide && (
        <div className="decide-bar">
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <Field label="Nota de la decisión (contexto para la bitácora)">
                <input
                  value={decide.decisionNote || ''}
                  onChange={(e) => setDecide((d) => ({ ...d, decisionNote: e.target.value }))}
                  placeholder="Ej. Se autoriza por dependencia externa / Se rechaza por capacidad del PI…"
                />
              </Field>
            </div>
            <div className="row wrap" style={{ gap: 10, alignItems: 'flex-end', paddingTop: 22 }}>
              <button className="btn danger" disabled={busy === decide.id} onClick={() => act({ id: decide.id }, false)}>✕ Rechazar bloqueo</button>
              <button className="btn ok" disabled={busy === decide.id} onClick={() => act({ id: decide.id }, true)}>✓ Autorizar bloqueo</button>
            </div>
          </div>
        </div>
      )}

      <div className="section-title" style={{ marginTop: 30 }}>Historial</div>
      <Card tight>
        {history.length === 0 ? (
          <div className="empty">Sin bloqueos resueltos todavía.</div>
        ) : (
          <div className="list">
            {history.map((b) => <BlockRow key={b.id} b={b} />)}
          </div>
        )}
      </Card>
    </>
  );
}

function BlockRow({ b, canDecide, onDecide, selected }) {
  const approved = b.status === 'approved';
  const tone = approved ? 'ok' : b.status === 'rejected' ? 'danger' : 'warn';
  const label = approved ? 'Autorizado' : b.status === 'rejected' ? 'Rechazado' : 'Por autorizar';
  const fmt = (iso) => (iso ? String(iso).replace('T', ' ').slice(0, 16) : '—');
  return (
    <div className="list-item audit-item">
      <div className="li-main">
        <div className="li-title row wrap" style={{ gap: 8 }}>
          <span className="mono muted-2">{b.id}</span>
          <Link to={`/tasks/${b.taskId}`}><Badge tone="accent">{b.taskId} · {b.taskTitle}</Badge></Link>
          {b.currentStatus && <Badge tone="gray">Etapa: {b.currentStatus}</Badge>}
        </div>
        <div className="li-sub" style={{ whiteSpace: 'normal', marginTop: 3 }}>
          Motivo: “{b.reason}”
          <div className="muted-2" style={{ marginTop: 3 }}>
            {b.status === 'pending'
              ? <>Solicitado por {b.requester} <RoleBadge role={b.requesterRole} /> · {fmt(b.at)}</>
              : <>Resuelto por {b.decidedBy} <RoleBadge role={b.decidedRole} /> · {fmt(b.decidedAt)}</>}
            {b.decisionNote ? <div>Decisión: {b.decisionNote}</div> : null}
          </div>
        </div>
      </div>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        {canDecide && b.status === 'pending' && (
          <button className={`btn sm ${selected ? 'primary' : ''}`} onClick={onDecide}>{selected ? 'Decidiendo…' : 'Decidir'}</button>
        )}
        <Badge tone={tone} dot>{label}</Badge>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="card stat tone-neutral">
      <div className="k-label">{label}</div>
      <div className="k-value" style={{ color: `var(--${tone})` }}>{value}</div>
    </div>
  );
}
