import { Badge } from './UI.jsx';
import { changeStatusMeta, reasonCodeMeta } from '../../config/reschedule.js';

/** Historial de cambios de fecha de entrega (incidencias y control de cambios). */
export default function ChangeLog({ changes = [] }) {
  if (!changes || changes.length === 0) return null;
  const list = [...changes].reverse();
  return (
    <div className="list" style={{ gap: 6 }}>
      {list.map((c) => {
        const st = changeStatusMeta(c.status);
        const rc = reasonCodeMeta(c.reasonType, c.reasonCode);
        return (
          <div className="list-item audit-item" key={c.id}>
            <div className="li-main">
              <div className="li-title">
                <span className="mono muted-2">{c.id}</span>
                <span style={{ margin: '0 6px' }}>·</span>
                <span>{rc.icon} {rc.label}</span>
              </div>
              <div className="li-sub" style={{ whiteSpace: 'normal' }}>
                {c.from || '—'} → <b>{c.to}</b>
                {c.note ? <div className="check-note" style={{ marginTop: 4 }}>“{c.note}”</div> : null}
                <div className="muted-2" style={{ marginTop: 3 }}>
                  {c.status === 'pending'
                    ? `⏳ Solicitada por ${c.requester} · ${c.at?.replace('T', ' ').slice(0, 16)}`
                    : `${st.label} · ${c.decidedBy || c.requester} · ${c.at?.replace('T', ' ').slice(0, 16)}`}
                  {c.decisionNote ? <div>· Decisión: {c.decisionNote}</div> : null}
                </div>
              </div>
            </div>
            <Badge tone={st.tone} dot>{st.label}</Badge>
          </div>
        );
      })}
    </div>
  );
}