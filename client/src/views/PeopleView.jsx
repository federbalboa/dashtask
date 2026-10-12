import { useApi } from '../controllers/useApi.js';
import { useToast } from '../controllers/ToastContext.jsx';
import { UserModel, AdminModel } from '../models/api.js';
import { ROLES } from '../config/roles.js';
import { Card, Avatar, RoleBadge, Badge, Spinner } from './components/UI.jsx';

export default function PeopleView() {
  const toast = useToast();
  const { data, loading } = useApi(() => UserModel.list(), []);
  const users = data?.users || [];

  const reset = async () => {
    try {
      await AdminModel.reset();
      toast.success('Base de datos restablecida. Recargando…');
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <Spinner label="Cargando equipo…" />;

  return (
    <>
      <div className="page-head">
        <h1>Equipo & Roles</h1>
        <p>Usuarios del ART con su rol SAFe y responsabilidades. Todos usan la contraseña <span className="mono">demo123</span>.</p>
      </div>

      <div className="toolbar">
        <Badge tone="gray">{users.length} usuarios</Badge>
        <div className="spacer" />
        <button className="btn danger sm" onClick={reset}>↺ Restablecer datos de demo</button>
      </div>

      <div className="section-title">Usuarios de prueba</div>
      <div className="grid cols-3">
        {users.map((u) => {
          const role = ROLES[u.role] || {};
          return (
            <Card key={u.id}>
              <div className="row" style={{ gap: 12, marginBottom: 10 }}>
                <Avatar name={u.name} color={role.color} size={42} />
                <div className="stack">
                  <strong>{u.name}</strong>
                  <span className="muted-2" style={{ fontSize: 12 }}>{u.email}</span>
                </div>
              </div>
              <RoleBadge role={u.role} full />
              <div className="muted-2" style={{ fontSize: 12, marginTop: 8 }}>{u.title}</div>
            </Card>
          );
        })}
      </div>

      <div className="section-title">Responsabilidades por rol</div>
      <div className="grid cols-2">
        {Object.values(ROLES).map((r) => (
          <Card key={r.id} title={`${r.icon} ${r.label}`} hint={`Nivel: ${r.level}`}>
            <div className="badge accent" style={{ marginBottom: 10 }}>{r.level}</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
              {(RESPONSIBILITIES[r.id] || []).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}

const RESPONSIBILITIES = {
  lpm: ['Estrategia, financiamiento lean y gobierno del portafolio', 'Alinear estrategia con ejecución (épicas, presupuesto)', 'Revisar el flujo de valor de los value streams'],
  epic_owner: ['Coordinar una épica de portafolio en todo su ciclo de vida', 'Mantener el Lean Business Case actualizado', 'Definir MVP y criterios de éxito'],
  rte: ['Líder servicial del Agile Release Train (ART)', 'Facilitar PI Planning, ART Sync e Inspect & Adapt', 'Eliminar impedimentos y gestionar riesgos'],
  product_manager: ['Definir visión, roadmap y Features del ART', 'Voz del cliente; priorizar el Program Backlog', 'Aprobar alcance del PI'],
  system_architect: ['Autoridad técnica del ART y guardrails', 'Definir el Architecture Runway', 'Gestionar Enablers técnicos'],
  business_owner: ['Validar el valor de negocio del ART', 'Aprobar los PI Objectives', 'Participar en Inspect & Adapt'],
  scrum_master: ['Líder servicial del equipo ágil', 'Facilitar ceremonias y eliminar impedimentos', 'Coach y protección del flujo'],
  product_owner: ['Gestionar y priorizar el Team Backlog', 'Definir criterios de aceptación y aceptar trabajo', 'Alinear el equipo con el PI'],
  developer: ['Diseñar, construir, probar e integrar incrementos', 'Autoorganizarse y cumplir las Iteration Goals', 'Levantar impedimentos en el Daily'],
  intake_manager: ['Revisión primaria (triage) de los intakes', 'Verificar completitud y elegibilidad', 'Enrutar solicitudes al backlog'],
  team_lead: ['Conducir el checklist de la etapa de desarrollo del equipo', 'Acompañar a los desarrolladores y despejar dudas', 'Validar avance y levantar impedimentos del caballete'],
  tech_lead: ['Autoridad técnica del equipo: diseño y estándares', 'Marcar los puntos técnicos del checklist de desarrollo', 'Revisar enablers y deuda técnica'],
  admin: ['Administrar el sistema y otorgar permisos globales de checklist', 'Puede marcar cualquier punto del checklist (canMarkAnyChecklist)', 'Supervisar tablero, intakes y bitácoras'],
};
