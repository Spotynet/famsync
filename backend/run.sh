#!/bin/bash
cd "$(dirname "$0")"

# Create venv if it doesn't exist
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

# Activate and install
source .venv/bin/activate
pip install -r requirements.txt -q

# Run migrations (idempotent)
python manage.py migrate --no-input 2>/dev/null || true

# Start server
python manage.py runserver 0.0.0.0:8001
