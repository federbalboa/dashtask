import { useApi } from '../controllers/useApi.js';
import { UserModel } from '../models/api.js';
import { Card, Badge, StatusBadge, ClassBadge, RoleBadge } from './components/UI.jsx';
import { getRole } from '../config/roles.js';

const INTAKE_STATUSES = ['new', 'triaged', 'prioritized', 'scheduled', 'returned', 'rejected'];
const CLASSES = [
  {
    value: 'Standard', tone: 'gray',
    label: 'Trabajo normal',
    why: 'No tiene urgencia especial por sí solo: se ordena contra los demás por WSJF. El gris simboliza el flujo estándar y neutral del equipo.',
  },
  {
    value: 'Fixed Date', tone: 'warn',
    label: 'Fecha comprometida',
    why: 'Tiene una fecha límite firme (lanzamiento, normativa, ventana de mercado). Si llega tarde, el valor se pierde. El naranja avisa "cuidado con el plazo".',
  },
  {
    value: 'Intangible', tone: 'info',
    label: 'Habilitador / técnico',
    why: 'Trabajo técnico o de arquitectura (enablers, deuda técnica) cuyo valor es indirecto y difícil de medir en dinero. El azul indica información/técnico, no entrega directa al cliente.',
  },
  {
    value: 'Expedite', tone: 'danger',
    label: 'Emergencia',
    why: 'Pase de atención de máxima prioridad: se adelanta a todo lo demás porque su retraso es crítico. El rojo marca el sentido de urgencia y de "bandeja especial".',
  },
];

const KANBAN = [
  { id: 'backlog', title: 'Backlog normal', wip: 'sin límite', note: 'Priorizada por WSJF y descompuesta en historias; aún no entra a un sprint.' },
  { id: 'in_progress', title: 'Work in Progress', wip: '5', note: 'El equipo la implementa. Es el "carril" donde se hace el trabajo.' },
  { id: 'qa', title: 'QA', wip: '5', note: 'Build desplegado a QA, pruebas y criterios de aceptación verificados.' },
  { id: 'uat', title: 'Staging Review / UAT', wip: '4', note: 'El negocio prueba en staging y aprueba la liberación.' },
  { id: 'release', title: 'Release', wip: 'sin límite', note: 'Se libera, se documenta en Release Notes / System Demo y se confirma el valor.' },
  { id: 'blocked', title: 'Bloqueado (excepción)', wip: 'excepción', note: 'No es una etapa del flujo: es una tarjeta detenida que vuelve a su etapa cuando se destraba.' },
];

const STAGES = [
  {
    id: 'backlog', title: 'Backlog normal', output: 'Priorizada y lista para el sprint',
    items: [
      { k: 'backlog-pm', label: 'Priorizada por WSJF en el Program Backlog', role: 'product_manager' },
      { k: 'backlog-po', label: 'Descompuesta en historias de usuario', role: 'product_owner' },
      { k: 'backlog-rte', label: 'Impacto en la capacidad del ART evaluado', role: 'rte' },
    ],
  },
  {
    id: 'in_progress', title: 'Work in Progress', output: 'Incremento implementado',
    items: [
      { k: 'wip-dev', label: 'Implementación completada y commiteada', role: 'developer' },
      { k: 'wip-tests', label: 'Pruebas unitarias en verde', role: 'developer' },
      { k: 'wip-arch', label: 'Guardrails técnicos respetados', role: 'system_architect' },
    ],
  },
  {
    id: 'qa', title: 'QA', output: 'Incremento verificado',
    items: [
      { k: 'qa-deploy', label: 'Build desplegado al ambiente de QA', role: 'developer' },
      { k: 'qa-ac', label: 'Criterios de aceptación validados', role: 'product_owner' },
      { k: 'qa-nfr', label: 'Revisión no funcional (seguridad / performance)', role: 'system_architect' },
    ],
  },
  {
    id: 'uat', title: 'Staging Review / UAT', output: 'Validación de negocio en staging',
    items: [
      { k: 'uat-po', label: 'Casos UAT ejecutados por el equipo', role: 'product_owner' },
      { k: 'uat-bo', label: 'Validación de negocio (UAT) aprobada', role: 'business_owner' },
      { k: 'uat-pm', label: 'Alcance confirmado para liberación', role: 'product_manager' },
    ],
  },
  {
    id: 'release', title: 'Release', output: 'Valor liberado y demostrado',
    items: [
      { k: 'rel-rte', label: 'Incluida en Release Notes / System Demo', role: 'rte' },
      { k: 'rel-arch', label: 'Checklist de despliegue a producción firmado', role: 'system_architect' },
      { k: 'rel-bo', label: 'Valor de negocio confirmado', role: 'business_owner' },
    ],
  },
];

const ROLES_GLO = ['lpm', 'epic_owner', 'rte', 'product_manager', 'system_architect', 'business_owner', 'scrum_master', 'product_owner', 'developer', 'intake_manager', 'team_lead', 'tech_lead', 'admin'];

export default function GlosarioView() {
  const { data } = useApi(() => UserModel.roles(), []);
  const rolesMeta = (data?.roles || []).reduce((acc, r) => { acc[r.id] = r; return acc; }, {});
  return (
    <>
      <div className="page-head">
        <h1>Glosario</h1>
        <p>Qué significa cada campo, clase, fase y valor — ordenado por dónde aparece la información.</p>
      </div>

      {/* ============ 1. INTAKES ============ */}
      <Card title="1 · Intakes — los campos" tight>
        <p className="muted" style={{ marginBottom: 14 }}>
          Un <strong>intake</strong> es una solicitud que entra al sistema antes del backlog: se revisa su
          completitud (revisión primaria), se enriquece en el <em>Grooming / Backlog Review</em> con
          perspectivas y estimaciones por rol y, si procede, se prioriza y se programa en el PI.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th style={{ width: 170 }}>Campo</th><th>Qué significa</th></tr></thead>
            <tbody>
              <tr>
                <td className="title-cell">Tipo</td>
                <td>
                  Qué clase de trabajo es: <Badge tone="gray">Feature</Badge> (capacidad para el cliente),
                  <Badge tone="gray">Enabler</Badge> (trabajo técnico que habilita features),
                  <Badge tone="gray">Story</Badge> (historia de usuario),
                  <Badge tone="gray">Defect</Badge> (defecto / bug), <Badge tone="gray">Epic</Badge> (iniciativa grande de portafolio).
                </td>
              </tr>
              <tr>
                <td className="title-cell">Clase de servicio</td>
                <td>Política de atención del trabajo y su urgencia. Determina el <ClassBadge value="Standard" /> que ves (ver sección 1b).</td>
              </tr>
              <tr>
                <td className="title-cell">Completitud</td>
                <td>
                  Checklist de requisitos de información (título, descripción, tipo, solicitante, valor de negocio,
                  criterios de aceptación, estimación, dependencias, NFR). <strong>100% = apto para aprobar</strong>.
                </td>
              </tr>
              <tr>
                <td className="title-cell">Complejidad / Estimación</td>
                <td>
                  Tamaño del trabajo: talla T-shirt <Badge tone="info">S / M / L / XL</Badge> o Story Points
                  (<Badge tone="accent">SP</Badge>). En la revisión conjunta cada rol estima SP y se usa el promedio como consenso.
                </td>
              </tr>
              <tr>
                <td className="title-cell">Prioridad</td>
                <td>Veredicto subjetivo del solicitante/revisión: <Badge tone="gray">Baja</Badge>, <Badge tone="accent">Media</Badge>, <Badge tone="warn">Alta</Badge> o <Badge tone="danger">Crítica</Badge>.</td>
              </tr>
              <tr>
                <td className="title-cell">WSJF</td>
                <td>
                  <strong>Weighted Shortest Job First</strong>: <code>Costo del retraso ÷ Tamaño del trabajo</code>.
                  Costo del retraso = valor para el usuario + valor temporal + valor de riesgo. Ordena qué se hace primero:
                  mayor WSJF = mayor prioridad relativa al tamaño.
                </td>
              </tr>
              <tr>
                <td className="title-cell">Estado</td>
                <td style={{ whiteSpace: 'normal' }}>
                  Ciclo de vida del intake:
                  {' '}{INTAKE_STATUSES.map((s) => <StatusBadge status={s} key={s} />)}
                  <div className="muted-2" style={{ fontSize: 12, marginTop: 6 }}>
                    <strong>Nuevo</strong> entró y puede faltarle información · <strong>Triado</strong> aprobado por revisión
                    primaria · <strong>Priorizado</strong> con WSJF tras la revisión conjunta · <strong>Programado</strong> asignado
                    a PI/iteración · <strong>Devuelto</strong>/<strong>Rechazado</strong> con motivo.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="1b · Clases de servicio — para qué sirve cada una y por qué su color" tight>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th style={{ width: 170 }}>Clase</th><th>Para qué está</th><th>Por qué ese color</th></tr></thead>
            <tbody>
              {CLASSES.map((c) => (
                <tr key={c.value}>
                  <td><ClassBadge value={c.value} /></td>
                  <td className="title-cell">{c.label} — {c.why.split('. ').slice(0, 2).join('. ')}.</td>
                  <td className="muted">{c.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ============ 2. KANBAN Y BACKLOG ============ */}
      <Card title="2a · Tablero Kanban y Backlog normal — para qué sirve cada uno" tight>
        <p className="muted" style={{ marginBottom: 14 }}>
        El <strong>Backlog normal</strong> y el <strong>tablero Kanban</strong> son la misma cola, vista en dos estados:
        mientras la tarea está "en backlog" es trabajo priorizado y descompuesto que aún no se comprometió a un sprint;
        el tablero la lleva desde que el equipo la toma hasta que se libera el valor.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Columna</th><th>Límite WIP</th><th>Qué pasa ahí</th></tr></thead>
            <tbody>
              {KANBAN.map((c) => (
                <tr key={c.id}>
                  <td><Badge tone={c.id === 'blocked' ? 'danger' : c.id === 'release' ? 'ok' : c.id === 'qa' || c.id === 'in_progress' ? 'accent' : 'gray'}>{c.title}</Badge></td>
                  <td className="mono muted">{c.wip}</td>
                  <td className="muted">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="2b · Fases, para qué sirven y cómo se pasa de una a otra" tight>
        <p className="muted" style={{ marginBottom: 14 }}>
          Cada etapa tiene un <strong>checklist</strong>. Clic en el <strong>"✓" de cada ítem</strong> (lo marca el rol dueño)
          y cuando el checklist de la etapa está al 100% se habilita el avance. Todo movimiento queda en la <strong>bitácora</strong> de la tarea.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Etapa</th><th>Para qué sirve (salida)</th><th>Checklist (quién lo completa)</th></tr></thead>
            <tbody>
              {STAGES.map((s) => (
                <tr key={s.id}>
                  <td className="title-cell" style={{ whiteSpace: 'nowrap' }}>
                    <Badge tone={s.id === 'release' ? 'ok' : s.id === 'qa' ? 'warn' : s.id === 'uat' ? 'info' : s.id === 'in_progress' ? 'accent' : 'gray'}>{s.title}</Badge>
                  </td>
                  <td>{s.output}</td>
                  <td>
                    <div className="stack" style={{ gap: 4 }}>
                      {s.items.map((it) => (
                        <div key={it.k} className="row" style={{ gap: 6 }}>
                          <code className="mono muted-2" style={{ fontSize: 11 }}>{it.k}</code>
                          <span>{it.label}</span>
                          <RoleBadge role={it.role} />
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-title" style={{ marginTop: 18 }}>Reglas para moverse entre fases</div>
        <div className="list" style={{ gap: 8, marginTop: 8 }}>
          <div className="list-item"><div className="li-main"><div className="li-title">➡ Avanzar</div><div className="li-sub">Solo se puede pasar a la siguiente etapa cuando la etapa actual está <strong>100% completada</strong>. Si falta un ítem, el sistema lo indica (error 422 con los pendientes).</div></div></div>
          <div className="list-item"><div className="li-main"><div className="li-title">⬅ Retroceder (regresión)</div><div className="li-sub">Se permite devolver una tarea a una etapa anterior (ej. QA → WIP) para corregir. Queda <strong>registrado en la bitácora</strong> con persona y motivo.</div></div></div>
          <div className="list-item"><div className="li-main"><div className="li-title">⛔ Bloquear / desbloquear</div><div className="li-sub">Es una <strong>excepción</strong>, no una etapa real: se pide un motivo y al desbloquear la tarjeta vuelve a la etapa en la que estaba.</div></div></div>
          <div className="list-item"><div className="li-main"><div className="li-title">🚧 Límites WIP</div><div className="li-sub">No se puede mover una tarjeta a una columna que ya alcanzó su límite (WIP 5 · 5 · 4). El tablero avisa "WIP excedido".</div></div></div>
          <div className="list-item"><div className="li-main"><div className="li-title">👤 ¿Quién mueve la tarjeta?</div><div className="li-sub">Cualquier rol puede arrastrar el estado desde la tarjeta. Pero <strong>solo el rol dueño de cada ítem</strong> puede marcar el checklist, salvo delegación (ver 2c).</div></div></div>
        </div>
      </Card>

      <Card title="2c · Quién es responsable de qué" tight>
        <p className="muted" style={{ marginBottom: 14 }}>
          Cada ítem del checklist pertenece a un rol (<em>dueño</em>). El <RoleBadge role="team_lead" /> y el <RoleBadge role="tech_lead" /> pueden
          marcar los ítems <em>developer</em> por delegación, y el <RoleBadge role="admin" /> o un usuario con permiso global puede marcar
          cualquiera. El dashboard te dice qué ítems <strong>puedes cerrar ahora</strong> ("Me toca intervenir").
        </p>
        <div className="list" style={{ gap: 6 }}>
          {ROLES_GLO.map((r) => {
            const meta = getRole(r);
            const server = rolesMeta[r];
            const resp = (server?.responsibilities || []);
            return (
              <div className="list-item" key={r}>
                <div className="li-main">
                  <div className="li-title"><RoleBadge role={r} full /> <span className="muted-2" style={{ fontSize: 11 }}>· {meta.level}</span></div>
                  <div className="li-sub">{resp.length ? resp.join(' · ') : meta.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ============ 3. VALOR DE NEGOCIO / BV ============ */}
      <Card title="3 · Valor de negocio (BV) y el objetivo" tight>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th style={{ width: 180 }}>Concepto</th><th>Qué significa</th></tr></thead>
            <tbody>
              <tr>
                <td className="title-cell">Objetivo (PI Objective)</td>
                <td>
                  Meta de negocio del equipo para el <strong>Programa Increment (PI)</strong>, escrita como resultado
                  (ej. "Habilitar onboarding self-service"). Se define en el <strong>PI Planning</strong> y aparece en el
                  dashboard de LPM y Product Management.
                </td>
              </tr>
              <tr>
                <td className="title-cell">BV — Business Value</td>
                <td>
                  <strong>Puntaje de 1 a 10</strong> que el <RoleBadge role="business_owner" /> asigna a cada objetivo: cuánto aporta
                  ese resultado al negocio. El dashboard suma el <strong>BV total del PI</strong>. Se usa para decidir/validar
                  alcance al cierre del PI (Inspect &amp; Adapt).
                </td>
              </tr>
              <tr>
                <td className="title-cell">Tipo del objetivo</td>
                <td>
                  <Badge tone="ok">Committed</Badge> = comprometido y garantizado por el equipo · <Badge tone="gray">Uncommitted</Badge> = de mejor esfuerzo (buffer de confianza).
                </td>
              </tr>
              <tr>
                <td className="title-cell">Valor de negocio en intake</td>
                <td>
                  En Intakes el campo "Valor de negocio" es <strong>cualitativo</strong>: la justificación en texto
                  (ej. "Reducción de costo operativo 25%"). Se vuelve numérico (WSJF, BV) cuando el trabajo se prioriza y compromete.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}