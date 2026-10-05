#!/usr/bin/env bash
# FamSync PRODUCTION — dedicated machine (project nginx on host :80).
#
# After merge to main: ./deploy.sh
# Optional: ./deploy.sh app.example.com api.example.com www.example.com
# Do NOT run on the shared Spotynet multi-app EC2.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# === Production domains (edit once) ===
FAMSYNC_MOBILE_HOST="app.famsync.com"
FAMSYNC_API_HOST="api.famsync.com"
FAMSYNC_WEB_HOST="www.famsync.com"

compose() {
  if docker info >/dev/null 2>&1; then
    docker compose "$@"
  elif sudo -n docker info >/dev/null 2>&1; then
    sudo docker compose "$@"
  else
    echo "Docker needs privileges. Prefer: sudo usermod -aG docker \$USER && newgrp docker" >&2
    sudo docker compose "$@"
  fi
}

if [[ "${1:-}" == "down" ]]; then
  echo "Stopping FamSync PRODUCTION..."
  compose -f compose.yaml -f compose.prod.yaml down
  exit 0
fi

if [[ $# -ge 3 ]]; then
  FAMSYNC_MOBILE_HOST="$1"
  FAMSYNC_API_HOST="$2"
  FAMSYNC_WEB_HOST="$3"
fi

export FAMSYNC_MOBILE_HOST FAMSYNC_API_HOST FAMSYNC_WEB_HOST
export EXPO_PUBLIC_API_URL="https://${FAMSYNC_API_HOST}"

if [[ ! -f backend/.env ]]; then
  echo "Missing backend/.env" >&2
  exit 1
fi

echo "Pulling latest from git..."
git pull --ff-only

echo "Deploying FamSync PRODUCTION → :80..."
echo "  mobile:  ${FAMSYNC_MOBILE_HOST}"
echo "  api:     ${FAMSYNC_API_HOST}"
echo "  landing: ${FAMSYNC_WEB_HOST}"
compose -f compose.yaml -f compose.prod.yaml up -d --build
echo
compose -f compose.yaml -f compose.prod.yaml ps
echo
echo "Stop: ./deploy.sh down"
