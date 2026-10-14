import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './controllers/AuthContext.jsx';
import Layout from './views/components/Layout.jsx';
import { Spinner } from './views/components/UI.jsx';
import LoginView from './views/LoginView.jsx';
import DashboardView from './views/DashboardView.jsx';
import IntakesView from './views/IntakesView.jsx';
import KanbanView from './views/KanbanView.jsx';
import CeremoniesView from './views/CeremoniesView.jsx';
import PeopleView from './views/PeopleView.jsx';
import BacklogView from './views/BacklogView.jsx';
import TaskDetailView from './views/TaskDetailView.jsx';
import EpicDetailView from './views/EpicDetailView.jsx';
import ProjectDetailView from './views/ProjectDetailView.jsx';
import SprintsView from './views/SprintsView.jsx';
import CalendarView from './views/CalendarView.jsx';
import TimelineView from './views/TimelineView.jsx';
import AdminView from './views/AdminView.jsx';
import GlosarioView from './views/GlosarioView.jsx';
import ChangesView from './views/ChangesView.jsx';
import BlocksView from './views/BlocksView.jsx';

function Protected({ children }) {
  const { isAuthenticated, ready } = useAuth();
  if (!ready) return <Spinner label="Verificando sesión…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicOnly({ children }) {
  const { isAuthenticated, ready } = useAuth();
  if (!ready) return <Spinner label="Cargando…" />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginView /></PublicOnly>} />
      <Route path="/" element={<Protected><DashboardView /></Protected>} />
      <Route path="/intakes" element={<Protected><IntakesView /></Protected>} />
      <Route path="/backlog" element={<Protected><BacklogView /></Protected>} />
      <Route path="/sprints" element={<Protected><SprintsView /></Protected>} />
      <Route path="/calendar" element={<Protected><CalendarView /></Protected>} />
      <Route path="/timeline" element={<Protected><TimelineView /></Protected>} />
      <Route path="/kanban" element={<Protected><KanbanView /></Protected>} />
      <Route path="/ceremonies" element={<Protected><CeremoniesView /></Protected>} />
      <Route path="/people" element={<Protected><PeopleView /></Protected>} />
      <Route path="/glosario" element={<Protected><GlosarioView /></Protected>} />
      <Route path="/changes" element={<Protected><ChangesView /></Protected>} />
      <Route path="/blocks" element={<Protected><BlocksView /></Protected>} />
      <Route path="/admin" element={<Protected><AdminView /></Protected>} />
      <Route path="/tasks/:id" element={<Protected><TaskDetailView /></Protected>} />
      <Route path="/epics/:id" element={<Protected><EpicDetailView /></Protected>} />
      <Route path="/projects/:id" element={<Protected><ProjectDetailView /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
