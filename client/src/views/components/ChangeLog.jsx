import { useState } from 'react';
import { Badge } from './UI.jsx';
import { changeStatusMeta, reasonCodeMeta } from '../../config/reschedule.js';

/**
 * Historial de cambios de fecha de entrega (incidencias y control de cambios).
 * Si el usuario puede decidir (equipo de portafolio / admin), las solicitudes
 * pendientes muestran aquí mismo los botones para autorizarlas o mantenerlas.
 */
export default function ChangeLog({ changes = [], canDecide = false, busyId = '', onDecide }) {
  if (!changes || changes.length === 0) return null;
  const list = [...changes].reverse();
  return (
    <div className="list" style={{ gap: 6 }}>
      {list.map((c) => {
        const st = changeStatusMeta(c.status);
        const rc = reasonCodeMeta(c.reasonType, c.reasonCode);
        const pending = c.status === 'pending';
        return (
          <ChangeItem
            key={c.id}
            c={c}
            st={st}
            rc={rc}
            pending={pending}
            canDecide={canDecide}
            busy={busyId === c.id}
            onDecide={onDecide}
          />
        );
      })}
    </div>
  );
}

function ChangeItem({ c, st, rc, pending, canDecide, busy, onDecide }) {
  const [note, setNote] = useState('');
  return (
    <div className="list-item audit-item" style={{ display: 'block' }}>
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div className="li-main" style={{ flex: 1 }}>
          <div className="li-title">
            <span className="mono muted-2">{c.id}</span>
            <span style={{ margin: '0 6px' }}>·</span>
            <span>{rc.icon} {rc.label}</span>
          </div>
          <div className="li-sub" style={{ whiteSpace: 'normal' }}>
            {c.from || '—'} → <b>{c.to}</b>
            {c.note ? <div className="check-note" style={{ marginTop: 4 }}>“{c.note}”</div> : null}
            <div className="muted-2" style={{ marginTop: 3 }}>
              {pending
                ? `⏳ Solicitada por ${c.requester} · ${c.at?.replace('T', ' ').slice(0, 16)}`
                : `${st.label} · ${c.decidedBy || c.requester} · ${c.at?.replace('T', ' ').slice(0, 16)}`}
              {c.decisionNote ? <div>· Decisión: {c.decisionNote}</div> : null}
            </div>
          </div>
        </div>
        <Badge tone={st.tone} dot>{st.label}</Badge>
      </div>

      {pending && canDecide && (
        <div className="row wrap" style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
          <input
            className="grow mini"
            placeholder="Nota de la decisión (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="btn danger sm" disabled={busy} onClick={() => onDecide?.(c, false, note.trim())}>✕ Mantener</button>
          <button className="btn ok sm" disabled={busy} onClick={() => onDecide?.(c, true, note.trim())}>
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
