# AgentMesh

**Multi-Tenant AI Agent Execution Platform**

A production-quality portfolio project demonstrating full-stack and distributed-systems engineering for enterprise AI-agent platforms: OIDC authentication, RBAC, durable async agent executions, gRPC streaming runtime, live SSE monitoring, pgvector similarity search, Kubernetes deployment, and an in-app docs site.

> **Status:** Phases 0–10 complete for local Compose + K8s/CI portfolio demo. See [docs/implementation-plan.md](docs/implementation-plan.md).

## Quick demo (2 minutes)

```bash
cd agentmesh
cp .env.example .env
docker compose up --build -d
```

1. Open **http://localhost:3000** — marketing + product overview
2. Open **http://localhost:3000/docs** — full documentation
3. Sign in at **http://localhost:3000/login**
   - Email: `admin@agentmesh.local`
   - Password: `AgentMesh!Dev1`
4. On the Dashboard, click **▶ Run live demo**
5. Watch the Ticket Similarity execution stream live over SSE

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| Grafana (optional) | http://localhost:3001 (`admin` / `agentmesh_grafana_dev`) |

```bash
docker compose --profile monitoring up -d   # Prometheus + Grafana + Jaeger
```

## Why this project exists

Chatbots and CRUD apps do not demonstrate the skills required for agent platforms: multi-tenant isolation, durable queues, crash recovery, idempotency, live observability, and secure identity. AgentMesh is built to show those capabilities end-to-end, with a practical **Ticket Similarity Agent** as the sample AI use case.

## Features

- OAuth2 / OpenID Connect login via Keycloak (local bypass for offline demos)
- Multi-tenant organizations with RBAC (Admin, Developer, Operator, Viewer)
- Immutable agent versioning and publish workflow
- Async executions via RabbitMQ + Celery (retries, DLQ, idempotency)
- gRPC AgentRuntimeService with server-streaming step events
- Live execution UI via Server-Sent Events + Redis Pub/Sub
- Ticket Similarity Agent with mock embeddings (optional real LLM later)
- Rate limiting, quotas, hashed API keys, append-only audit logs
- Marketing site + in-app documentation
- Docker Compose local stack; Kubernetes manifests; Prometheus / Grafana / Jaeger
- CI with lint, type-check, unit tests, Docker builds, Kustomize validation

## Architecture

```mermaid
flowchart LR
    User --> Web[Next.js]
    Web --> API[FastAPI]
    API --> PG[(PostgreSQL)]
    API --> Q[RabbitMQ]
    Q --> Worker[Celery]
    Worker --> Runtime[gRPC Runtime]
    Worker --> PG
    API --> Redis[(Redis)]
    Web -->|SSE| API
```

Full diagrams: [docs/architecture.md](docs/architecture.md).

## Technology stack

| Layer | Technologies |
|-------|----------------|
| Frontend | Next.js, React, TypeScript, Tailwind, Redux Toolkit, RTK Query, Zod, RHF |
| Backend | Python, FastAPI, AsyncIO, Pydantic, SQLAlchemy 2 async, Alembic |
| Data | PostgreSQL, pgvector, Redis |
| Async | RabbitMQ, Celery |
| Internal RPC | gRPC, Protocol Buffers |
| Auth | Keycloak, OAuth2/OIDC, JWT |
| Infra | Docker, Compose, Kubernetes, NGINX Ingress, HPA |
| Observability | Structured logs, Prometheus, Grafana, Jaeger |
| CI/CD | GitHub Actions, Ruff, ESLint, Vitest, Pytest, Playwright |

## Repository layout

```
agentmesh/
├── apps/web/                 # Next.js console + marketing + docs
├── services/api/             # FastAPI REST API
├── services/worker/          # Celery workers
├── services/runtime/         # gRPC agent runtime
├── packages/proto/           # Protocol Buffers
├── infrastructure/           # Docker, K8s, monitoring
├── scripts/                  # Dev and seed scripts
├── tests/                    # E2E + load templates
├── docs/                     # Architecture, ADRs, security, screenshots
├── docker-compose.yml
├── Makefile
├── .env.example
└── README.md
```

## Local setup

### Prerequisites

- Docker Desktop with Compose v2
- Make (optional)
- Node 20+ and Python 3.12+ (for local non-Docker development)

### Demo users (local development only)

| Email | Role | Password |
|-------|------|----------|
| `admin@agentmesh.local` | Organization Admin | `AgentMesh!Dev1` |
| `developer@agentmesh.local` | Developer | `AgentMesh!Dev1` |
| `operator@agentmesh.local` | Operator | `AgentMesh!Dev1` |
| `viewer@agentmesh.local` | Viewer | `AgentMesh!Dev1` |

These credentials are **development-only**. Never use them outside local demos.

## Environment variables

See [.env.example](.env.example). Copy to `.env` before starting Compose. Do not commit `.env`.

## Testing

```bash
# Backend
cd services/api && pytest -q

# Frontend
cd apps/web && npm test

# Playwright smoke (stack must be up)
cd tests/e2e && npm install && npx playwright test
```

## Kubernetes

```bash
kubectl apply -k infrastructure/kubernetes/
```

See [docs/deployment.md](docs/deployment.md).

## Cloud deploy (free)

Vercel hosts the **frontend**; Render hosts the **API / worker / runtime** (free tier).

Full guide: **[docs/cloud-deploy.md](docs/cloud-deploy.md)**

1. [Import on Vercel](https://vercel.com/new) → Root Directory `apps/web`
2. [Render Blueprint](https://dashboard.render.com/blueprints/new) → uses `render.yaml`
3. Set Vercel env `NEXT_PUBLIC_API_URL` to the Render API URL
4. Set Render API env `API_CORS_ORIGINS` to your Vercel domain

## Security design

See [docs/security.md](docs/security.md).

Highlights:

- Tenant isolation in the service layer
- RBAC via FastAPI dependencies
- API keys stored as hashes only
- Production hardening path: BFF + HttpOnly cookies (demo currently uses bearer session storage)

## Distributed-system guarantees

| Guarantee | Approach |
|-----------|----------|
| At-least-once task delivery | RabbitMQ + ack after durable side effects |
| No duplicate business execution | Idempotency keys + atomic status transitions |
| Crash recovery | Unacked messages redelivered; workers claim safely |
| Live event durability | Events in Postgres; Redis Pub/Sub for fan-out |
| Tenant isolation | `organization_id` from membership, never client trust |

Honest trade-off: at-least-once means handlers **must** be idempotent. Exactly-once is not claimed.

## Known limitations

- Mock LLM by default; quality depends on optional providers.
- Dev auth bypass / bearer tokens in client state — production should use BFF + HttpOnly cookies.
- Schema via startup `create_all` + seed; formal Alembic revision history is thin.
- Local K8s Postgres/Redis/RabbitMQ are for development only (plaintext Secret templates).
- Load-test numbers are not fabricated; see [docs/load-testing.md](docs/load-testing.md).

## Screenshots

| | |
|---|---|
| Login | ![Login](docs/screenshots/01-login.png) |
| Agents | ![Agents](docs/screenshots/02-agents.png) |
| Live execution (SSE) | ![Execution](docs/screenshots/03-execution-live.png) |
| Usage / quotas | ![Usage](docs/screenshots/04-usage.png) |
| Grafana | ![Grafana](docs/screenshots/05-grafana.png) |

## Interview talking points

Full answers: [docs/interview-talking-points.md](docs/interview-talking-points.md).

1. Why REST externally and gRPC internally
2. Why RabbitMQ is still required when gRPC exists
3. At-least-once delivery + idempotency design
4. SSE vs WebSockets for execution event streams
5. Shared-schema multi-tenancy isolation strategy
6. Immutable agent versions and execution reproducibility
7. BFF / HttpOnly session pattern vs storing JWTs in the browser

## Documentation index

| Doc | Purpose |
|-----|---------|
| [implementation-plan.md](docs/implementation-plan.md) | Phased delivery plan |
| [architecture.md](docs/architecture.md) | System design |
| [deployment.md](docs/deployment.md) | Compose + Kubernetes + CI |
| [demo-script.md](docs/demo-script.md) | 2–3 minute demo |
| [interview-talking-points.md](docs/interview-talking-points.md) | Interview answers |
| In-app docs | http://localhost:3000/docs |

## License

MIT (portfolio / educational use).
