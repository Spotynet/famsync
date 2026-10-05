#!/usr/bin/env bash
# FamSync DEVELOPMENT — shared EC2 (project nginx on 127.0.0.1:3022).
#
# Once: sudo ./deploy/apply-nginx.sh
# Day-to-day: ./dev.sh
# Prod (dedicated): ./deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# === Dev domains (committed) ===
FAMSYNC_MOBILE_HOST="famsync-dev.spotynet.com"
FAMSYNC_API_HOST="famsync-api-dev.spotynet.com"
FAMSYNC_WEB_HOST="famsync-web-dev.spotynet.com"

export FAMSYNC_MOBILE_HOST FAMSYNC_API_HOST FAMSYNC_WEB_HOST
export EXPO_PUBLIC_API_URL="https://${FAMSYNC_API_HOST}"
# Shared RDS (same as prior PM2 script). Prefer fixing backend/.env when writable.
export DATABASE_URL="${DATABASE_URL:-postgres://famsync:famsync_dev_pass@spotynet-dev.cdoeasam0eby.us-east-1.rds.amazonaws.com:5432/famsync_db}"

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

if [[ ! -f backend/.env ]]; then
  echo "Missing backend/.env" >&2
  exit 1
fi

echo "Cleaning old FamSync PM2 processes (if any)..."
pm2 delete famsync-api-dev 2>/dev/null || true
pm2 delete famsync-dev 2>/dev/null || true
pm2 delete famsync-web-dev 2>/dev/null || true
pm2 save 2>/dev/null || true

echo "Starting FamSync DEV (compose.yaml → 127.0.0.1:3022)..."
echo "  mobile:  ${FAMSYNC_MOBILE_HOST}"
echo "  api:     ${FAMSYNC_API_HOST}"
echo "  landing: ${FAMSYNC_WEB_HOST}"
compose -f compose.yaml up -d --build
echo
compose -f compose.yaml ps
echo
echo "DEV URLs:"
echo "  https://${FAMSYNC_MOBILE_HOST}/"
echo "  https://${FAMSYNC_API_HOST}/"
echo "  https://${FAMSYNC_WEB_HOST}/"
echo
echo "Logs: docker compose -f compose.yaml logs -f"
echo "Stop: docker compose -f compose.yaml down"
echo
echo "If host nginx still points at 3005/3006/3013:"
echo "  sudo ./deploy/apply-nginx.sh"
