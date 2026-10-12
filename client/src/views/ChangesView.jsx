import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { useAuth } from '../controllers/AuthContext.jsx';
import { ChangeModel } from '../models/api.js';
import { Card, Badge, Spinner, Field, RoleBadge } from './components/UI.jsx';
import { changeStatusMeta, reasonCodeMeta, reasonTypeMeta } from '../config/reschedule.js';

const DECIDE_ROLES = ['lpm', 'business_owner', 'epic_owner', 'rte', 'admin'];

export default function ChangesView() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, reload } = useApi(() => ChangeModel.list(), []);
  const [decide, setDecide] = useState(null);
  const [busy, setBusy] = useState('');
  const canDecide = DECIDE_ROLES.includes(user?.role);

  const changes = data?.changes || [];
  const stats = data?.stats;
  const pending = changes.filter((c) => c.status === 'pending');

  const { applied, decided: decidedList } = useMemo(() => {
    return {
      applied: pending,
      decided: changes.filter((c) => c.status !== 'pending'),
    };
  }, [changes]);

  const act = async (id, approve) => {
    setBusy(id);
    try {
      await ChangeModel.decide(id, { approve, note: decide?.decisionNote || '' });
      toast.success(approve ? 'Cambio autorizado: la fecha de entrega se actualizó.' : 'Se mantiene la fecha como estaba.');
      setDecide(null);
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
        <div className="stack" style={{ gap: 12 }}>
          {pending.map((c) => <ChangeRow key={c.id} c={c} />)}
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
                  placeholder="Ej. Se aprueba por compromiso contractual… / Se mantiene por capacidad del PI…"
                />
              </Field>
            </div>
            <div className="row wrap" style={{ gap: 10, alignItems: 'flex-end', paddingTop: 22 }}>
              <button className="btn danger" disabled={busy === decide.id} onClick={() => act(decide.id, false)}>✕ Mantener como está</button>
              <button className="btn ok" disabled={busy === decide.id} onClick={() => act(decide.id, true)}>✓ Autorizar el cambio</button>
            </div>
          </div>
        </div>
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

function ChangeRow({ c }) {
  const st = changeStatusMeta(c.status);
  const rt = reasonTypeMeta(c.reasonType);
  const rc = reasonCodeMeta(c.reasonType, c.reasonCode);
  const href = c.scope === 'intake' ? null : `/tasks/${c.refId}`;
  return (
    <div className="list-item audit-item">
      <div className="li-main">
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
            {c.status === 'pending'
              ? <>Solicitada por {c.requester} <RoleBadge role={c.requesterRole} /> · {fmt(c.at)}</>
              : <>Resuelta por {c.decidedBy || c.requester} <RoleBadge role={c.decidedRole || c.requesterRole} /> · {c.decidedAt ? fmt(c.decidedAt) : fmt(c.at)}</>}
            {c.decisionNote ? <div>Decisión: {c.decisionNote}</div> : null}
          </div>
        </div>
      </div>
      <Badge tone={st.tone} dot>{st.label}</Badge>
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