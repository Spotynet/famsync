#!/usr/bin/env bash
# Point all FamSync host-nginx vhosts at project Compose nginx gateway (3022).
# Usage: sudo ./deploy/apply-nginx.sh
set -euo pipefail

CONF=/etc/nginx/sites-available/spotynet-dev.conf
BAK="${CONF}.bak.$(date +%F-%H%M%S)"
GATEWAY=3022

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo $0" >&2
  exit 1
fi

cp -a "$CONF" "$BAK"
echo "Backup: $BAK"

python3 - "$CONF" "$GATEWAY" <<'PY'
import re
import sys

path, gateway = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()

def patch_server(text: str, server_name: str, new_port: str) -> str:
    pattern = re.compile(
        rf"(server_name\s+{re.escape(server_name)}\s*;.*?proxy_pass\s+http://127\.0\.0\.1:)\d+(\s*;)",
        re.DOTALL,
    )
    new_text, n = pattern.subn(rf"\g<1>{new_port}\2", text, count=1)
    if n != 1:
        raise SystemExit(f"Expected 1 proxy_pass for {server_name}, found {n}")
    return new_text

for host in (
    "famsync-api-dev.spotynet.com",
    "famsync-dev.spotynet.com",
    "famsync-web-dev.spotynet.com",
):
    text = patch_server(text, host, gateway)

open(path, "w", encoding="utf-8").write(text)
print(f"Updated famsync-*-dev proxy_pass → 127.0.0.1:{gateway}")
PY

nginx -t
systemctl reload nginx
echo "nginx reloaded OK"

SETUP=/home/spotynet/projects/apps/setup.txt
if [[ -f "$SETUP" ]]; then
  echo "==> Updating setup.txt FAMSYNC section"
  cp -a "$SETUP" "${SETUP}.bak.$(date +%F-%H%M%S)"
  python3 - "$SETUP" <<'PY'
from pathlib import Path
import re
import sys
path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
new = """FAMSYNC (Docker Compose — per-project nginx)
- Start: cd /home/spotynet/projects/apps/famsync && ./dev.sh
- Project nginx gateway: 127.0.0.1:3022
- Mobile Expo web (internal): 3005 — famsync-dev.spotynet.com
- API (internal): 3006 — famsync-api-dev.spotynet.com
- Landing (internal): 3013 — famsync-web-dev.spotynet.com
- Host nginx proxies ALL three FamSync domains to http://127.0.0.1:3022
- Apply host nginx: sudo ./deploy/apply-nginx.sh
"""
pat = re.compile(r"FAMSYNC\n(?:- .+\n)+")
# Prefer Docker heading if already migrated
pat2 = re.compile(r"FAMSYNC \(Docker Compose — per-project nginx\)\n(?:- .+\n)+")
if pat2.search(text):
    text2, n = pat2.subn(new + "\n", text, count=1)
elif pat.search(text):
    text2, n = pat.subn(new + "\n", text, count=1)
else:
    n = 0
    text2 = text
if n:
    path.write_text(text2, encoding="utf-8")
    print("Updated setup.txt FAMSYNC section")
else:
    print("Warning: setup.txt FAMSYNC section not replaced")
PY
fi

echo
echo "Verify:"
echo "  curl -I -H 'Host: famsync-dev.spotynet.com' http://127.0.0.1:3022/"
echo "  curl -I -H 'Host: famsync-api-dev.spotynet.com' http://127.0.0.1:3022/"
echo "  curl -I -H 'Host: famsync-web-dev.spotynet.com' http://127.0.0.1:3022/"
