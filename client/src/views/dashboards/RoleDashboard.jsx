import { useNavigate } from 'react-router-dom';
import { Card, StatRow, StatusBadge, ClassBadge, Badge, Bar, Empty, RoleBadge } from '../components/UI.jsx';

/* ---------- widgets reutilizables ---------- */

/** "Me toca intervenir": deep-link directo al punto del checklist que debo marcar. */
export function TurnList({ turns = [] }) {
  const nav = useNavigate();
  const myCount = turns.length;
  return (
    <Card
      title="Me toca intervenir"
      hint={`${myCount} pendiente${myCount === 1 ? '' : 's'}: el paso anterior ya está hecho`}
      actions={myCount > 0 ? <Badge tone="accent" dot>{myCount}</Badge> : <Badge tone="ok">Sin pendientes</Badge>}
    >
      {myCount === 0 ? (
        <Empty>No hay puntos del checklist que puedas cerrar en este momento.</Empty>
      ) : (
        <div className="list">
          {turns.map((t) => (
            <button
              key={`${t.taskId}:${t.key}`}
              className="list-item turn-item"
              onClick={() => nav(`/tasks/${t.taskId}?focus=${encodeURIComponent(t.key)}&stage=${encodeURIComponent(t.stage)}`)}
            >
              <div className="li-main">
                <div className="li-title">{t.taskTitle}</div>
                <div className="li-sub mono">{t.taskId} · <RoleBadge role={t.role} /> · {t.stage}</div>
                <div className="li-sub">{t.label}</div>
              </div>
              <span className="li-go">Ir →</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Tiempos de respuesta por persona (calculados desde la bitácora del checklist). */
export function ResponseMetrics({ metrics = [] }) {
  return (
    <Card title="Tiempos de respuesta por persona" hint="Desde la bitácora del checklist (primer done por etapa)" tight>
      {metrics.length === 0 ? (
        <Empty>La bitácora aún no tiene cierres de checklist por registrar.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Persona</th><th>Cierres</th><th>Prom. horas</th><th>Prom. días</th></tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.name}>
                  <td className="title-cell">{m.name}</td>
                  <td><Badge tone="accent">{m.completions}</Badge></td>
                  <td className="mono">{m.avgWaitHours}</td>
                  <td className="mono">{m.avgWaitDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Últimas acciones registradas en la bitácora (quién marcó / regresó / bloqueó). */
export function RecentActions({ actions = [] }) {
  const tone = (a) => (a.action === 'backward' ? 'warn' : a.type === 'blocked' ? 'danger' : '');
  return (
    <Card title="Bitácora reciente" hint="Últimos movimientos del checklist y de etapas" tight>
      {actions.length === 0 ? (
        <Empty>Sin movimientos registrados.</Empty>
      ) : (
        <div className="list">
          {actions.map((a, i) => (
            <div className="list-item" key={i}>
              <div className="li-main">
                <div className="li-title">{a.actor || '—'} <span className="muted">· {a.taskTitle}</span></div>
                <div className="li-sub">{a.note || `${a.taskId} · ${a.type}/${a.action}`}</div>
              </div>
              <Badge tone={tone(a)}>{a.at?.slice(0, 16) || '—'}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function PIHeader({ pi }) {
  if (!pi) return null;
  return (
    <Card
      title={pi.name}
      hint="Program Increment actual"
      actions={<Badge tone={pi.status === 'In Progress' ? 'ok' : 'gray'} dot>{pi.status}</Badge>}
    >
      <div className="row wrap" style={{ justifyContent: 'space-between', gap: 16 }}>
        <div className="row wrap" style={{ gap: 22 }}>
          <div className="stack">
            <span className="muted-2" style={{ fontSize: 11 }}>PERIODO</span>
            <span>{pi.startDate} → {pi.endDate}</span>
          </div>
          <div className="stack">
            <span className="muted-2" style={{ fontSize: 11 }}>ITERACIONES</span>
            <span className="row wrap" style={{ gap: 6 }}>
              {pi.iterations?.map((it) => <Badge key={it} tone="info">{it}</Badge>)}
            </span>
          </div>
          <div className="stack">
            <span className="muted-2" style={{ fontSize: 11 }}>VOTO DE CONFIANZA</span>
            <span>{pi.confidenceVote?.avg ?? '—'} / 5</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function IntakeRow({ i }) {
  return (
    <tr>
      <td className="mono muted">{i.id}</td>
      <td className="title-cell">{i.title}</td>
      <td><ClassBadge value={i.class} /></td>
      <td>{i.wsjf ?? '—'}</td>
      <td>
        <div className="row" style={{ gap: 8 }}>
          <Bar value={i.completeness?.percent || 0} tone={(i.completeness?.percent || 0) === 100 ? 'ok' : 'warn'} />
          <span className="muted mono">{i.completeness?.percent ?? 0}%</span>
        </div>
      </td>
      <td><StatusBadge status={i.status} /></td>
    </tr>
  );
}

export function IntakeTable({ intakes = [], title = 'Intakes', action }) {
  return (
    <Card title={title} actions={action} tight>
      {intakes.length === 0 ? (
        <Empty />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Título</th><th>Clase</th><th>WSJF</th><th>Completitud</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {intakes.map((i) => <IntakeRow key={i.id} i={i} />)}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function TaskRow({ t }) {
  return (
    <tr>
      <td className="mono muted">{t.id}</td>
      <td className="title-cell">{t.title}</td>
      <td><Badge tone="gray">{t.type}</Badge></td>
      <td className="muted">{t.assignee || '—'}</td>
      <td>{t.storyPoints ?? '—'}</td>
      <td><StatusBadge status={t.status} /></td>
    </tr>
  );
}

export function TaskTable({ tasks = [], title = 'Tareas', action }) {
  return (
    <Card title={title} actions={action} tight>
      {tasks.length === 0 ? (
        <Empty />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Título</th><th>Tipo</th><th>Responsable</th><th>SP</th><th>Estado</th></tr>
            </thead>
            <tbody>{tasks.map((t) => <TaskRow key={t.id} t={t} />)}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function BoardSummary({ board = [] }) {
  const totalWip = board.reduce((s, c) => s + c.count, 0);
  return (
    <Card title="Flujo del tablero (WIP)" hint={`${totalWip} tarjetas en curso`}>
      {board.map((c) => (
        <div className="progress-row" key={c.id}>
          <div>
            <div className="label">{c.title}</div>
            <Bar value={c.count} max={c.wip || Math.max(totalWip, 1)} tone={c.overWip ? 'danger' : ''} />
          </div>
          <div className={`val ${c.overWip ? '' : 'muted'}`} style={c.overWip ? { color: 'var(--danger)' } : {}}>
            {c.count}{c.wip ? ` / ${c.wip}` : ''}
          </div>
        </div>
      ))}
    </Card>
  );
}

export function CeremonyList({ ceremonies = [], limit }) {
  const list = limit ? ceremonies.slice(0, limit) : ceremonies;
  return (
    <Card title="Próximas ceremonias" hint={`${ceremonies.length} en tus responsabilidades`}>
      {list.length === 0 ? (
        <Empty />
      ) : (
        <div className="list">
          {list.map((c) => (
            <div className="list-item" key={c.id}>
              <div className="li-main">
                <div className="li-title">{c.name}</div>
                <div className="li-sub">{c.level} · {c.cadence} · {c.duration}</div>
              </div>
              <Badge tone="info">{c.nextDate}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function RiskList({ risks = [], title = 'Riesgos / ROAM' }) {
  return (
    <Card title={title}>
      {risks.length === 0 ? (
        <Empty>Sin riesgos registrados.</Empty>
      ) : (
        <div className="list">
          {risks.map((r, i) => (
            <div className="list-item" key={i}>
              <div className="li-main">
                <div className="li-title">{r.description}</div>
                <div className="li-sub">Responsable: {r.owner}</div>
              </div>
              <Badge tone={r.impact === 'Alto' ? 'danger' : 'warn'}>{r.impact}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ObjectiveTable({ objectives = [] }) {
  const totalBv = objectives.reduce((s, o) => s + (o.businessValue || 0), 0);
  return (
    <Card title="PI Objectives" hint={`Business Value total: ${totalBv}`} tight>
      {objectives.length === 0 ? (
        <Empty />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Equipo</th><th>Objetivo</th><th>BV</th><th>Tipo</th></tr></thead>
            <tbody>
              {objectives.map((o, i) => (
                <tr key={i}>
                  <td><Badge tone="info">{o.team}</Badge></td>
                  <td className="title-cell">{o.objective}</td>
                  <td>{o.businessValue}</td>
                  <td>
                    <Badge tone={o.committed ? 'ok' : 'gray'}>{o.committed ? 'Comprometido' : 'No comprometido'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function WSJFQueue({ items = [] }) {
  return (
    <Card title="Cola priorizada (WSJF)" hint="Cost of Delay ÷ Job Size" tight>
      {items.length === 0 ? (
        <Empty />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Título</th><th>Value Stream</th><th>WSJF</th><th>Prioridad</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="mono muted">{i.id}</td>
                  <td className="title-cell">{i.title}</td>
                  <td className="muted">{i.valueStream || '—'}</td>
                  <td><Badge tone="accent">{i.wsjf}</Badge></td>
                  <td>{i.priority || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function DependencyList({ dependencies = [] }) {
  return (
    <Card title="Dependencias entre equipos">
      {dependencies.length === 0 ? (
        <Empty>Sin dependencias.</Empty>
      ) : (
        <div className="list">
          {dependencies.map((d, i) => (
            <div className="list-item" key={i}>
              <div className="li-main">
                <div className="li-title">{d.title}</div>
                <div className="li-sub mono">{d.from} → {d.dependsOn}</div>
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function UsersGrid({ users = [] }) {
  return (
    <Card title="Equipo" hint={`${users.length} miembros`}>
      <div className="grid cols-2">
        {users.map((u) => (
          <div className="list-item" key={u.id} style={{ border: '1px solid var(--border-soft)', borderRadius: 9 }}>
            <div className="li-main">
              <div className="li-title">{u.name}</div>
              <div className="li-sub">{u.team}</div>
            </div>
            <RoleBadge role={u.role} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- registry por rol ---------- */

const REGISTRY = {
  intake_manager: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Cola de revisión primaria</div>
      <IntakeTable intakes={d.queue} title="Intakes entrantes y su completitud" />
      <div className="section-title">Tus ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  lpm: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Portafolio</div>
      <PIHeader pi={d.programIncrement} />
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <WSJFQueue items={d.wsjfQueue} />
        <Card title="Value Streams" hint="Distribución de intakes">
          {(d.valueStreams || []).map((v) => (
            <div className="progress-row" key={v.label}>
              <div>
                <div className="label">{v.label}</div>
                <Bar value={v.count} max={Math.max(...(d.valueStreams || []).map((x) => x.count), 1)} />
              </div>
              <div className="val">{v.count}</div>
            </div>
          ))}
        </Card>
      </div>
      <div className="section-title">PI Objectives</div>
      <ObjectiveTable objectives={d.piObjectives} />
      <div className="section-title">Tus ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  epic_owner: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Épicas en análisis</div>
      <IntakeTable intakes={d.epics} title="Épicas del portafolio (Lean Business Case)" />
      <div className="section-title">Dependencias</div>
      <DependencyList dependencies={d.dependencies} />
      <div className="section-title">Tus ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  rte: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Program Increment</div>
      <PIHeader pi={d.programIncrement} />
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <BoardSummary board={d.board} />
        <RiskList risks={d.risks} />
      </div>
      <div className="section-title">Impedimentos activos</div>
      <TaskTable tasks={d.blocked} title="Tickets bloqueados" />
      <div className="section-title">Dependencias</div>
      <DependencyList dependencies={d.dependencies} />
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <ResponseMetrics metrics={d.responseMetrics} />
        <RecentActions actions={d.recentActions} />
      </div>
      <div className="section-title">Tus ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  product_manager: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Program Backlog</div>
      <WSJFQueue items={d.wsjfQueue} />
      <div className="section-title">Features y roadmap</div>
      <TaskTable tasks={d.features} title="Features / stories del ART" />
      <Card title="Roadmap del PI" hint={d.programIncrement?.name}>
        <div className="row wrap" style={{ gap: 8 }}>
          {(d.roadmap || []).map((it) => <Badge key={it} tone="info">{it}</Badge>)}
        </div>
      </Card>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <ResponseMetrics metrics={d.responseMetrics} />
        <RecentActions actions={d.recentActions} />
      </div>
      <div className="section-title">Tus ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  system_architect: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Architecture Runway</div>
      <TaskTable tasks={d.enablers} title="Enablers técnicos" />
      <div className="section-title">Dependencias</div>
      <DependencyList dependencies={d.dependencies} />
      <div className="section-title">Tus ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  business_owner: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Valor de negocio</div>
      <ObjectiveTable objectives={d.objectives} />
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <RiskList risks={d.risks} />
        <CeremonyList ceremonies={d.roleCeremonies} />
      </div>
      <div className="section-title">Aceptación de trabajo</div>
      <TaskTable tasks={d.acceptance} title="En revisión o aceptadas" />
    </>
  ),

  scrum_master: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="grid cols-2">
        <BoardSummary board={d.board} />
        <CeremonyList ceremonies={d.roleCeremonies} />
      </div>
      <div className="section-title">Impedimentos del equipo</div>
      <TaskTable tasks={d.blocked} title="Bloqueados" />
      <div className="section-title">Equipo</div>
      <UsersGrid users={d.team} />
    </>
  ),

  product_owner: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Team Backlog</div>
      <TaskTable tasks={d.teamBacklog} title="Backlog del equipo (backlog / refining / ready)" />
      <div className="section-title">Tus ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  developer: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Mis tareas</div>
      <TaskTable tasks={d.myTasks} title="Asignadas a mí" />
      <div className="section-title">Estado del tablero</div>
      <BoardSummary board={d.board} />
      <div className="section-title">Mis ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  team_lead: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Checklist del área de desarrollo</div>
      <TaskTable
        tasks={d.devPending.map((p) => ({
          id: p.taskId,
          title: `${p.label} — ${p.taskTitle}`,
          type: p.role,
          assignee: p.note || 'dev',
          status: p.taskStatus,
        }))}
        title="Puntos del checklist que los leads pueden marcar"
      />
      <div className="section-title">Estado del tablero</div>
      <BoardSummary board={d.board} />
      <div className="section-title">Equipo</div>
      <UsersGrid users={d.team} />
      <div className="section-title">Mis ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  tech_lead: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Checklist técnico de desarrollo</div>
      <TaskTable
        tasks={d.devPending.map((p) => ({
          id: p.taskId,
          title: `${p.label} — ${p.taskTitle}`,
          type: p.role,
          assignee: p.note || 'dev',
          status: p.taskStatus,
        }))}
        title="Puntos técnicos que los leads pueden marcar"
      />
      <div className="section-title">Estado del tablero</div>
      <BoardSummary board={d.board} />
      <div className="section-title">Equipo</div>
      <UsersGrid users={d.team} />
      <div className="section-title">Mis ceremonias</div>
      <CeremonyList ceremonies={d.roleCeremonies} />
    </>
  ),

  admin: (d) => (
    <>
      <StatRow items={d.kpis} />
      <div className="section-title">Supervisión</div>
      <BoardSummary board={d.board} />
      <div className="section-title">Intakes</div>
      <IntakeTable intakes={d.intakes} title="Pendientes de revisión conjunta" />
    </>
  ),
};

export default function RoleDashboard({ data }) {
  const render = REGISTRY[data.role.id];
  const body = render ? render(data) : <StatRow items={data.kpis} />;
  // "Me toca intervenir" se muestra primero para todos los roles.
  return (
    <>
      <TurnList turns={data.myTurn} />
      {body}
    </>
  );
}
