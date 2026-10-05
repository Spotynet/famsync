#!/usr/bin/env bash
# One-shot shared-EC2 bootstrap for FamSync (requires sudo).
# Usage: sudo ./deploy/bootstrap-shared.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo $0" >&2
  exit 1
fi

RUN_USER="${SUDO_USER:-spotynet}"

echo "==> Applying host nginx FamSync → 3022"
bash "$ROOT/deploy/apply-nginx.sh"

usermod -aG docker "$RUN_USER" 2>/dev/null || true

echo "==> Starting Compose"
cd "$ROOT"
if id -nG "$RUN_USER" 2>/dev/null | grep -qw docker; then
  runuser -u "$RUN_USER" -- env HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)" \
    bash -lc "cd '$ROOT' && ./dev.sh"
else
  export FAMSYNC_MOBILE_HOST="famsync-dev.spotynet.com"
  export FAMSYNC_API_HOST="famsync-api-dev.spotynet.com"
  export FAMSYNC_WEB_HOST="famsync-web-dev.spotynet.com"
  export EXPO_PUBLIC_API_URL="https://famsync-api-dev.spotynet.com"
  pm2 delete famsync-api-dev famsync-dev famsync-web-dev 2>/dev/null || true
  docker compose -f compose.yaml up -d --build
fi

echo
docker compose -f "$ROOT/compose.yaml" ps
