# DashTask · Guía de roles y proceso (SAFe paso a paso)

> Documento de referencia: qué hace **cada rol**, cómo **contribuye** al proyecto y **cómo fluye el trabajo**
> de punta a punta, con un ejemplo real sobre un proyecto activo del propio tablero y un glosario al final.

---

## Índice

1. [Qué es DashTask](#1-qué-es-dashtask)
2. [La estructura organizativa (3 niveles)](#2-la-estructura-organizativa-3-niveles)
3. [Los 13 roles, uno por uno](#3-los-13-roles-uno-por-uno)
4. [El proceso de punta a punta (paso a paso)](#4-el-proceso-de-punta-a-punta-paso-a-paso)
5. [Las 13 ceremonias](#5-las-13-ceremonias)
6. [Ejemplo real: PRJ-001 Portal Cliente Digital](#6-ejemplo-real-prj-001-portal-cliente-digital)
7. [Cambios de fecha: incidencia vs. control de cambios](#7-cambios-de-fecha-incidencia-vs-control-de-cambios)
8. [Glosario](#8-glosario)
9. [Cómo entrar a la demo](#9-cómo-entrar-a-la-demo)

---

## 1. Qué es DashTask

DashTask es un tablero tipo **SAFe (Scaled Agile Framework)** que conecta tres niveles de la organización —
**Portafolio → ART → Equipos** — en una sola herramienta:

- **Portafolio**: proyectos e épicas, valor de negocio (WSJF), financiamiento lean.
- **ART** (Agile Release Train): el tren de entrega que planifica por PI y coordina varios equipos.
- **Equipos**: los que construyen el incremento, iteración a iteración.

Todo el trabajo entra como un **intake** (solicitud), se prioriza, se estima por rol y se ejecuta en un
**flujo Kanban de 5 etapas** donde cada etapa sólo avanza cuando su checklist está 100% completo.

---

## 2. La estructura organizativa (3 niveles)

| Nivel | Quién vive aquí | Ceremonias | Resultado |
|---|---|---|---|
| **Portafolio** | LPM, Epic Owner, (Business Owners) | Lean Portfolio Review | Estrategia, financiamiento, épicas aprobadas |
| **ART** | RTE, Product Management, System Architect, Business Owner | PI Planning, ART Sync, System Demo, Inspect & Adapt, CoP, Coach Sync | PI Objectives, Program Board, incremento integrado |
| **Equipo** | Scrum Master, Product Owner, Developers, Team/Tech Lead, Intake Manager | Iteration Planning, Refinement, Daily, Review, Retro | Incremento de la iteración |

**Value Streams → Proyectos → Épicas → Historias → Tareas.** Un proyecto pertenece a un value stream,
contiene épicas, cada épica contiene historias y cada historia se materializa en tareas.

### Equipos reales de la demo

| ID | Equipo | Value Stream | Miembros | `taskTag` |
|---|---|---|---|---|
| TEAM-001 | **Nébula** | Cliente Digital | 11 | `Nébula` |
| TEAM-002 | **Cometa** | Datos & Pagos | 8 | `Cometa` |
| TEAM-003 | **Vela** | Canales | 6 | `Vela` |
| TEAM-004 | **Intake / PMO** | (triage de solicitudes) | 1 | `ART` |
| TEAM-005 | **Portafolio / ART "Phoenix"** | Portafolio / ART | 8 | `ART` |

> El ART que se planifica en las ceremonias de nivel ART es el **ART "Phoenix"**.

---

## 3. Los 13 roles, uno por uno

Cada rol tiene un **nivel**, un **icono** y un conjunto de **responsabilidades**. Además, el rol determina
**qué ítems del checklist de una tarea puede marcar**.

### Portafolio

#### 🏛️ Lean Portfolio Management (`lpm`) — Portafolio
- Estrategia, financiamiento lean y gobierno del portafolio.
- Alinea la estrategia con la ejecución (épicas, presupuesto).
- Revisa el flujo de valor de los *value streams*.
- **Contribuye**: decide en qué épicas se invierte y valida el retorno global.
- **Ceremonias**: Lean Portfolio Review (facilita).

#### 📘 Epic Owner (`epic_owner`) — Portafolio
- Coordina una épica de portafolio en todo su ciclo de vida.
- Mantiene el *Lean Business Case* actualizado.
- Define el MVP y los criterios de éxito de la épica.
- **Contribuye**: es el "dueño" de la iniciativa grande que atraviesa varios equipos.
- **Ceremonias**: Lean Portfolio Review.

### ART

#### 🚂 Release Train Engineer (`rte`) — ART
- Líder servicial del Agile Release Train.
- Facilita PI Planning, ART Sync e Inspect & Adapt.
- Elimina impedimentos y gestiona riesgos del ART.
- **Contribuye**: destraba al tren completo, cuida la capacidad y las dependencias.
- **Ceremonias**: PI Planning, ART Sync, Inspect & Adapt, Coach Sync (facilita casi todas las de ART).
- **Checklist que marca**: `backlog-rte` (capacidad del ART evaluada), `rel-rte` (release notes / System Demo).

#### 🎯 Product Management (`product_manager`) — ART
- Define visión, roadmap y *Features* del ART.
- Es la voz del cliente y prioriza el Program Backlog.
- Aprueba el alcance del PI junto a los Business Owners.
- **Contribuye**: traduce estrategia en features priorizados y valida el valor demostrado.
- **Ceremonias**: PI Planning, ART Sync, System Demo (facilita), Grooming & Backlog Review (facilita).
- **Checklist**: *Backlog normal* (`backlog-pm`, por WSJF) y **UAT** (`uat-pm`, confirma alcance).

#### 🏗️ System Architect / Engineering (`system_architect`) — ART
- Autoridad técnica del ART y *guardrails* de arquitectura.
- Define y mantiene el *Architecture Runway*.
- Gestiona los *Enablers* técnicos.
- **Contribuye**: asegura que la solución sea técnicamente viable y sostenible.
- **Ceremonias**: PI Planning, System Demo, CoP (facilita).
- **Checklist**: In Progress (`wip-arch`), QA (`qa-nfr`: seguridad/performance), Release (`rel-arch`).

#### 💼 Business Owner (`business_owner`) — ART
- Valida el valor de negocio del ART.
- Aprueba los PI Objectives.
- Participa en Inspect & Adapt.
- **Contribuye**: conecta la entrega técnica con el resultado de negocio.
- **Ceremonias**: Iteration Review, PI Planning, System Demo, Inspect & Adapt, Lean Portfolio Review.
- **Checklist**: UAT (`uat-bo`), Release (`rel-bo`).

### Equipo

#### 🧑‍🏫 Scrum Master / Team Coach (`scrum_master`) — Equipo
- Líder servicial del equipo ágil.
- Facilita ceremonias y elimina impedimentos.
- Coach y protector del flujo del equipo.
- **Contribuye**: que el equipo tenga las condiciones para entregar de forma sostenible.
- **Ceremonias**: Iteration Planning, Daily (facilita), Retro (facilita), ART Sync, Coach Sync.

#### 📋 Product Owner (`product_owner`) — Equipo
- Gestiona y prioriza el Team Backlog.
- Define criterios de aceptación y acepta (o rechaza) el trabajo.
- Alinea al equipo con las prioridades del PI.
- **Contribuye**: es la voz del negocio dentro del equipo, ordena qué se hace primero.
- **Ceremonias**: todas las de equipo (Planning, Refinement, Review, Retro, Daily) + ART Sync.
- **Checklist**: Backlog (`backlog-po`), QA (`qa-ac`), UAT (`uat-po`).

#### 💻 Developer (`developer`) — Equipo
- Diseña, construye, prueba e integra incrementos.
- Se autoorganiza y se compromete con las Iteration Goals.
- Levanta impedimentos en el Daily Stand-up.
- **Contribuye**: produce el incremento que realmente entrega valor.
- **Ceremonias**: Iteration Planning, Refinement, Daily, Review, PI Planning, System Demo.
- **Checklist**: In Progress (`wip-dev`, `wip-tests`), QA (`qa-deploy`).

#### 📥 Intake Manager / Business Analyst (`intake_manager`) — Equipo
- Revisión primaria (*triage*) de los intakes.
- Verifica completitud y elegibilidad.
- Enruta las solicitudes al backlog correspondiente.
- **Contribuye**: es la **puerta de entrada**: filtra y prepara lo que llega para que no entre basura al backlog.
- **Ceremonias**: Grooming / Backlog Review.

#### 🧭 Team Lead (`team_lead`) — Equipo
- Responde por el área de desarrollo de su equipo.
- **Puede marcar los puntos del checklist de desarrollo** (delegación sobre `developer`).
- Coordina la entrega de incrementos con sus desarrolladores.
- **Contribuye**: responsabilidad de entrega sobre las tareas técnicas del equipo.

#### 🧪 Tech Lead (`tech_lead`) — Equipo
- Autoridad técnica del equipo y guardrails.
- **Puede marcar los puntos del checklist de desarrollo** (delegación sobre `developer`).
- Asegura calidad técnica, pruebas y despliegues.
- **Contribuye**: calidad técnica y consistencia del código del equipo.

### Sistema

#### 🛡️ Administrator (`admin`) — Sistema
- Gestiona usuarios, roles y permisos globales.
- **Puede marcar cualquier punto del checklist de cualquier tarea**.
- Administra la sección de permisos del sistema.
- **Contribuye**: mantiene la plataforma y el gobierno de accesos.

> **Regla de autoría del checklist**: cada ítem pertenece a un rol (`role`) y sólo ese rol
> (o quien tenga permiso delegado: `team_lead`/`tech_lead` sobre `developer`, y `admin` sobre todo)
> puede marcarlo como completado.

---

## 4. El proceso de punta a punta (paso a paso)

### 4.1. Entrada: el intake (solicitud)

1. Alguien crea una **solicitud (intake)** con: título, descripción, **tipo** (Feature, Enabler, Story,
   Defect, Epic), solicitante, **valor de negocio**, criterios de aceptación, estimación, dependencias y NFR.
2. El estado inicial es **Nuevo** (`new`). Un checklist de **completitud** mide qué falta; **100% = apto para aprobar**.
3. El **Intake Manager** hace la **revisión primaria (triage)** → estado **Triado** (`triaged`) si cumple.
4. En el **Grooming / Backlog Review** cada rol aporta su perspectiva y se estima en **Story Points**;
   se calcula el **WSJF** → estado **Priorizado**.
5. Si se programa, se asigna a un **PI / iteración** → estado **Programado** (`scheduled`).
   Si no procede, se **Devuelve** (`returned`) o **Rechaza** (`rejected`) con motivo.

**Estados del intake:** `new → triaged → prioritized → scheduled` (o `returned` / `rejected`).

### 4.2. Priorización WSJF

```
WSJF = Costo del retraso ÷ Tamaño del trabajo
Costo del retraso = valor para el usuario + valor temporal + valor de riesgo/reducción
```

A mayor WSJF, antes se hace. Ordena el backlog por **valor relativo al tamaño**, no por opinión.

### 4.3. Ciclo de vida de una tarea: 5 etapas (Kanban)

Cada tarea recorre 5 etapas. **Sólo avanza a la siguiente cuando el checklist de la etapa actual está 100%.**

| # | Etapa | Salida | Checklist (rol que lo marca) |
|---|---|---|---|
| 1 | 📚 **Backlog normal** | Priorizada y lista para el sprint | `backlog-pm` Priorizada por WSJF (**product_manager**) · `backlog-po` Descompuesta en historias (**product_owner**) · `backlog-rte` Impacto en capacidad del ART (**rte**) |
| 2 | 🚧 **Work in Progress** | Incremento implementado | `wip-dev` Implementación commiteada (**developer**) · `wip-tests` Pruebas unitarias en verde (**developer**) · `wip-arch` Guardrails técnicos respetados (**system_architect**) |
| 3 | 🔎 **QA** | Incremento verificado | `qa-deploy` Build desplegado a QA (**developer**) · `qa-ac` Criterios de aceptación validados (**product_owner**) · `qa-nfr` Revisión no funcional (**system_architect**) |
| 4 | 🧪 **Staging Review / UAT** | Validación de negocio en staging | `uat-po` Casos UAT ejecutados (**product_owner**) · `uat-bo` Validación de negocio aprobada (**business_owner**) · `uat-pm` Alcance confirmado (**product_manager**) |
| 5 | 🚀 **Release** | Valor liberado y demostrado | `rel-rte` Incluida en Release Notes / System Demo (**rte**) · `rel-arch` Checklist de despliegue firmado (**system_architect**) · `rel-bo` Valor de negocio confirmado (**business_owner**) |

**Límites WIP (trabajo en curso):** Backlog `sin límite` · In Progress `5` · QA `5` · UAT `4` · Release `sin límite`.

> **Bloqueado** no es una etapa: es una interrupción. La tarjeta se detiene y **vuelve a su etapa**
> cuando se destraba.

### 4.4. El flujo completo, en orden

1. **Capturar** la solicitud (intake) → *Intake Manager* la triage-a.
> 2. **Revisar y estimar** por rol (Grooming / Backlog Review) → Product Management consolida y prioriza WSJF.
> 3. **Planificar el PI** (PI Planning): Product Management presenta visión; System Architect expone el runway;
>    los equipos planifican iteraciones, identifican dependencias y se comprometen; Business Owners aprueban.
> 4. **Iteration Planning**: el PO presenta el objetivo; los Developers estiman y se autocontraen.
> 4. **Ejecutar** (etapas 2–3 del Kanban): Developers construyen y prueban; System Architect cuida guardrails y NFR.
> 5. **Validar negocio** (etapa UAT): Product Owner ejecuta casos, Business Owner aprueba.
> 6. **Liberar** (Release) y **demostrar** en System Demo; cerrar el PI con Inspect & Adapt.
7. Cada iteración se cierra con **Review** (incremento aceptado) y **Retrospectiva** (acciones de mejora).

---

## 5. Las 13 ceremonias

| ID | Ceremonia | Nivel | Cadencia | Duración | Facilita | Salida principal |
|---|---|---|---|---|---|---|
| CEM-001 | Iteration Planning | Equipo | Día 1 de cada iteración | 2–4 h | Scrum Master | Iteration Goal + Backlog de iteración |
| CEM-002 | Backlog Refinement | Equipo | Semanal | 1 h | Product Owner | Historias listas (definición de "ready") |
| CEM-003 | Daily Stand-up (Daily Sync) | Equipo | Diario | 15 min | Scrum Master | Plan diario sincronizado |
| CEM-004 | Iteration Review | Equipo | Último día de la iteración | 1 h | Product Owner | Incremento aceptado + feedback |
| CEM-005 | Iteration Retrospective | Equipo | Último día de la iteración | 1–1.5 h | Scrum Master | 1–2 acciones de mejora con responsable |
| CEM-006 | PI Planning | ART | Inicio de cada PI (8–12 semanas) | 2 días | RTE | PI Objectives + Program Board + voto de confianza |
| CEM-007 | ART Sync (SoS + PO Sync) | ART | Semanal | 1 h | RTE | Dependencias resueltas, ajustes de alcance |
| CEM-008 | System Demo | ART | Fin de cada iteración | 1 h | Product Management | Feedback integral del incremento |
| CEM-009 | Inspect & Adapt | ART | Al final del PI | 2–4 h | RTE | Acciones SMART + re-planificación |
| CEM-010 | Coach Sync | ART | Quincenal | 1 h | RTE | Prácticas de coaching alineadas |
| CEM-011 | Communities of Practice (CoP) | ART | Mensual | 1 h | System Architect | Buenas prácticas difundidas |
| CEM-012 | Lean Portfolio Review | Portafolio | Trimestral | 3 h | LPM | Ajustes de portafolio y financiamiento |
| CEM-013 | Grooming Session & Backlog Review | ART | Semanal | 1–2 h | Product Management | Perspectivas por rol + SP + backlog priorizado |

**Quién hace qué (resumen por ceremonia):**

- **Iteration Planning** — PO presenta objetivo e historias priorizadas; Developers estiman y se autocontraen; SM facilita.
- **Backlog Refinement** — PO prioriza y detalla; Developers estiman; SM cuida la "definición de ready".
- **Daily** — Developers reportan avance e impedimentos; SM los escala; PO aclara contenido si hace falta.
- **Iteration Review** — Developers demuestran; PO acepta/rechaza; Business Owners validan valor.
- **Retrospectiva** — SM facilita; Developers proponen/implementan mejoras; PO aporta contexto.
- **PI Planning** — Product Management presenta visión/top features; RTE facilita y orquesta; System Architect expone el Architecture Runway; los equipos planifican y se comprometen; Business Owners aprueban los PI Objectives.
- **ART Sync** — SM reportan dependencias técnicas; PO alinean contenido; RTE facilita y elimina impedimentos.
- **System Demo** — Equipos demuestran la solución integrada; Product Management valida features; Business Owners dan feedback objetivo.
- **Inspect & Adapt** — RTE facilita el análisis de causa raíz y planifica mejoras; Product Management evalúa objetivos/métricas; Business Owners evalúan valor entregado.
- **CoP** — System Architect coordina y difunde estándares; Developers comparten buenas prácticas por disciplina.
- **Lean Portfolio Review** — LPM revisa estrategia/financiamiento/épicas; Epic Owners presentan estado de sus épicas; Business Owners validan retorno.
- **Grooming & Backlog Review** — Product Management conduce, prioriza y consolida la estimación final en SP;
  PO presenta historias y criterios; RTE valida capacidad del ART; System Architect/Developers estiman por rol;
  Business Owners aportan la perspectiva de valor.

---

## 6. Ejemplo real: PRJ-001 Portal Cliente Digital

Datos tomados del propio tablero.

**Proyecto**

| Campo | Valor |
|---|---|
| ID | `PRJ-001` |
| Nombre | **Portal Cliente Digital** (código `PCD`) |
| Estado | **In Progress** |
| Value Stream | Cliente Digital |
| Business Owner | Marta Ruiz |
| Product Manager | Andrés Gómez (`USR-004`) |
| Descripción | Portal y app self-service: onboarding, notificaciones y métricas de adopción. |
| Ventana | 2025-10-01 → 2026-06-30 |
| Sprint | bisemanal (miércoles), 1 SP/día |
| Avance | **1 de 8 tareas (13%)** |

### Épicas

| Épica | Nombre | Epic Owner | Estado | Valor de negocio (WSJF) |
|---|---|---|---|---|
| EPC-001 | Onboarding self-service | Carlos Ibarra | In Progress | 9 |
| EPC-002 | Notificaciones omnicanal | Carlos Ibarra | Funnel | 6 |

### Tareas y en qué etapa están

| Tarea | Historia/Épica | Estado | SP | Responsable |
|---|---|---|---|---|
| TSK-001 Diseñar flujo de onboarding | EPC-001 | 🚀 Release | 5 | Luis Ramírez |
| TSK-002 Integrar validación de identidad (KYC) | EPC-001 | 🚧 In Progress | 8 | Luis Ramírez |
| TSK-003 Fix autenticación biométrica | EPC-001 | 🔎 QA | 5 | Luis Ramírez |
| TSK-021 Encuesta NPS post-alta | EPC-001 | 📚 Backlog | 3 | Renata Vidal |
| TSK-006 Notificaciones push multi-canal | EPC-002 | 📚 Backlog | 8 | Luis Ramírez |
| TSK-010 Notificaciones push al app | EPC-002 | 📚 Backlog | 5 | Mateo Rojas |
| TSK-025 Endurecer autenticación del onboarding | EPC-002 | 📚 Backlog | 5 | Felipe Luna |
| TSK-007 Refactor de módulo de sesión | (sin épica) | 📚 Backlog | 13 | — |

### Narración paso a paso de TSK-003 (QA) y TSK-002 (In Progress)

**TSK-002 "Integrar validación de identidad (KYC)" — en In Progress**

1. Entró como intake, pasó triage y se priorizó (WSJF) → hoy está en **Work in Progress**.
2. El **Developer** (Luis Ramírez) implementa y commitea: marca `wip-dev`.
3. Pasa las **pruebas unitarias a verde**: marca `wip-tests`.
4. El **System Architect** confirma que respeta los **guardrails técnicos**: marca `wip-arch`.
5. Con el checklist al 100%, la tarea **avanza a QA**.

**TSK-003 "Fix autenticación biométrica" — en QA**

1. El **Developer** despliega el build al ambiente de QA: marca `qa-deploy`.
2. El **Product Owner** valida los **criterios de aceptación**: marca `qa-ac`.
3. El **System Architect** hace la revisión **no funcional** (seguridad/performance): marca `qa-nfr`.
4. Al 100%, avanza a **Staging Review / UAT** (PO ejecuta casos → Business Owner aprueba → Product Manager confirma alcance) y luego a **Release**.

> El **Business Owner** del proyecto es *Marta Ruiz*; los **Epic Owners** de EPC-001/002 son
> *Carlos Ibarra*; el equipo que ejecuta es **Nébula** (Value Stream Cliente Digital).

---

## 7. Cambios de fecha: incidencia vs. control de cambios

Cuando la **fecha de una tarea** debe moverse, hay dos caminos y **se comportan distinto**:

| | **Incidencia** | **Control de cambios** |
|---|---|---|
| Qué es | Ajuste operativo del día a día | Cambio formal que altera el compromiso |
| Efecto | **Aplica de inmediato** la nueva fecha | Queda **Pendiente** de aprobación (no mueve la fecha aún) |
| Quién aprueba | — (directo) | Rol decisor: `lpm`, `business_owner`, `epic_owner`, `rte`, `admin` |
| Si se rechaza | — | La fecha original se mantiene |
| Registro | Auditoría en la tarea | Cola de cambios + historial |

Ambos exigen **motivo** (`reasonType` + `reasonCode`) y, si se agrega nota, mínimo **14 caracteres**.
Una tarea con un cambio de control **pendiente** no admite otro (error 409): primero se aprueba o rechaza.

---

## 8. Glosario

### Conceptos SAFe

| Término | Significado |
|---|---|
| **SAFe** | Scaled Agile Framework: marco para escalar agilidad en varios equipos. |
| **Portafolio** | Nivel más alto: estrategia, financiamiento y épicas. |
| **ART** (Agile Release Train) | "Tren" de equipos que entrega soluciones de forma sincronizada por PI. |
| **Value Stream** | Cadena de valor que entrega un resultado (p. ej. *Cliente Digital*). |
| **PI** (Program Increment) | Intervalo de planificación (8–12 semanas) con varios sprints. |
| **PI Objectives** | Objetivos comprometidos por el equipo para el PI. |
| **Iteración / Sprint** | Ciclo corto de trabajo (aquí, semanal o quincenal). |
| **Épica** | Iniciativa grande de portafolio que agrupa features/historias. |
| **Feature** | Capacidad con valor para el cliente. |
| **Enabler** | Trabajo técnico que habilita otros (arquitectura, deuda técnica). |
| **Historia de usuario** | Necesidad pequeña y concreta con criterios de aceptación. |
| **Defect** | Defecto / bug. |
| **MVP** | Producto mínimo viable con el que se valida valor. |
| **Lean Business Case** | Documento que justifica una épica (valor, costo, riesgo). |
| **Architecture Runway** | Trabajo técnico anticipado para no frenar la entrega. |

### Estimación y priorización

| Término | Significado |
|---|---|
| **Story Points (SP)** | Unidad relativa de tamaño/complejidad, no de tiempo. |
| **WSJF** | *Weighted Shortest Job First*: `Costo del retraso ÷ Tamaño`. Mayor WSJF = antes. |
| **Costo del retraso** | Valor usuario + valor temporal + valor de riesgo. |
| **Talla T-shirt** | Estimación gruesa S / M / L / XL. |
| **Prioridad** | Baja · Media · Alta · Crítica. |
| **Completitud** | Checklist de requisitos de un intake; 100% = apto para aprobar. |

### Clases de servicio

| Clase | Para qué está | Color |
|---|---|---|
| **Standard** | Trabajo normal; se ordena por WSJF | Gris (flujo neutral) |
| **Fixed Date** | Fecha límite firme; si llega tarde se pierde valor | Naranja (aviso de plazo) |
| **Intangible** | Habilitador/técnico con valor indirecto | Azul (información/técnico) |
| **Expedite** | Emergencia: se adelanta a todo | Rojo (urgencia) |

### Flujo y estados

| Término | Significado |
|---|---|
| **Backlog normal** | Trabajo priorizado y descompuesto que aún no se comprometió a un sprint. |
| **WIP** | *Work In Progress*: trabajo en curso; cada etapa tiene límite. |
| **Bloqueado** | No es etapa: una tarjeta detenida que vuelve a su etapa al destrabarse. |
| **Intake** | Solicitud que entra antes del backlog. |
| **Triage** | Revisión primaria de un intake (Intake Manager). |
| **Estados de intake** | `new → triaged → prioritized → scheduled` (o `returned` / `rejected`). |
| **Incidencia** | Cambio de fecha operativo que aplica al instante. |
| **Control de cambios** | Cambio formal de fecha que requiere aprobación. |

---

## 9. Cómo entrar a la demo

Credenciales de prueba (password para todos: `demo123`):

| Rol | Email |
|---|---|
| LPM / Admin | `admin@dashtask.io` |
| Release Train Engineer | `rte@dashtask.io` |
| Product Management | `pm@dashtask.io` |
| Product Owner | `po@dashtask.io` |
| Developer | `dev@dashtask.io` |
| Business Owner | `bo@dashtask.io` |

Recorrido sugerido: **Intakes → Backlog → Tarea (checklist) → Changes (cambios de fecha) → Glosario → Admin (equipos y permisos)**.
