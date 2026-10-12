import { useMemo, useState } from 'react';
import { useApi } from '../controllers/useApi.js';
import { useAuth } from '../controllers/AuthContext.jsx';
import { CeremonyModel } from '../models/api.js';
import { Card, Badge, Empty, Spinner } from './components/UI.jsx';

const LEVELS = ['Equipo', 'ART', 'Portafolio', 'Large Solution'];

export default function CeremoniesView() {
  const { user } = useAuth();
  const { data, loading } = useApi(() => CeremonyModel.list(), []);
  const [level, setLevel] = useState('all');
  const [mineOnly, setMineOnly] = useState(true);

  const ceremonies = data?.ceremonies || [];

  const filtered = useMemo(
    () =>
      ceremonies.filter((c) => {
        if (level !== 'all' && c.level !== level) return false;
        if (mineOnly && !(c.participants || []).includes(user.role)) return false;
        return true;
      }),
    [ceremonies, level, mineOnly, user.role]
  );

  if (loading) return <Spinner label="Cargando ceremonias…" />;

  return (
    <>
      <div className="page-head">
        <h1>Ceremonias SAFe</h1>
        <p>Cadencia de Scrum escalada: ceremonias de equipo, del ART y de portafolio, con sus participantes y responsabilidades.</p>
      </div>

      <div className="toolbar">
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="all">Todos los niveles</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <label className="row" style={{ gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          Solo donde participo ({user.role})
        </label>
      </div>

      {filtered.length === 0 ? (
        <Card><Empty>No hay ceremonias con estos filtros.</Empty></Card>
      ) : (
        <div className="grid cols-2">
          {filtered.map((c) => (
            <Card key={c.id} className="ceremony-card">
              <div className="cem-top">
                <Badge tone={c.level === 'Equipo' ? 'info' : c.level === 'ART' ? 'accent' : 'warn'}>{c.level}</Badge>
                <h4>{c.name}</h4>
              </div>
              <div className="who">
                🔁 {c.cadence} · ⏱ {c.duration}
                {c.nextDate ? ` · 📅 ${c.nextDate}` : ''}
              </div>
              <div className="tag-list">
                {(c.participantLabels || []).map((p) => <Badge key={p} tone="gray">{p}</Badge>)}
              </div>
              <div className="section-title" style={{ margin: '8px 0 6px' }}>Qué hace cada rol</div>
              <ul>
                {(c.whatEachDoes || []).map((w, i) => (
                  <li key={i}><strong>{w.role}:</strong> {w.action}</li>
                ))}
              </ul>
              <div className="tag-list">
                {(c.outputs || []).map((o) => <Badge key={o} tone="ok">📤 {o}</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
