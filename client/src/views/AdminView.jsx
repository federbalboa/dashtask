import { useEffect, useState } from 'react';
import { useAuth } from '../controllers/AuthContext.jsx';
import { useToast } from '../controllers/ToastContext.jsx';
import { useApi } from '../controllers/useApi.js';
import { UserModel, AdminModel, ProjectModel, SettingsModel, TaskModel } from '../models/api.js';
import { ROLES } from '../config/roles.js';
import { Card, Badge, Spinner, Avatar, RoleBadge, Field } from './components/UI.jsx';

// Roles que pueden recibir un permiso global de checklist (conductores de ceremonia / delegados).
const GRANTABLE = ['product_manager', 'rte', 'lpm', 'product_owner', 'scrum_master', 'epic_owner', 'business_owner', 'system_architect', 'intake_manager', 'team_lead', 'tech_lead'];

export default function AdminView() {
  const { user } = useAuth();
  const [tab, setTab] = useState('teams');
  const usersRes = useApi(() => UserModel.list(), []);
  const teamsRes = useApi(() => AdminModel.teams(), []);

  if (!user || user.role !== 'admin') {
    return <div className="error-box">Solo el Administrador puede gestionar equipos y permisos.</div>;
  }
  if (usersRes.loading || teamsRes.loading) return <Spinner label="Cargando administración…" />;

  const refreshAll = () => { usersRes.reload(); teamsRes.reload(); };

  return (
    <>
      <div className="page-head">
        <h1>🛡️ Administración</h1>
        <p>
          Gestión de <b>ecosistemas y equipos</b> a los que pertenece cada persona (admin puede reasignarlas desde aquí)
          y <b>permisos globales</b> de checklist para conductores de ceremonias.
        </p>
      </div>

      <div className="toolbar">
        <button className={`btn ${tab === 'teams' ? 'primary' : ''}`} onClick={() => setTab('teams')}>
          🧩 Equipos & ecosistemas
        </button>
        <button className={`btn ${tab === 'perms' ? 'primary' : ''}`} onClick={() => setTab('perms')}>
          🛡️ Permisos de checklist
        </button>
        <button className={`btn ${tab === 'wip' ? 'primary' : ''}`} onClick={() => setTab('wip')}>
          🎚️ Límites WIP
        </button>
      </div>

      {tab === 'teams' && (
        <TeamsTab
          users={usersRes.data?.users || []}
          teams={teamsRes.data?.teams || []}
          onMutated={refreshAll}
        />
      )}
      {tab === 'perms' && <PermsTab />}
      {tab === 'wip' && <WipTab />}
    </>
  );
}

/* ============================= EQUIPOS / ECOSISTEMAS ============================= */
function TeamsTab({ users, teams, onMutated }) {
  const toast = useToast();
  const { user } = useAuth();
  const [renaming, setRenaming] = useState(null); // { id, name }
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState('');

  const refresh = async () => { onMutated?.(); };

  const byTeam = {};
  users.forEach((u) => { (byTeam[u.team] = byTeam[u.team] || []).push(u); });

  const ecosystems = teams.filter((t) => t.kind === 'team');
  const pools = teams.filter((t) => t.kind === 'pool');
  const allTeams = [...ecosystems, ...pools];
  const orphanName = 'Sin equipo';

  const teamIdOf = (u) => allTeams.find((tt) => tt.userTag === u.team)?.id || '';

  const moveUser = async (u, teamId) => {
    const tt = teams.find((x) => x.id === teamId);
    const name = tt ? tt.name : 'Sin equipo';
    if (teamIdOf(u) === (teamId || '')) return;
    setBusy(u.id);
    try {
      await AdminModel.setUserTeam(u.id, { teamId });
      toast.success(`${u.name} → ${name}`);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  const renameTeam = async () => {
    if (!renaming || !renaming.name.trim() || renaming.name === renaming.old) return setRenaming(null);
    setBusy(`r:${renaming.id}`);
    try {
      await AdminModel.updateTeam(renaming.id, { name: renaming.name.trim() });
      toast.success(`Equipo renombrado: ${renaming.name}`);
      setRenaming(null);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  const removeTeam = async (t) => {
    if (t.count > 0) {
      toast.error(`No se puede eliminar: ${t.count} personas aún pertenecen a ${t.name}.`);
      return;
    }
    if (!window.confirm(`¿Eliminar el equipo “${t.name}”?`)) return;
    setBusy(`d:${t.id}`);
    try {
      await AdminModel.deleteTeam(t.id);
      toast.success(`Equipo ${t.name} eliminado.`);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  const linkRole = (role) => (role === 'rte' ? 'RTE del ART' : role === 'lpm' ? 'LPM' : ROLES[role]?.label || role);

  const TeamBlock = ({ t }) => {
    const inTeam = byTeam[t.name] || [];
    return (
      <Card style={{ marginBottom: 14 }}>
        <div className="row wrap" style={{ justifyContent: 'space-between', gap: 12 }}>
          <div className="row" style={{ gap: 12 }}>
            <span className="phase-big" style={{ fontSize: 22 }}>{t.kind === 'pool' ? '🧬' : '🧩'}</span>
            <div>
              {renaming?.id === t.id ? (
                <div className="row" style={{ gap: 8 }}>
                  <input
                    className="mini"
                    autoFocus
                    value={renaming.name}
                    onChange={(e) => setRenaming((r) => ({ ...r, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') renameTeam(); if (e.key === 'Escape') setRenaming(null); }}
                    style={{ width: 240 }}
                  />
                  <button className="btn xs ok" disabled={busy === `r:${t.id}`} onClick={renameTeam}>✓</button>
                  <button className="btn xs ghost" onClick={() => setRenaming(null)}>✕</button>
                </div>
              ) : (
                <div className="row wrap" style={{ gap: 8 }}>
                  <strong style={{ fontSize: 15 }}>{t.name}</strong>
                  <Badge tone={t.kind === 'pool' ? 'info' : 'accent'}>{t.kind === 'pool' ? 'Pool / ART' : 'Ecosistema / Equipo'}</Badge>
                  <button className="btn xs ghost" title="Renombrar" disabled={busy === `r:${t.id}`} onClick={() => setRenaming({ id: t.id, name: t.name, old: t.name })}>✎</button>
                </div>
              )}
              <div className="muted-2" style={{ fontSize: 12, marginTop: 5 }}>
                <span className="mono">{t.id}</span> · {t.userTag} / {t.taskTag}
                {t.valueStream ? ` · Value Stream: ${t.valueStream}` : ''}
                {t.description ? ` · ${t.description}` : ''}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <Badge tone="gray">{inTeam.length} personas</Badge>
            <button
              className="btn xs danger"
              title={t.count > 0 ? 'Mueve antes a sus integrantes' : 'Eliminar equipo'}
              disabled={busy === `d:${t.id}` || t.count > 0}
              onClick={() => removeTeam(t)}
            >
              🗑
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          {inTeam.length === 0 ? (
            <div className="empty" style={{ padding: '18px' }}>Sin integrantes en este equipo.</div>
          ) : (
            <div className="res-table">
              <div className="tr th"><span>Persona</span><span>Rol</span><span>Equipo asignado</span></div>
              {inTeam.map((u) => (
                <div className="tr" key={u.id} style={{ gridTemplateColumns: '2.2fr 1.6fr 2.4fr' }}>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={u.name} color={(ROLES[u.role] || {}).color} size={30} />
                    <div className="stack">
                      <strong style={{ fontSize: 13 }}>{u.name}</strong>
                      <span className="muted-2" style={{ fontSize: 11.5 }}>{u.email}</span>
                    </div>
                  </div>
                  <RoleBadge role={u.role} full />
                  <select
                    className="mini"
                    value={teamIdOf(u)}
                    disabled={busy === u.id}
                    onChange={(e) => moveUser(u, e.target.value)}
                    style={{ maxWidth: 300 }}
                  >
                    <option value="">{orphanName}</option>
                    {allTeams.map((tt) => (
                      <option key={tt.id} value={tt.id}>{tt.kind === 'pool' ? '🧬 ' : '🧩 '}{tt.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const orphanUsers = byTeam[orphanName] || [];

  return (
    <>
      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <Card tight><div className="stat" style={{ border: 'none' }}>
          <div className="k-label">Ecosistemas / equipos</div>
          <div className="k-value">{ecosystems.length}</div>
        </div></Card>
        <Card tight><div className="stat" style={{ border: 'none' }}>
          <div className="k-label">Pools / ARTs</div>
          <div className="k-value">{pools.length}</div>
        </div></Card>
        <Card tight><div className="stat" style={{ border: 'none' }}>
          <div className="k-label">Ecosistema del admin</div>
          <div className="k-value" style={{ fontSize: 20, marginTop: 12 }}>{user.team}</div>
        </div></Card>
      </div>

      <div className="row wrap" style={{ gap: 12, marginBottom: 16 }}>
        <button className="btn primary" onClick={() => setCreating(true)}>+ Crear equipo nuevo</button>
      </div>

      <div className="section-title">Ecosistemas / equipos de entrega</div>
      {ecosystems.map((t) => <TeamBlock key={t.id} t={t} />)}

      <div className="section-title">Pools / ARTs</div>
      {pools.map((t) => <TeamBlock key={t.id} t={t} />)}

      <div className="section-title">Personas sin equipo asignado</div>
      <Card tight>
        {orphanUsers.length === 0 ? (
          <div className="empty">Todos tienen equipo asignado. ✓</div>
        ) : (
          <div className="list" style={{ padding: '8px 0' }}>
            {orphanUsers.map((u) => (
              <div className="list-item" key={u.id} style={{ justifyContent: 'flex-start', gap: 12 }}>
                <Avatar name={u.name} color={(ROLES[u.role] || {}).color} size={30} />
                <div className="stack" style={{ flex: 1 }}>
                  <strong style={{ fontSize: 13 }}>{u.name}</strong>
                  <span className="muted-2" style={{ fontSize: 11.5 }}>{u.email} · {linkRole(u.role)}</span>
                </div>
                <select className="mini" value="" disabled={busy === u.id} onChange={(e) => moveUser(u, e.target.value)} style={{ maxWidth: 280 }}>
                  <option value="" disabled>Asignar a…</option>
                  {allTeams.map((tt) => (
                    <option key={tt.id} value={tt.id}>{tt.kind === 'pool' ? '🧬 ' : '🧩 '}{tt.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </Card>

      {creating && <CreateTeamModal onClose={() => setCreating(false)} onSaved={refresh} />}
    </>
  );
}

function CreateTeamModal({ onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', userTag: '', taskTag: '', kind: 'team', valueStream: '', description: '' });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim() || !form.userTag.trim() || !form.taskTag.trim()) {
      toast.error('Completa nombre, etiqueta de personas y código de tareas.');
      return;
    }
    setBusy(true);
    try {
      const team = await AdminModel.createTeam({
        name: form.name.trim(),
        userTag: form.userTag.trim(),
        taskTag: form.taskTag.trim().toUpperCase(),
        kind: form.kind,
        valueStream: form.valueStream.trim(),
        description: form.description.trim(),
      });
      toast.success(`Equipo ${team.id} creado.`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3>🧩 Crear equipo nuevo</h3>
            <div className="muted-2" style={{ fontSize: 12, marginTop: 4 }}>
              El etiquetado se propaga: personas ({form.userTag || 'userTag'}) y futuras tareas ({form.taskTag ? form.taskTag.toUpperCase() : 'taskTag'}).
            </div>
          </div>
          <button className="btn xs ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="grid cols-2" style={{ gap: 12 }}>
            <Field label="Nombre del equipo">
              <input value={form.name} onChange={set('name')} placeholder='Ej. Equipo "Vela"' />
            </Field>
            <Field label="Tipo">
              <select value={form.kind} onChange={set('kind')}>
                <option value="team">Ecosistema / equipo de entrega</option>
                <option value="pool">Pool / ART (técnicos, PMO, portafolio…)</option>
              </select>
            </Field>
            <Field label="Etiqueta en personas (userTag)">
              <input value={form.userTag} onChange={set('userTag')} placeholder='Ej. Equipo "Vela"' />
            </Field>
            <Field label="Código en tareas (taskTag)">
              <input value={form.taskTag} onChange={set('taskTag')} placeholder="Ej. Vela" />
            </Field>
            <Field label="Value Stream (opcional)">
              <input value={form.valueStream} onChange={set('valueStream')} placeholder="Ej. Digitalización" />
            </Field>
            <Field label="Descripción (opcional)">
              <input value={form.description} onChange={set('description')} placeholder="Propósito del equipo" />
            </Field>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>Crear equipo</button>
        </div>
      </div>
    </div>
  );
}

/* ============================= PERMISOS DE CHECKLIST ============================= */
function PermsTab() {
  const toast = useToast();
  const usersRes = useApi(() => UserModel.list(), []);
  const permsRes = useApi(() => AdminModel.permissions(), []);
  const projectsRes = useApi(() => ProjectModel.list(), []);

  const [booting, setBooting] = useState(true);
  const [perms, setPerms] = useState({});
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (usersRes.data && permsRes.data && projectsRes.data) {
      const map = {};
      (permsRes.data.permissions || []).forEach((p) => {
        map[p.userId] = { canMarkAnyChecklist: !!p.canMarkAnyChecklist, canApproveBlocks: !!p.canApproveBlocks, projectIds: p.projectIds || [] };
      });
      setPerms(map);
      setBooting(false);
    }
  }, [usersRes.data, permsRes.data, projectsRes.data]);

  if (booting || usersRes.loading || permsRes.loading || projectsRes.loading) {
    return <Spinner label="Cargando permisos…" />;
  }

  const users = usersRes.data?.users || [];
  const projects = projectsRes.data?.projects || [];
  const grantables = users.filter((u) => GRANTABLE.includes(u.role));

  const save = async (userId, patch) => {
    setBusy(userId);
    const prev = perms[userId] || { canMarkAnyChecklist: false, canApproveBlocks: false, projectIds: [] };
    try {
      const next = { ...prev, ...patch };
      if (!next.canMarkAnyChecklist && !next.canApproveBlocks) next.projectIds = [];
      const res = await AdminModel.upsertPermission(userId, next);
      setPerms((p) => ({ ...p, [userId]: { canMarkAnyChecklist: !!res.permission.canMarkAnyChecklist, canApproveBlocks: !!res.permission.canApproveBlocks, projectIds: res.permission.projectIds } }));
      toast.success('Permiso actualizado.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  const remove = async (userId) => {
    setBusy(userId);
    try {
      await AdminModel.removePermission(userId);
      setPerms((p) => {
        const next = { ...p };
        delete next[userId];
        return next;
      });
      toast.success('Permiso revocado.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>🛡️ Permisos globales</h1>
        <p>
          Otorga a un usuario permisos que normalmente reserva su rol: <b>marcar cualquier punto del checklist</b>
          (por ejemplo para conducir el refinamiento) y/o <b>aprobar bloqueos</b> de tareas. El alcance puede
          limitarse a proyectos concretos.
        </p>
      </div>

      <div className="toolbar">
        <Badge tone="accent">{grantables.length} candidatos</Badge>
        <span className="muted-2" style={{ fontSize: 12 }}>
          Un usuario con permiso puede marcar puntos de rol <b>product_manager / product_owner / rte / system_architect / business_owner / scrum_master / developer / epic_owner</b>, y con “aprobar bloqueos” puede autorizar el bloqueo de tareas.
        </span>
      </div>

      <div className="section-title">Otorgar / revocar permisos globales</div>
      <div className="stack" style={{ gap: 14 }}>
        {grantables.map((u) => {
          const role = ROLES[u.role] || {};
          const perm = perms[u.id] || { canMarkAnyChecklist: false, canApproveBlocks: false, projectIds: [] };
          const enabled = perm.canMarkAnyChecklist;
          const blockEnabled = perm.canApproveBlocks;
          return (
            <Card key={u.id}>
              <div className="row wrap" style={{ gap: 14, justifyContent: 'space-between' }}>
                <div className="row" style={{ gap: 12 }}>
                  <Avatar name={u.name} color={role.color} size={38} />
                  <div className="stack">
                    <strong>{u.name}</strong>
                    <span className="muted-2" style={{ fontSize: 12 }}>{u.email}</span>
                  </div>
                  <RoleBadge role={u.role} full />
                </div>

                <div className="row wrap" style={{ gap: 14, alignItems: 'center' }}>
                  <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={busy === u.id}
                      onChange={(e) => save(u.id, { canMarkAnyChecklist: e.target.checked })}
                    />
                    <span style={{ fontWeight: 600 }}>Puede marcar cualquier checklist</span>
                  </label>
                  <label className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={blockEnabled}
                      disabled={busy === u.id}
                      onChange={(e) => save(u.id, { canApproveBlocks: e.target.checked })}
                    />
                    <span style={{ fontWeight: 600 }}>Puede aprobar bloqueos</span>
                  </label>
                  {(enabled || blockEnabled) && (
                    <button className="btn danger xs" disabled={busy === u.id} onClick={() => remove(u.id)}>
                      Revocar
                    </button>
                  )}
                </div>
              </div>

              {(enabled || blockEnabled) && (
                <div style={{ marginTop: 12 }}>
                  <Field label="Alcance por proyecto (vacío = todos)">
                    <div className="row wrap" style={{ gap: 8 }}>
                      {projects.map((p) => {
                        const on = perm.projectIds.includes(p.id);
                        return (
                          <label key={p.id} className={`badge ${on ? 'ok' : 'gray'}`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer', opacity: on ? 1 : 0.8 }}>
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={busy === u.id}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...perm.projectIds, p.id]
                                  : perm.projectIds.filter((x) => x !== p.id);
                                save(u.id, { projectIds: next });
                              }}
                            />
                            {p.code} · {p.name}
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

/* ============================= LÍMITES WIP ============================= */
const WIP_LABELS = { in_progress: 'Work in Progress', qa: 'QA', uat: 'Staging Review / UAT' };

function WipTab() {
  const toast = useToast();
  const { data, loading, reload } = useApi(() => SettingsModel.get(), []);
  const { data: boardData, reload: reloadBoard } = useApi(() => TaskModel.board(), []);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const lim = data.settings?.wipLimits || {};
      setForm(Object.fromEntries((data.wipColumns || []).map((c) => [c, lim[c] == null ? '' : String(lim[c])])));
    }
  }, [data]);

  if (loading || !form) return <Spinner label="Cargando configuración…" />;

  const board = boardData?.board || [];
  const byId = Object.fromEntries(board.map((c) => [c.id, c]));
  const cols = data.wipColumns || [];
  const set = (c) => (e) => setForm((f) => ({ ...f, [c]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      cols.forEach((c) => {
        const v = form[c];
        payload[c] = v === '' ? null : Math.max(0, Math.floor(Number(v)));
      });
      await SettingsModel.updateWip(payload);
      toast.success('Límites WIP guardados.');
      reload();
      reloadBoard();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    const def = data.wipDefaults || {};
    setForm(Object.fromEntries(cols.map((c) => [c, def[c] == null ? '' : String(def[c])])));
  };

  return (
    <>
      <Card title="Límites WIP del tablero" hint="Máximo de tarjetas permitidas por columna (Work In Progress).">
        <p className="muted-2" style={{ fontSize: 12.5, marginBottom: 14 }}>
          El límite WIP evita empezar más trabajo del que el equipo puede terminar: cuenta la columna completa.
          Si se alcanza, la app impide mover otra tarea a esa columna y muestra un mensaje explicando el tope.
          Deja el campo <b>vacío</b> para esa columna quede <b>sin límite</b>.
        </p>
      </Card>

      <div className="grid cols-3" style={{ marginTop: 4 }}>
        {cols.map((c) => {
          return (
            <Card key={c} style={{ marginBottom: 16 }}>
              <div className="row between" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <b>{byId[c]?.title || WIP_LABELS[c] || c}</b>
                <Badge tone={byId[c]?.overWip ? 'danger' : 'gray'} dot>
                  {byId[c]?.count ?? '—'} en curso
                </Badge>
              </div>
              <Field label="Límite WIP">
                <input
                  type="number"
                  min="0"
                  value={form[c]}
                  placeholder="Sin límite"
                  onChange={set(c)}
                />
              </Field>
              <div className="muted-2" style={{ fontSize: 11.5, marginTop: 6 }}>
                {form[c] === ''
                  ? 'Sin límite: entran todas las tarjetas.'
                  : `Máximo ${form[c]} tarjeta(s) en esta columna.${byId[c] ? ` Hoy hay ${byId[c].count}.${byId[c].overWip ? ' ¡Por encima!' : ''}` : ''}`}
              </div>
              {byId[c]?.overWip && (
                <div className="badge danger" style={{ marginTop: 8, whiteSpace: 'normal' }}>
                  ⚠️ La columna supera el límite actual.
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="row" style={{ gap: 10, marginTop: 4 }}>
        <button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar límites'}</button>
        <button className="btn ghost" onClick={resetDefaults} disabled={saving}>↺ Restaurar por defecto</button>
      </div>
    </>
  );
}