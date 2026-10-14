import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../controllers/AuthContext.jsx';
import { Avatar, RoleBadge } from './UI.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true, roles: '*' },
  { to: '/backlog', label: 'Backlog (Proyectos › Épicas)', icon: '🧱', roles: '*' },
  { to: '/sprints', label: 'Sprints', icon: '🗓️', roles: '*' },
  { to: '/calendar', label: 'Calendario', icon: '📅', roles: '*' },
  { to: '/timeline', label: 'Timeline (Gantt)', icon: '📈', roles: '*' },
  { to: '/intakes', label: 'Intakes', icon: '📥', roles: ['intake_manager', 'lpm', 'epic_owner', 'product_manager', 'product_owner', 'business_owner', 'rte', 'system_architect'] },
  { to: '/kanban', label: 'Kanban', icon: '🗂️', roles: '*' },
  { to: '/ceremonies', label: 'Ceremonias', icon: '🔁', roles: '*' },
  { to: '/changes', label: 'Control de cambios', icon: '🛂', roles: ['lpm', 'business_owner', 'epic_owner', 'rte', 'product_manager', 'product_owner', 'admin'] },
  { to: '/blocks', label: 'Bloqueos', icon: '⛔', roles: ['lpm', 'business_owner', 'epic_owner', 'rte', 'product_manager', 'product_owner', 'system_architect', 'scrum_master', 'team_lead', 'tech_lead', 'developer', 'admin'] },
  { to: '/people', label: 'Equipo & Roles', icon: '👥', roles: '*' },
  { to: '/glosario', label: 'Glosario', icon: '📖', roles: '*' },
  { to: '/admin', label: 'Permisos (Admin)', icon: '🛡️', roles: ['admin'] },
];

const DETAIL_TITLES = [
  { prefix: '/tasks/', label: 'Detalle de tarea' },
  { prefix: '/epics/', label: 'Detalle de épica' },
  { prefix: '/projects/', label: 'Detalle de proyecto' },
];

export default function Layout({ children }) {
  const { user, roleMeta, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('dashtask.theme') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('dashtask.theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const allowed = (roles) => roles === '*' || roles.includes(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const title =
    DETAIL_TITLES.find((d) => location.pathname.startsWith(d.prefix))?.label ||
    NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))?.label ||
    'DashTask';

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-badge">🚀</div>
          <div>
            <div>DashTask</div>
            <div className="muted-2" style={{ fontSize: 11 }}>SAFe Dashboard</div>
          </div>
        </div>

        <div className="nav-label">Navegación</div>
        {NAV.filter((n) => allowed(n.roles)).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <span className="ico">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}

        <div className="sidebar-footer">
          <div className="user-pill">
            <Avatar name={user?.name} color={roleMeta?.color} />
            <div className="meta">
              <div className="name">{user?.name}</div>
              <div className="role">{roleMeta?.short}</div>
            </div>
          </div>
          <button className="btn ghost sm block" style={{ marginTop: 8 }} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="row" style={{ gap: 12 }}>
            <button className="btn ghost sm menu-btn" onClick={() => setOpen((o) => !o)} title="Menú">☰</button>
            <div>
              <h2>{title}</h2>
              <div className="sub">{roleMeta?.label} · {roleMeta?.level}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="btn sm ghost"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
            </button>
            <RoleBadge role={user?.role} />
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
