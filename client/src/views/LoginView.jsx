import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../controllers/AuthContext.jsx';
import { ROLES } from '../config/roles.js';
import { AuthModel } from '../models/api.js';
import { Field } from './components/UI.jsx';

const FALLBACK = [
  { email: 'ing.intake@dashtask.io', role: 'intake_manager' },
  { email: 'pm@dashtask.io', role: 'product_manager' },
  { email: 'rte@dashtask.io', role: 'rte' },
  { email: 'product.owner@dashtask.io', role: 'product_owner' },
  { email: 'scrum.master@dashtask.io', role: 'scrum_master' },
  { email: 'lpm@dashtask.io', role: 'lpm' },
  { email: 'architect@dashtask.io', role: 'system_architect' },
  { email: 'business.owner@dashtask.io', role: 'business_owner' },
  { email: 'epic.owner@dashtask.io', role: 'epic_owner' },
  { email: 'admin@dashtask.io', role: 'admin' },
];

const GROUP_ORDER = [
  { key: 'portafolio', label: 'Portafolio', projects: '', match: (u) => ['lpm', 'epic_owner', 'business_owner'].includes(u.role) },
  { key: 'art', label: 'ART · Liderazgo', projects: '', match: (u) => ['rte', 'product_manager'].includes(u.role) && !u.team?.startsWith('Equipo') },
  { key: 'nebula', label: 'Equipo "Nébula"', projects: 'Cliente Digital · PCD · CORE', match: (u) => u.team === 'Equipo "Nébula"' },
  { key: 'cometa', label: 'Equipo "Cometa"', projects: 'Datos · ANA · DAT · BI', match: (u) => u.team === 'Equipo "Cometa"' },
  { key: 'vela', label: 'Equipo "Vela"', projects: 'Canales · BAN · CAN', match: (u) => u.team === 'Equipo "Vela"' },
  { key: 'soporte', label: 'Soporte · Sistema', projects: '', match: () => true },
];

export default function LoginView() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [email, setEmail] = useState('ing.intake@dashtask.io');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    AuthModel.catalog()
      .then((res) => { if (mounted) setCatalog(res.users); })
      .catch(() => { if (mounted) setCatalog(null); });
    return () => { mounted = false; };
  }, []);

  const doLogin = async (mail, pass) => {
    setError('');
    try {
      await login(mail, pass);
      navigate('/');
    } catch (e) {
      setError(e.message || 'No se pudo iniciar sesión.');
    }
  };

  const submit = (e) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const groups =
    catalog && Array.isArray(catalog) && catalog.length > 0
      ? GROUP_ORDER.map((g) => ({ ...g, users: catalog.filter((u) => g.match(u) && u.active !== false) })).filter((g) => g.users.length > 0)
      : [{ key: 'fallback', label: 'Acceso rápido', projects: '', users: FALLBACK }];

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="brand">
          <div className="brand-badge">🚀</div>
          <span>DashTask</span>
        </div>

        <div>
          <h1>El tablero SAFe de tu Agile Release Train</h1>
          <p className="lead">
            Un dashboard por rol donde cada usuario ve exactamente lo que le corresponde: intakes,
            backlog, ceremonias, PI Objectives, Kanban y métricas de flujo — todo sobre una base de
            datos local.
          </p>
          <div className="hero-roles">
            {Object.values(ROLES).map((r) => (
              <span className="chip" key={r.id} style={{ color: r.color, borderColor: `${r.color}55` }}>
                {r.icon} {r.short}
              </span>
            ))}
          </div>
        </div>

        <div className="muted-2" style={{ fontSize: 12 }}>
          React + Express · Arquitectura MVC · Base de datos JSON local
        </div>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <h2>Iniciar sesión</h2>
          <p className="sub">Usa una cuenta de prueba o elige un rol para entrar rápido.</p>

          {error && <div className="error-box">{error}</div>}

          <Field label="Correo">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@dashtask.io" autoComplete="username" />
          </Field>
          <Field label="Contraseña">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo123" autoComplete="current-password" />
          </Field>

          <button className="btn primary block" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <div className="quick-logins">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="nav-label" style={{ padding: '14px 2px 2px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span>{g.label}</span>
                  {g.projects && <span className="muted-2" style={{ fontSize: 11 }}>{g.projects}</span>}
                  <span className="muted-2" style={{ fontSize: 11, marginLeft: 'auto' }}>{g.users.length}</span>
                </div>
                {g.users.map((q) => {
                  const role = ROLES[q.role] || { icon: '👤', label: q.role, color: '#6366f1' };
                  const name = q.title ? `${q.name} · ${q.title}` : (q.name || role.label);
                  return (
                    <button
                      key={q.email}
                      type="button"
                      className="quick-btn"
                      onClick={() => doLogin(q.email, 'demo123')}
                      disabled={loading}
                      title={name}
                    >
                      <span style={{ color: role.color }}>
                        {role.icon} {name}
                      </span>
                      <span className="mono">{q.email}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}