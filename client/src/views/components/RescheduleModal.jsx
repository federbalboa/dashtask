import { useState } from 'react';
import { useToast } from '../../controllers/ToastContext.jsx';
import { TaskModel, IntakeModel } from '../../models/api.js';
import { Badge, Field } from './UI.jsx';
import { REASON_TYPES, REASON_CODES, reasonCodeMeta } from '../../config/reschedule.js';

const TYPE_HINTS = {
  incidencia:
    'Cambio ágil por algo que falló o que no se revisó a tiempo. Se aplica de inmediato y queda registrado para trazabilidad.',
  control_cambios:
    'El cambio se registra como solicitud y el equipo de portafolio (LPM, Business Owner, Epic Owner, RTE) la autoriza o decide mantener la fecha como estaba.',
};

/**
 * Modal único para reprogramar la fecha de entrega de una tarea o un intake.
 * La fecha de entrega (cuándo) es distinta del esfuerzo (story points): aquí
 * solo se gestiona la entrega y SIEMPRE queda identificado el motivo.
 */
export default function RescheduleModal({ kind, item, onClose, onChanged }) {
  const toast = useToast();
  const [date, setDate] = useState(item.currentDate || '');
  const [reasonType, setReasonType] = useState('incidencia');
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const current = item.currentDate || '';
  const isControl = reasonType === 'control_cambios';
  const days = current && date ? Math.round((new Date(date) - new Date(current)) / 86400000) : null;

  const pickType = (id) => {
    setReasonType(id);
    setReasonCode('');
  };

  const submit = async () => {
    setBusy(true);
    const payload = { to: date, reasonType, reasonCode, note: note.trim() };
    try {
      const res =
        kind === 'intake'
          ? await IntakeModel.reschedule(item.id, payload)
          : await TaskModel.reschedule(item.id, payload);
      if (isControl) {
        toast.success(`Solicitud de control de cambios ${res.change?.id} creada. El portafolio la revisará.`);
      } else {
        toast.success(`Entrega reprogramada a ${date}.`);
      }
      onChanged?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal reschedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="row" style={{ gap: 8 }}>
              <span className="mono muted-2">{item.id}</span>
              <Badge tone="gray">{kind === 'intake' ? 'Intake · fecha objetivo' : 'Tarea · entrega'}</Badge>
            </div>
            <h3 style={{ marginTop: 6 }}>Reprogramar la entrega</h3>
            <div className="muted-2" style={{ fontSize: 12.5, marginTop: 3 }}>
              El esfuerzo (story points) y la <b>fecha de entrega</b> son cosas distintas. Aquí se gestiona la entrega.
            </div>
          </div>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="grid cols-2" style={{ gap: 12 }}>
            <Field label="Fecha actual">
              <input type="date" value={current} readOnly disabled />
            </Field>
            <Field label="Nueva fecha de entrega *">
              <input type="date" value={date} min={current || undefined} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          {days !== null && (
            <div className="hint" style={{ marginTop: 8 }}>
              {days === 0
                ? 'La fecha queda igual que la actual.'
                : days > 0
                  ? `Desviación: ${days} día(s) después de la fecha actual.`
                  : `La entrega se adelanta ${Math.abs(days)} día(s). Se mantiene el control de cambios igualmente identificado.`}
            </div>
          )}

          <div className="section-title" style={{ marginTop: 22 }}>Motivo del cambio *</div>
          <div className="grid cols-2" style={{ gap: 10 }}>
            {REASON_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`reason-card ${reasonType === t.id ? 'on' : ''}`}
                onClick={() => pickType(t.id)}
              >
                <div className="row" style={{ gap: 8 }}>
                  <span className="reason-icon">{t.icon}</span>
                  <strong>{t.label}</strong>
                </div>
                <div className="reason-hint">{TYPE_HINTS[t.id]}</div>
                {t.id === 'incidencia' && <Badge tone="warn">Inmediato · sin aprobación</Badge>}
                {t.id === 'control_cambios' && <Badge tone="info">Requiere autorización del portafolio</Badge>}
              </button>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: 20 }}>¿Qué pasó exactamente? *</div>
          <div className="reason-chips">
            {(REASON_CODES[reasonType] || []).map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip-btn ${reasonCode === c.id ? 'on' : ''}`}
                onClick={() => setReasonCode(c.id)}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <Field label="Contexto (recomendado)">
            <textarea
              rows={3}
              placeholder={isControl
                ? 'Justifica el porqué del cambio para que el portafolio pueda autorizarlo…'
                : 'Ej. El requerimiento no venía completo: faltaba detallar el manejo de errores…'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          {isControl && (
            <div className="cc-info">
              <strong>🛂 Control de cambios</strong>
              <span>
                Se creará la solicitud <span className="mono">CHG-###</span>. La fecha <b>no se mueve</b> hasta que el equipo
                de portafolio la autorice; si decide mantenerla, queda todo documentado en la bitácora.
              </span>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          {reasonCode && (
            <span className="muted-2" style={{ fontSize: 12 }}>
              {reasonCodeMeta(reasonType, reasonCode).icon} {reasonCodeMeta(reasonType, reasonCode).label}
            </span>
          )}
          <button className={`btn ${isControl ? 'info' : 'primary'}`} onClick={submit} disabled={busy || !date || !reasonCode}>
            {busy ? 'Guardando…' : isControl ? 'Registrar solicitud de cambio' : 'Aplicar el cambio'}
          </button>
        </div>
      </div>
    </div>
  );
}