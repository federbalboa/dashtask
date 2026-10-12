# 🚀 DashTask · Dashboard SAFe

Tablero **SAFe** con roles, intakes, backlog jerárquico (Proyecto → Épica → Tarea), sprints,
kanban, timeline (Gantt), calendario, ceremonias, **gestión de equipos/ecosistemas** y
**control de cambios de fechas de entrega** con motivo trazable. Incluye tema claro/oscuro y glosario.

- **Frontend:** React 18 + Vite (SPA).
- **Backend:** Node.js + Express con base de datos local en JSON (`server/src/data/db.json`).
- **Patrón:** MVC (modelos, servicios, controladores, rutas) en `server/` y `client/`.

## ▶️ Demo en GitHub Codespaces (recomendado)

Un clic y corre el sistema completo (frontend + backend) dentro de GitHub, sin instalar nada:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/federbalboa/dashtask)

El contenedor arranca la app automáticamente:

1. Espera a que termine la instalación de dependencias.
2. Abre la pestaña **Ports** y entra a **5173** (el *preview* se abre solo).
3. Inicia sesión con cualquier usuario de prueba (contraseña **`demo123`).

> Si el navegador no abre el *preview*, ve a **Ports → 5173 → Open in Browser**.

### Usuarios de prueba (contraseña `demo123`)

| Rol | Correo |
|---|---|
| Administrador | `admin@dashtask.io` |
| Lean Portfolio Manager | `lpm@dashtask.io` |
| Release Train Engineer | `rte@dashtask.io` |
| Product Manager | `pm@dashtask.io` |
| Epic Owner | `epic.owner@dashtask.io` |
| Business Owner | `business.owner@dashtask.io` |
| Intake Manager | `ing.intake@dashtask.io` |
| Developer | `developer@dashtask.io` |

## 💻 Correr en local

```bash
npm install        # instala raíz + server + client
npm run seed       # genera la base de datos de demo (server/src/data/db.json)
npm run dev        # API en :4100 y web en :5173
```

Abre **http://localhost:5173**.

## 🧭 Funciones destacadas

- **Equipos y ecosistemas (Admin):** mover a cualquier persona de equipo, ver por ecosistema,
  renombrar, crear y eliminar equipos.
- **Control de cambios de entregas:** toda modificación de una fecha de entrega queda registrada con su motivo.
  - *Incidencia u omisión* → se aplica al instante (flujo ágil).
  - *Control de cambios* → requiere autorización del portafolio (no mueve la fecha hasta aprobarse).
- **Edición en listas:** story points (esfuerzo) en línea y fecha de entrega con motivo.
- **Tema claro/oscuro** con un clic.
- **Glosario** de roles y términos SAFe.

## 🛠️ Scripts útiles

| Comando | Descripción |
|---|---|
| `npm run dev` | Levanta API + web (concurrently). |
| `npm run seed` | Regenera la base de datos de demo. |
| `npm run server` | Solo el backend (`:4100`). |
| `npm run client` | Solo el frontend (`:5173`). |
| `npm run build --prefix client` | Compila el frontend a `client/dist`. |
