#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f .env ]]; then cp .env.example .env; fi
echo "Starting AgentMesh foundation stack..."
docker compose up --build -d
echo "Waiting for API health..."
for i in $(seq 1 60); do
  if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
    echo "API is healthy"
    curl -fsS http://localhost:8000/ready || true
    echo
    echo "Web:  http://localhost:3000"
    echo "API:  http://localhost:8000/docs"
    exit 0
  fi
  sleep 2
done
echo "API did not become healthy in time" >&2
docker compose ps
docker compose logs api --tail=100
exit 1
