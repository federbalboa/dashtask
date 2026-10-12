#!/usr/bin/env bash
# Arranque automático de la demo DashTask en GitHub Codespaces.
# Levanta el backend (API :4100) y el frontend (Vite :5173) en segundo plano.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# 1) Dependencias (el postinstall de la raíz instala server + client).
if [ ! -d node_modules ] || [ ! -d client/node_modules ] || [ ! -d server/node_modules ]; then
  echo "→ Instalando dependencias…"
  npm install
fi

# 2) Regenerar la base local de demo (por si no existe).
if [ ! -f server/src/data/db.json ]; then
  echo "→ Generando base de datos de demo…"
  npm run seed
fi

# 3) Evitar arranques duplicados.
if pgrep -f "concurrently" >/dev/null 2>&1 || pgrep -f "vite" >/dev/null 2>&1; then
  echo "→ La demo ya está corriendo."
  exit 0
fi

# 4) Levantar el stack en segundo plano.
echo "→ Iniciando DashTask (web :5173 · API :4100)…"
nohup npm run dev >/tmp/dashtask-dev.log 2>&1 &

echo "✔ DashTask en marcha. Abre la pestaña 'Ports' → 5173 (se abre sola el preview)."
