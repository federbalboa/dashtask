import { Badge, Card, Empty, Avatar } from './UI.jsx';

const keyOf = (person) => `${person.kind}:${person.userId}`;

/**
 * Panel izquierdo del tablero de planificación.
 * Muestra el proyecto activo, el equipo registrado y los candidatos.
 * Cada persona es arrastrable (drag & drop) o seleccionable con clic para
 * asignarla a un sprint del tablero.
 */
export default function ResourcePool({
  projects,
  projectId,
  registered = [],
  candidates = [],
  picked,
  onPick,
  onDragStart,
  onDragEnd,
  onRemoveResource,
  busy,
}) {
  if (!projects.length) {
    return <Card title="Equipo"><Empty>No hay proyectos disponibles.</Empty></Card>;
  }

  const isPicked = (person) => picked && keyOf(picked) === keyOf(person);

  return (
    <Card
      title="Equipo del proyecto"
      hint="Arrastra una persona a una tarjeta de sprint, o selecciónala y haz clic en el sprint."
    >
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span className="section-title" style={{ margin: 0 }}>En el proyecto</span>
        <Badge tone="gray">{registered.length}</Badge>
      </div>
      {registered.length === 0 ? (
        <div className="muted-2" style={{ fontSize: 12, marginBottom: 12 }}>Aún no registraste personas en este proyecto.</div>
      ) : (
        <div className="stack" style={{ gap: 6, marginBottom: 16 }}>
          {registered.map((r) => (
            <PersonChip
              key={r.id || r.userId}
              person={{ kind: 'registered', userId: r.userId, resourceId: r.id, name: r.name, roleLabel: r.roleLabel, avatar: r.avatar }}
              picked={isPicked({ kind: 'registered', userId: r.userId })}
              onPick={onPick}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              badge={r.sprintIds?.length ? `${r.sprintIds.length} sprint(s)` : null}
              onRemove={onRemoveResource ? () => onRemoveResource(r) : null}
              busy={busy}
            />
          ))}
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span className="section-title" style={{ margin: 0 }}>Candidatos</span>
        <Badge tone="gray">{candidates.length}</Badge>
      </div>
      {candidates.length === 0 ? (
        <div className="muted-2" style={{ fontSize: 12 }}>Sin candidatos disponibles.</div>
      ) : (
        <>
          <div className="muted-2" style={{ fontSize: 11.5, marginBottom: 8 }}>
            Al asignarlos se registran automáticamente en el proyecto.
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {candidates.map((c) => (
              <PersonChip
                key={c.userId}
                person={{ kind: 'candidate', userId: c.userId, name: c.name, roleLabel: c.roleLabel, avatar: c.avatar }}
                picked={isPicked({ kind: 'candidate', userId: c.userId })}
                onPick={onPick}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                dashed
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function PersonChip({ person, picked, onPick, onDragStart, onDragEnd, badge, onRemove, dashed, busy }) {
  return (
    <div
      className={`pool-chip${picked ? ' picked' : ''}${dashed ? ' dashed' : ''}`}
      draggable
      onDragStart={() => onDragStart?.(person)}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => onPick?.(person)}
      title="Arrastra o haz clic para asignar"
    >
      <Avatar name={person.name} size={26} />
      <span className="pool-chip-info">
        <b>{person.name}</b>
        <span className="muted-2">{person.roleLabel}</span>
      </span>
      {badge && <span className="chip-badge">{badge}</span>}
      {onRemove && (
        <button
          className="btn ghost xs"
          disabled={busy}
          title="Quitar del proyecto"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
