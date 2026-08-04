# AgentMesh Implementation Plan

## Overview

AgentMesh is a multi-tenant AI agent execution platform demonstrating production-grade full-stack and distributed-systems engineering: OIDC auth, RBAC, durable async execution, gRPC runtime, live SSE monitoring, and Kubernetes deployment.

## Assumptions

1. Local development uses Docker Desktop (Windows/macOS/Linux) with Compose.
2. Keycloak realm `agentmesh` is provisioned from checked-in JSON (demo users only).
3. Default LLM path is a deterministic mock provider; OpenAI-compatible APIs are optional.
4. Shared-schema multi-tenancy with `organization_id` on every tenant-owned table.
5. gRPC is internal-only (worker → runtime); browsers use REST + SSE.
6. At-least-once delivery with idempotent workers; no exactly-once claim.
7. PostgreSQL + pgvector for tickets; Redis for rate limits, Pub/Sub, Celery broker helpers.
8. Demo credentials are development-only and labeled as such.

## Risks

| Risk | Mitigation |
|------|------------|
| Docker not installed on contributor machines | Document install; provide local-run fallbacks for API/web unit tests |
| Keycloak cold-start delays | Healthchecks + `depends_on` conditions; seed script wait loops |
| Celery + RabbitMQ ack races | DB state machine + idempotency keys as source of truth |
| SSE fan-out at scale | Redis Pub/Sub + Postgres event log for catch-up |
| pgvector extension availability | Use `pgvector/pgvector` image; migration gates on extension |
| Scope creep across 10 phases | Vertical slices; phase gates with tests before advancing |

## Phase Checklist

### Phase 0 — Planning ✅
- [x] Inspect repository
- [x] Create `docs/implementation-plan.md`
- [x] Create `docs/architecture.md` with Mermaid diagrams
- [x] Root README skeleton
- [x] Assumptions / risks recorded (this doc)
- [x] Completion checklist maintained

### Phase 1 — Foundation ✅ (code complete; Compose pending Docker Desktop)
- [x] Repository structure
- [x] Docker Compose (Postgres, Redis, RabbitMQ, Keycloak, api, web, worker, runtime + monitoring profile)
- [x] Basic FastAPI + health / ready
- [x] Basic Next.js + system status page
- [x] Health endpoints verified locally (uvicorn)
- [x] Full `docker compose up` — **verified 2026-08-04** (all core services healthy)

### Phase 2 — Authentication and tenancy ✅
- [x] DB models (orgs, users, memberships, RBAC, agents, executions, tickets, …)
- [x] Permission catalog + `require_permission(...)`
- [x] Auth context (OIDC path + free local `AUTH_DEV_BYPASS`)
- [x] Tenant isolation helpers + tests
- [x] Login API + UI (Keycloak password grant with dev fallback)
- [x] Schema bootstrap + demo org/user seed on API startup
- [x] Organization / member / agent / execution REST routes

### Phase 3 — Agent management ✅ (API + basic UI)
- [x] Agent CRUD + immutable versioning + publish
- [x] Frontend: login, dashboard, agents, executions, members
- [ ] Richer create/detail/version history screens (polish later)


### Phase 4 — Async execution ✅
- [x] RabbitMQ + Celery enqueue from API
- [x] Atomic claim / status machine / retries / DLQ wiring
- [x] Duplicate delivery protection via DB claim

### Phase 5 — gRPC runtime ✅
- [x] Streaming `RunExecution` (JSON-framed gRPC matching proto contract)
- [x] Ticket Similarity Agent with mock embeddings/LLM
- [x] Worker integration

### Phase 6 — Live monitoring ✅
- [x] Redis Pub/Sub + SSE + Last-Event-ID catch-up
- [x] Live execution detail UI (`/executions/[id]`)


### Phase 8 — Production readiness ✅
- [x] Redis rate limits (RPM) + Retry-After
- [x] Concurrent/monthly execution + token quotas
- [x] API keys (hashed at rest) + audit logs + usage API
- [x] Prometheus `/metrics` + Grafana dashboard provisioning
- [x] Frontend: Usage, API keys, Audit pages

### Phase 9 — Kubernetes and CI/CD ✅
- [x] Manifests, HPA, probes (`infrastructure/kubernetes/`)
- [x] GitHub Actions (CI + optional E2E workflow)

### Phase 10 — Proof and polish ✅
- [x] Playwright smoke E2E + k6 load template
- [x] Demo script, screenshot checklist, interview talking points

## Completion Criteria (Foundation Gate)

Before Phase 2:

1. `docker compose up` brings up infra + api + web (or documented blocker if Docker missing).
2. `GET /health` and `GET /ready` succeed on API.
3. Web app serves a status page.
4. Docs and structure match the target layout.
5. Repository is not left in a broken state.

## Commands (Phase 1)

```bash
cd agentmesh
cp .env.example .env
docker compose up --build -d
curl http://localhost:8000/health
curl http://localhost:8000/ready
open http://localhost:3000
```

Windows (PowerShell):

```powershell
cd agentmesh
Copy-Item .env.example .env
docker compose up --build -d
Invoke-WebRequest http://localhost:8000/health
Invoke-WebRequest http://localhost:3000
```

## Files Created (Phase 0/1)

- `README.md`, `.env.example`, `.gitignore`, `Makefile`, `docker-compose.yml`
- `docs/implementation-plan.md`, `docs/architecture.md`, `docs/security.md`, `docs/threat-model.md`, `docs/api-design.md`, `docs/deployment.md`, `docs/demo-script.md`
- `docs/adr/ADR-001` … `ADR-008`
- `services/api/` — FastAPI app, Dockerfile, health tests
- `services/worker/` — Celery foundation
- `services/runtime/` — gRPC health server foundation
- `apps/web/` — Next.js + Tailwind + SystemStatus + Vitest
- `packages/proto/.../runtime.proto`
- `infrastructure/docker/{postgres,rabbitmq,keycloak}`
- `infrastructure/monitoring/{prometheus,grafana}`
- `scripts/smoke-foundation.sh`

## Test results (Phase 1)

| Suite | Result |
|-------|--------|
| API unit (`pytest`) | **3 passed** |
| Web unit (`vitest`) | **1 passed** |
| Local API `/health` `/ready` | **ok** (deps skipped without URLs) |
| `docker compose up` | **Not run** — Docker Desktop not installed |

## Next phase

**Phase 2 — Authentication and tenancy:** OIDC login (PKCE / BFF cookies), organizations, memberships, RBAC, tenant isolation tests.

**Prerequisite for full stack:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) then `docker compose up --build -d` from `agentmesh/`.

