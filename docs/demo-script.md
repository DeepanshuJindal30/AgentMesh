# Demo Script (2–3 minutes)

**Goal:** Show AgentMesh as a multi-tenant agent execution platform, not a chatbot CRUD demo.

## Prep

```bash
cd agentmesh
docker compose --profile monitoring up -d
```

Confirm http://localhost:3000/login and http://localhost:8000/health.

## Script

1. **Login (15s)** — Open http://localhost:3000/login. Sign in as `admin@agentmesh.local` / `AgentMesh!Dev1`. Mention org **Acme Robotics**, RBAC roles, and that tokens come from Keycloak (or local HS256 bypass for offline demos).

2. **Agents + versions (30s)** — Open Agents. Show an agent with immutable versions and a published version. Point out: executions pin a version for reproducibility.

3. **Run Ticket Similarity (45s)** — Submit an execution with a sample ticket description. Open the live execution page. Show SSE step events streaming (claim → embed → similar tickets → LLM summary → SUCCEEDED). Mention Redis Pub/Sub fan-out and Postgres event durability.

4. **Ops surface (30s)** — Glance at Usage (quotas), API Keys (hashed), Audit Logs. Open Grafana http://localhost:3001 (`admin` / `agentmesh_grafana_dev`) and mention Prometheus `/metrics`.

5. **Close (15s)** — “REST externally, gRPC internally, RabbitMQ for durable async, SSE for live UI — at-least-once with idempotency, not fake exactly-once.”

## Optional deep cuts

- Viewer role: login as `viewer@agentmesh.local` — cannot create agents.
- Cancel / retry an execution.
- RabbitMQ management UI (DLQ definitions).
- `kubectl apply -k infrastructure/kubernetes/` walkthrough of HPA + probes.
