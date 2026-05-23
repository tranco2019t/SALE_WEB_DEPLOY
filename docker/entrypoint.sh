#!/usr/bin/env bash
set -euo pipefail

SERVICE=${1:-}

wait_for_db() {
  python - <<'PY'
import os
import time
from urllib.parse import urlparse
import psycopg2

url = os.environ.get("DATABASE_URL")
if not url:
    raise SystemExit("DATABASE_URL is not set")
parsed = urlparse(url)
dbname = parsed.path.lstrip("/")
user = parsed.username
password = parsed.password
host = parsed.hostname or "localhost"
port = parsed.port or 5432
deadline = time.time() + 90
while time.time() < deadline:
    try:
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port,
            connect_timeout=2,
        )
        conn.close()
        print("Database is ready")
        raise SystemExit(0)
    except Exception as exc:
        print("Waiting for database:", exc)
        time.sleep(1)
raise SystemExit("Timed out waiting for database")
PY
}

if [ -z "$SERVICE" ]; then
  echo "Usage: entrypoint.sh {backend|chatbot|tests}"
  exit 1
fi

case "$SERVICE" in
  backend)
    wait_for_db
    cd /app/backend
    alembic upgrade head
    python /app/backend/scripts/sync_seed_catalog.py --apply --image-mode=remote
    uvicorn app.main:app --host 0.0.0.0 --port 8000
    ;;
  chatbot)
    wait_for_db
    cd "/app/CHAT BOT/backend"
    uvicorn standalone_app:app --host 0.0.0.0 --port 8001
    ;;
  tests)
    wait_for_db
    python /app/docker/wait_for_services.py
    pytest -q tests/test_integration.py
    ;;
  *)
    echo "Unknown service: $SERVICE"
    exit 1
    ;;
esac
