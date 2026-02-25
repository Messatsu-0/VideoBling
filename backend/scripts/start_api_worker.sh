#!/usr/bin/env sh
set -eu

PORT="${PORT:-8000}"
HUEY_WORKERS="${HUEY_WORKERS:-1}"

python -m huey.bin.huey_consumer app.workers.queue.huey -w "${HUEY_WORKERS}" &
exec uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port "${PORT}"
