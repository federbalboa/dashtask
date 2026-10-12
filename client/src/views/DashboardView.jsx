import { useAuth } from '../controllers/AuthContext.jsx';
import { useApi } from '../controllers/useApi.js';
import { DashboardModel } from '../models/api.js';
import { Spinner } from './components/UI.jsx';
import RoleDashboard from './dashboards/RoleDashboard.jsx';

export default function DashboardView() {
  const { user, roleMeta } = useAuth();
  const { data, loading, error } = useApi(() => DashboardModel.forRole(user.role), [user.role]);

  if (loading) return <Spinner label="Preparando tu dashboard…" />;
  if (error) return <div className="error-box">No se pudo cargar el dashboard: {error.message}</div>;
  if (!data) return null;

  return (
    <>
      <div className="page-head">
        <h1>Hola, {user.name.split(' ')[0]} 👋</h1>
        <p>{data.headline}</p>
      </div>
      <RoleDashboard data={data} />
    </>
  );
}
