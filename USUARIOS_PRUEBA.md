# Usuarios de prueba — DashTask (SAFe Dashboard)

**Contraseña para todos los usuarios: `demo123`**

## Equipos (3) empatados con los value streams y los PMs

| Equipo | Proyectos | PM | Team Lead | Tech Lead | Arquitecto | Developers |
|--------|-----------|----|-----------|-----------|------------|------------|
| **Equipo "Nébula"** | PCD · CORE | Andrés Gómez (`pm@`) | Nicolás Ríos | Hugo Navas | Diego Fernández | Luis, Camila, Mateo, Tomás, Bruno, Felipe |
| **Equipo "Cometa"** | ANA · DAT · BI | Daniela Ortiz (`pm2@`) | Carmen Villalba | Isabel Duarte | Andrea Morales | Valentina, Sebastián, Renata, Samantha, Mariana |
| **Equipo "Vela"** | BAN · CAN | Roberto Salas (`pm3@`) | Sara Delgado | Óscar Pineda | Pablo Cifuentes | Lucía, Diana, Iván (+ compartidos Tomás, Samantha, Luis, Mateo) |

En la pestaña **Recursos disponibles** (PM, RTE y LPM) ves la capacidad de cada recurso por sprint (SP libres = capacidad − asignado) y puedes **agregar/quitar** desarrolladores de un proyecto. El RTE ve el reparto completo de todos los proyectos; cada PM ve solo sus proyectos. Los desarrolladores de "Compartidos" trabajan en varios proyectos y su capacidad se reparte entre ellos.

| # | Rol SAFe | Equipo / Área | Nombre | Email |
|---|----------|---------------|--------|-------|
| 1 | Lean Portfolio Management | Portafolio | Laura Méndez | `lpm@dashtask.io` |
| 2 | Epic Owner | Portafolio | Carlos Ibarra | `epic.owner@dashtask.io` |
| 3 | Business Owner | Portafolio | Marta Ruiz | `business.owner@dashtask.io` |
| 4 | Release Train Engineer | ART | Sofía Herrera | `rte@dashtask.io` |
| 5 | Product Management | ART | Andrés Gómez | `pm@dashtask.io` |
| 6 | Product Management · Datos | ART | Daniela Ortiz | `pm2@dashtask.io` |
| 7 | Product Management · Canales | ART | Roberto Salas | `pm3@dashtask.io` |
| 8 | Intake Manager / BA | Intake / PMO | Elena Castro | `ing.intake@dashtask.io` |
| 9 | Administrator | Sistema | Valeria Fuentes | `admin@dashtask.io` |
| 10 | Scrum Master / Team Coach | Nébula | Javier Torres | `scrum.master@dashtask.io` |
| 11 | Product Owner | Nébula | Paula Navarro | `product.owner@dashtask.io` |
| 12 | System Architect · Cliente Digital | Nébula | Diego Fernández | `architect@dashtask.io` |
| 13 | System Architect · Datos | Cometa | Andrea Morales | `architect2@dashtask.io` |
| 14 | System Architect · Canales | Vela | Pablo Cifuentes | `architect3@dashtask.io` |
| 15 | Team Lead | Nébula | Nicolás Ríos | `team.lead@dashtask.io` |
| 16 | Team Lead | Cometa | Carmen Villalba | `team.lead2@dashtask.io` |
| 17 | Team Lead | Vela | Sara Delgado | `team.lead3@dashtask.io` |
| 18 | Tech Lead | Nébula | Hugo Navas | `tech.lead2@dashtask.io` |
| 19 | Tech Lead | Cometa | Isabel Duarte | `tech.lead@dashtask.io` |
| 20 | Tech Lead | Vela | Óscar Pineda | `tech.lead3@dashtask.io` |
| 21 | Developer | Nébula | Luis Ramírez | `developer@dashtask.io` |
| 22 | Developer | Nébula | Camila Torres | `developer2@dashtask.io` |
| 23 | Developer | Nébula | Mateo Rojas | `developer3@dashtask.io` |
| 24 | Developer | Nébula | Tomás Aguirre | `developer7@dashtask.io` |
| 25 | Developer | Nébula | Bruno Cárdenas | `developer9@dashtask.io` |
| 26 | Developer | Nébula | Felipe Luna | `developer11@dashtask.io` |
| 27 | Developer | Cometa | Valentina Díaz | `developer4@dashtask.io` |
| 28 | Developer | Cometa | Sebastián Mora | `developer5@dashtask.io` |
| 29 | Developer | Cometa | Renata Vidal | `developer8@dashtask.io` |
| 30 | Developer | Cometa | Samantha Ríos | `developer10@dashtask.io` |
| 31 | Developer | Cometa | Mariana Solís | `developer12@dashtask.io` |
| 32 | Developer | Vela | Lucía Peña | `developer6@dashtask.io` |
| 33 | Developer | Vela | Diana Pardo | `developer13@dashtask.io` |
| 34 | Developer | Vela | Iván Serna | `developer14@dashtask.io` |

Todos los usuarios entran con la contraseña `demo123`. En la pantalla de login se listan **todos**, agrupados por equipo (Nébula · Cometa · Vela) y por área (Portafolio, ART, Soporte).

## Funcionalidades nuevas

- **Eje del Gantt con días y fechas**: en la Línea de tiempo ahora el eje muestra cada día con su fecha, las **franjas de cada sprint** (con sus fechas de inicio/vencimiento) y los **⚑ hitos de ceremonias** del usuario. Así se ve "qué vence antes de cada sprint".
- **Permisos de checklist (admin)**: el Administrador otorga a un PM / Program Manager (o a quien quiera) el permiso de **marcar cualquier punto del checklist**, opcionalmente **limitado a proyectos** específicos. Está en el menú "🛡️ Permisos (Admin)". El usuario con permiso puede marcar los puntos de rol de otro (product_manager, developer, etc.).
- **Delegate de rol**: Team Lead / Tech Lead pueden marcar los puntos de rol `developer` del checklist (sin bots de rol).
- **Ceremonias en el timeline**: la Línea de tiempo marca con banderines las fechas de las ceremonias en las que participa el usuario (excluye el Daily).
- **"Me toca intervenir"**: en la parte superior de todos los dashboards se listan los puntos del checklist que **puedes cerrar ahora** (el paso anterior ya está hecho) y llevan a la tarea con el punto resaltado.
- **Bitácora del checklist**: en el detalle de cada tarea se registra quién marcó cada punto, cuándo y con qué nota (incluye los regresos QA → WIP). Los dashboards de PM y RTE muestran **tiempos de respuesta por persona** y la bitácora reciente.
- **Revisión conjunta (Grooming / Backlog Review)**: en los intakes se suman **perspectivas por rol** (+1 la de Product Management) y **estimaciones en SP por involucrado**. Hasta no completar la revisión conjunta, el botón de **Priorizar** queda bloqueado.
- **Usuario de permisos de ejemplo**: Daniela Ortiz (`pm2@dashtask.io`) ya tiene el permiso global `canMarkAnyChecklist` sobre los proyectos **PRJ-003 (ANA) · PRJ-004 (DAT) · PRJ-005 (BI)**.

## Timeline (Gantt)

- **Mi línea de tiempo**: todos (basada en tareas y Story Points; 1 SP = 1 día; la barra dura tantos días como SP).
- **General · PI**: Product Management y RTE (el PM solo ve sus proyectos).
- **Panorama de proyectos**: LPM, Epic Owner, RTE, Business Owner, System Architect y Product Management.
- **Recursos disponibles**: PM, RTE y LPM. Cada proyecto muestra su **PM** y la capacidad de sus recursos por sprint (SP libres = días × SP/día − asignado, ajustable en `sprintConfig.spPerDay`). El PM ve solo sus proyectos; el **RTE (Program Increment Lead) ve el reparto completo** para asignar recursos a cualquier proyecto, con los candidatos libres ("+ Añadir").
- **Barras con asignado**: en el Gantt (Mine / PIs / Proyectos) cada barra muestra el desarrollador asignado y cada proyecto indica su Product Manager.
- **Arrastrar barras** para reprogramar una tarea en otro sprint (PM, RTE, LPM).

## Acceso rápido

En la pantalla de login se listan **todos los usuarios de la base de datos** (obtenidos del propio servidor, `GET /api/auth/catalog`), agrupados por **Portafolio · ART · Equipos (Nébula · Cometa · Vela) · Soporte**. Un clic entra con `demo123`. Así cualquiera ve, por ejemplo, todos los desarrolladores y accede rápido al equipo que quiere revisar.

## Notas de permisos

- **Revisión primaria / triage de intakes** (aprobar, devolver, rechazar, priorizar, programar): disponible para Intake Manager, LPM, Epic Owner, RTE, Product Management, System Architect, Business Owner, Product Owner.
- **Kanban y creación de tareas**: todos los roles.
- **Ceremonias**: cada rol ve por defecto solo las ceremonias donde participa.
- **Restablecer datos de demo**: botón en "Equipo & Roles" (regenera el seed).
