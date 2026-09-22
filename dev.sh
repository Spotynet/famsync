#!/bin/bash

echo "🚀 Starting FAMSYNC DEV (api + mobile + web)"

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"
MOBILE_DIR="$BASE_DIR/mobile"
LANDING_DIR="$BASE_DIR/landing"

BACKEND_NAME="famsync-api-dev"
MOBILE_NAME="famsync-dev"
WEB_NAME="famsync-web-dev"

BACKEND_PORT=3006
MOBILE_PORT=3005
WEB_PORT=3013

# -------------------------
# 🧹 Clean old processes
# -------------------------
echo "🧹 Cleaning old PM2 processes..."
pm2 delete $BACKEND_NAME 2>/dev/null
pm2 delete $MOBILE_NAME 2>/dev/null
pm2 delete $WEB_NAME 2>/dev/null

# -------------------------
# 🐍 Start Backend (Django)
# -------------------------
echo "🐍 Starting Django backend ($BACKEND_NAME) on port $BACKEND_PORT..."
pm2 start "$BACKEND_DIR/venv/bin/python" \
  --name "$BACKEND_NAME" \
  --cwd "$BACKEND_DIR" \
  -- manage.py runserver 0.0.0.0:$BACKEND_PORT

# -------------------------
# 📱 Start Mobile (Expo web)
# -------------------------
echo "📱 Starting Expo mobile ($MOBILE_NAME) on port $MOBILE_PORT..."
pm2 start bash \
  --name "$MOBILE_NAME" \
  --cwd "$MOBILE_DIR" \
  -- -c "npx expo start --web --port $MOBILE_PORT --host localhost"

# -------------------------
# 🌐 Start Web (landing — static)
# -------------------------
echo "🌐 Starting landing ($WEB_NAME) on port $WEB_PORT..."
pm2 start bash \
  --name "$WEB_NAME" \
  --cwd "$LANDING_DIR" \
  -- -c "npx serve -l $WEB_PORT"

# -------------------------
# 💾 Save PM2 state
# -------------------------
pm2 save

# -------------------------
# 📊 Status
# -------------------------
echo "✅ FAMSYNC DEV running:"
pm2 list
echo ""
echo "  famsync-api-dev  -> https://famsync-api-dev.spotynet.com  (localhost:$BACKEND_PORT)"
echo "  famsync-dev      -> https://famsync-dev.spotynet.com      (localhost:$MOBILE_PORT)"
echo "  famsync-web-dev  -> https://famsync-web-dev.spotynet.com  (localhost:$WEB_PORT)"
