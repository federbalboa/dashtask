import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { useAuth } from '../controllers/AuthContext.jsx';
import { ChangeModel } from '../models/api.js';
import { Card, Badge, Spinner, RoleBadge } from './components/UI.jsx';
import { changeStatusMeta, reasonCodeMeta, reasonTypeMeta, canDecideChange } from '../config/reschedule.js';

export default function ChangesView() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, reload } = useApi(() => ChangeModel.list(), []);
  const [busy, setBusy] = useState('');
  const canDecide = canDecideChange(user?.role);

  const changes = data?.changes || [];
  const stats = data?.stats;
  const pending = changes.filter((c) => c.status === 'pending');
  const decidedList = changes.filter((c) => c.status !== 'pending');

  const act = async (id, approve, note = '') => {
    setBusy(id);
    try {
      await ChangeModel.decide(id, { approve, note });
      toast.success(approve ? 'Cambio autorizado: la fecha de entrega se actualizó.' : 'Cambio mantenido como estaba.');
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  if (loading) return <Spinner label="Cargando control de cambios…" />;

  return (
    <>
      <div className="page-head">
        <h1>🛂 Control de cambios de entregas</h1>
        <p>
          Toda modificación de una fecha de entrega queda registrada con su motivo. Las <b>incidencias u omisiones</b> se
          aplican de inmediato; los <b>controles de cambio</b> requieren autorización del equipo de portafolio.
        </p>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Stat value={stats?.pending ?? 0} label="Por autorizar" tone="warn" />
        <Stat value={stats?.applied ?? 0} label="Incidencia aplicada" tone="ok" />
        <Stat value={stats?.approved ?? 0} label="Autorizadas" tone="ok" />
        <Stat value={stats?.rejected ?? 0} label="Mantenidas" tone="danger" />
      </div>

      {!canDecide && (
        <div className="hint" style={{ marginBottom: 16 }}>
          Tu rol consulta este tablero. Las decisiones las toma el equipo de portafolio (LPM, Business Owner, Epic Owner, RTE).
        </div>
      )}

      <div className="section-title">Requieren decisión del portafolio</div>
      {pending.length === 0 ? (
        <Card tight><div className="empty">Sin solicitudes de control de cambios pendientes. ✓</div></Card>
      ) : (
        <>
          {canDecide && (
            <div className="hint" style={{ marginBottom: 12 }}>
              Lee cada solicitud y autoriza con el botón <b>✓ Autorizar</b> (o mantenla con <b>✕ Mantener</b>).
              Puedes resolverlas todas desde aquí, sin entrar a la tarea.
            </div>
          )}
          <div className="stack" style={{ gap: 12 }}>
            {pending.map((c) => (
              <ChangeRow key={c.id} c={c} canDecide={canDecide} busy={busy === c.id} onDecide={act} />
            ))}
          </div>
        </>
      )}

      <div className="section-title" style={{ marginTop: 30 }}>Historial</div>
      <Card tight>
        {decidedList.length === 0 ? (
          <div className="empty">Sin cambios registrados todavía.</div>
        ) : (
          <div className="list">
            {decidedList.map((c) => <ChangeRow key={c.id} c={c} />)}
          </div>
        )}
      </Card>
    </>
  );
}

function ChangeRow({ c, canDecide = false, busy = false, onDecide }) {
  const st = changeStatusMeta(c.status);
  const rt = reasonTypeMeta(c.reasonType);
  const rc = reasonCodeMeta(c.reasonType, c.reasonCode);
  const href = c.scope === 'intake' ? null : `/tasks/${c.refId}`;
  const [note, setNote] = useState('');
  const pending = c.status === 'pending';
  return (
    <div className="list-item audit-item" style={{ display: 'block' }}>
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div className="li-main" style={{ flex: 1 }}>
          <div className="li-title row wrap" style={{ gap: 8 }}>
            <span className="mono muted-2">{c.id}</span>
            <span>{rc.icon} {rc.label}</span>
            <Badge tone={rt.tone}>{rt.icon} {rt.label}</Badge>
            {c.refId && (
              href ? <Link to={href}><Badge tone="accent">{c.refId} · {c.refTitle}</Badge></Link>
                   : <Badge tone="gray">{c.refId} · {c.refTitle}</Badge>
            )}
          </div>
          <div className="li-sub" style={{ whiteSpace: 'normal', marginTop: 3 }}>
            Entrega: {c.from || '—'} → <b>{c.to}</b>
            {c.note ? <div className="check-note">“{c.note}”</div> : null}
            <div className="muted-2" style={{ marginTop: 3 }}>
              {pending
                ? <>Solicitada por {c.requester} <RoleBadge role={c.requesterRole} /> · {fmt(c.at)}</>
                : <>Resuelta por {c.decidedBy || c.requester} <RoleBadge role={c.decidedRole || c.requesterRole} /> · {c.decidedAt ? fmt(c.decidedAt) : fmt(c.at)}</>}
              {c.decisionNote ? <div>Decisión: {c.decisionNote}</div> : null}
            </div>
          </div>
        </div>
        <Badge tone={st.tone} dot>{st.label}</Badge>
      </div>

      {pending && canDecide && (
        <div className="row wrap" style={{ gap: 8, marginTop: 10, alignItems: 'center' }}>
          <input
            className="grow mini"
            placeholder="Nota de la decisión (contexto para la bitácora, opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="btn danger sm" disabled={busy} onClick={() => onDecide?.(c.id, false, note.trim())}>
            ✕ Mantener como está
          </button>
          <button className="btn ok sm" disabled={busy} onClick={() => onDecide?.(c.id, true, note.trim())}>
            {busy ? 'Guardando…' : '✓ Autorizar el cambio'}
          </button>
        </div>
      )}
      {pending && !canDecide && (
        <div className="muted-2" style={{ fontSize: 11.5, marginTop: 6 }}>
          Pendiente de autorización por el equipo de portafolio (LPM, Business Owner, Epic Owner, RTE) o el Admin.
        </div>
      )}
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

const fmt = (iso) => (iso ? String(iso).replace('T', ' ').slice(0, 16) : '—');