# Load testing

AgentMesh ships a **k6** smoke template at [`tests/load/k6-smoke.js`](../tests/load/k6-smoke.js).

## Run locally

```bash
# Stack must be up
docker compose up -d

# Optional: obtain a token
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@agentmesh.local","password":"AgentMesh!Dev1","organization_slug":"acme"}' \
  | jq -r .access_token)
ORG=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@agentmesh.local","password":"AgentMesh!Dev1","organization_slug":"acme"}' \
  | jq -r .organization_id)

k6 run -e AGENTMESH_TOKEN="$TOKEN" -e AGENTMESH_ORG_ID="$ORG" tests/load/k6-smoke.js
```

## Policy

Do **not** publish invented RPS or latency numbers in the README. Paste real `k6` summary output into interview notes if needed.
