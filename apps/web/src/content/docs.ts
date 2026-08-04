export type DocPage = {
  slug: string;
  title: string;
  description: string;
  section: string;
  body: string;
};

export const DOC_NAV: { section: string; items: { slug: string; title: string }[] }[] = [
  {
    section: "Start here",
    items: [
      { slug: "introduction", title: "Introduction" },
      { slug: "getting-started", title: "Getting started" },
      { slug: "concepts", title: "Core concepts" },
    ],
  },
  {
    section: "Platform",
    items: [
      { slug: "architecture", title: "Architecture" },
      { slug: "auth-rbac", title: "Auth & RBAC" },
      { slug: "agents", title: "Agents & versions" },
      { slug: "executions", title: "Executions" },
      { slug: "sse", title: "Live SSE" },
      { slug: "ticket-similarity", title: "Ticket Similarity" },
    ],
  },
  {
    section: "Operations",
    items: [
      { slug: "quotas-keys", title: "Quotas & API keys" },
      { slug: "observability", title: "Observability" },
      { slug: "deployment", title: "Deployment" },
      { slug: "api", title: "API reference" },
    ],
  },
];

export const DOCS: DocPage[] = [
  {
    slug: "introduction",
    title: "Introduction",
    description: "What AgentMesh is and who it is for",
    section: "Start here",
    body: `
## What is AgentMesh?

**AgentMesh** is a multi-tenant **AI agent execution platform**. It lets organizations define versioned agents, submit durable asynchronous executions, stream live progress to operators, and govern access with RBAC — with the distributed-systems primitives you would expect in a production agent company.

It is built as a portfolio-grade system: Docker Compose locally, Kubernetes manifests, Prometheus metrics, and a sample **Ticket Similarity Agent**.

## What it is not

- Not a thin ChatGPT UI wrapper
- Not a single-process script that “calls an LLM”
- Not a fake exactly-once message bus

AgentMesh is honest about **at-least-once** delivery and designs handlers to be **idempotent**.

## Who it is for

| Audience | Why it matters |
|----------|----------------|
| Interviewers / hiring managers | Shows tenancy, queues, gRPC, SSE, ops |
| Engineers exploring agent platforms | Reference architecture you can run |
| Demo audiences | Login → run → watch live timeline in minutes |

## Product surfaces

1. **Marketing + docs** (this site) — what it does and how
2. **Console** — agents, executions, usage, API keys, audit
3. **REST API** — OpenAPI at \`/docs\` on the API service
4. **Observability** — Prometheus \`/metrics\`, Grafana dashboards

Continue with [Getting started](/docs/getting-started).
`,
  },
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Run the stack and complete a first execution",
    section: "Start here",
    body: `
## Prerequisites

- Docker Desktop with Compose v2
- ~8 GB RAM recommended for the full stack
- Optional: Node 20+ / Python 3.12+ for local non-Docker work

## Start the stack

\`\`\`bash
cd agentmesh
cp .env.example .env
docker compose up --build -d
\`\`\`

With monitoring:

\`\`\`bash
docker compose --profile monitoring up -d
\`\`\`

| Service | URL |
|---------|-----|
| Web console | http://localhost:3000 |
| API OpenAPI | http://localhost:8000/docs |
| Keycloak | http://localhost:8080 |
| RabbitMQ | http://localhost:15672 |
| Grafana | http://localhost:3001 |

## Demo accounts

Password for all local users: \`AgentMesh!Dev1\`

| Email | Role |
|-------|------|
| admin@agentmesh.local | Organization Admin |
| developer@agentmesh.local | Developer |
| operator@agentmesh.local | Operator |
| viewer@agentmesh.local | Viewer |

## First successful run

1. Open [/login](/login) and sign in as admin.
2. Open **Agents** — confirm Ticket Similarity Agent exists with a published version.
3. Submit an execution (console or API) with a checkout/timeout style incident.
4. Open the execution detail page and watch **Live events via SSE**.
5. Confirm status **SUCCEEDED** and inspect similar tickets + root cause.

## Health checks

\`\`\`bash
curl http://localhost:8000/health
curl http://localhost:8000/ready
\`\`\`
`,
  },
  {
    slug: "concepts",
    title: "Core concepts",
    description: "Tenants, agents, versions, executions, events",
    section: "Start here",
    body: `
## Organization (tenant)

A billing / isolation boundary. Users join via memberships with a role. Row-level data is scoped by \`organization_id\` resolved from membership — never from an untrusted client claim alone.

## Roles

| Role | Typical capabilities |
|------|----------------------|
| org_admin | Manage members, keys, quotas-facing views, full CRUD |
| developer | Create/publish agents, run executions |
| operator | Run/cancel/retry executions, view live timelines |
| viewer | Read-only agents, executions, usage |

Exact permission names are enforced in FastAPI dependencies.

## Agent + version

An **agent** is a named product entity. A **version** freezes configuration (e.g. \`ticket_similarity\`, top_k, provider). Publishing makes the version immutable for reproducibility.

## Execution

A single run against a published version. Lifecycle:

\`QUEUED → RUNNING → SUCCEEDED | FAILED | CANCELLED\`

Retries increment \`retry_count\`. Idempotency keys prevent duplicate business submissions.

## Execution events

Append-only step records: started, step, succeeded/failed. Used for SSE catch-up and auditability of what the runtime did.
`,
  },
  {
    slug: "architecture",
    title: "Architecture",
    description: "Components and the durable execution path",
    section: "Platform",
    body: `
## Components

| Component | Role |
|-----------|------|
| **web** | Next.js console + marketing/docs |
| **api** | FastAPI: authz, agents, executions, SSE, quotas, metrics |
| **worker** | Celery: claim, gRPC stream, persist, publish |
| **runtime** | gRPC AgentRuntimeService (Ticket Similarity) |
| **PostgreSQL + pgvector** | System of record + similarity data |
| **Redis** | Rate limits, Pub/Sub, Celery results |
| **RabbitMQ** | Durable queue + DLQ |
| **Keycloak** | OIDC identity |

## Why REST + gRPC + queue

- **REST/SSE** — browser-friendly public surface and OpenAPI
- **gRPC** — typed streaming between worker and runtime while a job runs
- **RabbitMQ** — durable accept path independent of runtime availability

## Guarantees (honest)

| Guarantee | Approach |
|-----------|----------|
| At-least-once | Manual ack after durable side effects |
| No duplicate business run | Idempotency keys + atomic status claim |
| Live + durable events | Postgres history + Redis fan-out |
| Tenant isolation | Membership-scoped \`organization_id\` |

## Sequence (summary)

1. Client \`POST /executions\` with Idempotency-Key  
2. API writes \`QUEUED\` and enqueues Celery task  
3. Worker atomically claims → \`RUNNING\`  
4. Worker opens gRPC \`RunExecution\` stream  
5. Each step persisted + published to Redis  
6. UI/SSE subscribers receive live events  
7. Terminal status written; metrics updated  
`,
  },
  {
    slug: "auth-rbac",
    title: "Auth & RBAC",
    description: "OIDC, local bypass, permissions",
    section: "Platform",
    body: `
## Identity

Production-shaped path: **Keycloak** OAuth2/OIDC. Local demos also support \`AUTH_DEV_BYPASS\` with HS256 tokens for offline work.

## Session in the console

The web app stores the access token in Redux and \`sessionStorage\` so navigations survive reloads. For a hardened production BFF, prefer **HttpOnly cookies** and keep tokens off the JS heap.

## Request headers

Authenticated API calls need:

\`\`\`http
Authorization: Bearer <access_token>
X-Organization-Id: <uuid>
\`\`\`

## Permission model

Routes declare required permissions via FastAPI dependencies (\`require_permission\`). Membership is loaded server-side; role alone is not enough without org membership.

## Demo login API

\`\`\`bash
curl -X POST http://localhost:8000/api/v1/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email":"admin@agentmesh.local",
    "password":"AgentMesh!Dev1",
    "organization_slug":"acme"
  }'
\`\`\`
`,
  },
  {
    slug: "agents",
    title: "Agents & versions",
    description: "Create, version, publish",
    section: "Platform",
    body: `
## Why immutable versions?

Prompts, tool configs, and knobs change. Pinning an execution to a **published version** means yesterday’s run can be explained tomorrow.

## Lifecycle

1. Create agent (name, description)
2. Create version with \`configuration\` JSON
3. Publish version → status \`published\`, \`published_at\` set
4. Submit executions against that \`agent_version_id\`

## Ticket Similarity configuration example

\`\`\`json
{
  "type": "ticket_similarity",
  "top_k": 5,
  "provider": "mock"
}
\`\`\`

## Console

Use **Agents** in the console to inspect seeded Acme Robotics agents. API CRUD is available under \`/api/v1/agents\`.
`,
  },
  {
    slug: "executions",
    title: "Executions",
    description: "Submit, cancel, retry, inspect",
    section: "Platform",
    body: `
## Submit

\`POST /api/v1/executions\` with:

- \`agent_id\`
- \`agent_version_id\`
- \`input_payload\`
- Header \`Idempotency-Key\` (recommended)

Response: execution resource, typically \`QUEUED\`.

## Cancel / retry

Operators can cancel in-flight work or retry failed runs (subject to RBAC and state machine rules). Retries bump \`retry_count\` and re-enter the queue safely.

## Quotas

Before enqueue, the API checks concurrent and monthly execution quotas (and RPM via Redis). See [Quotas & API keys](/docs/quotas-keys).

## Inspect

- List: \`GET /api/v1/executions\`
- Detail: \`GET /api/v1/executions/{id}\`
- Events: SSE on \`GET /api/v1/executions/{id}/events\`
`,
  },
  {
    slug: "sse",
    title: "Live SSE",
    description: "How live execution timelines work",
    section: "Platform",
    body: `
## Endpoint

\`\`\`http
GET /api/v1/executions/{id}/events
Accept: text/event-stream
Authorization: Bearer …
X-Organization-Id: …
\`\`\`

## Design

1. **Catch-up** — load persisted events from Postgres  
2. **Tail** — subscribe to Redis channel for new events  
3. **Reconnect-safe** — clients can reconnect and re-hydrate from DB  

## Why SSE instead of WebSockets?

Execution progress is mostly **server → client**. SSE maps cleanly onto HTTP auth, proxies, and simple reconnect semantics. Bidirectional control uses REST (cancel/retry).

## Console UX

The execution detail page renders a timeline of steps (embed → similar tickets → analysis → succeeded) as events arrive.
`,
  },
  {
    slug: "ticket-similarity",
    title: "Ticket Similarity Agent",
    description: "The sample AI use case",
    section: "Platform",
    body: `
## Problem

On-call engineers waste time rediscovering incidents that already happened. AgentMesh ships a **Ticket Similarity** agent that:

1. Embeds the new ticket text  
2. Finds similar historical tickets  
3. Returns likely root cause, previous owner, repo, and investigation steps  

## Local mode

\`LLM_PROVIDER=mock\` — deterministic mock embeddings/LLM so the full stack works offline and free.

## Input payload

\`\`\`json
{
  "title": "Checkout timeout after deploy",
  "description": "Payments API returns 504 under load"
}
\`\`\`

## Output highlights

- \`similar_incidents\` with similarity scores  
- \`likely_root_cause\`  
- \`previous_owner\`  
- \`relevant_repository\`  
- \`suggested_investigation_steps\`  

Streamed as gRPC step events, then mirrored to SSE.
`,
  },
  {
    slug: "quotas-keys",
    title: "Quotas & API keys",
    description: "Rate limits, usage, keys, audit",
    section: "Operations",
    body: `
## Rate limits

Per-organization requests/minute enforced with Redis. Exceeding limits returns HTTP 429 with \`Retry-After\`.

## Quotas

Tracked usage surfaces in the console **Usage** page:

- Monthly executions  
- Monthly tokens  
- Max concurrent executions  
- Requests per minute  

## API keys

Admins can mint API keys. **Only hashes** are stored. Prefixes help operators identify keys without exposing secrets. Revocation sets \`revoked_at\`.

## Audit logs

Sensitive actions (e.g. API key create) append to an audit table — visible under **Audit** in the console.
`,
  },
  {
    slug: "observability",
    title: "Observability",
    description: "Metrics, Grafana, logs",
    section: "Operations",
    body: `
## Prometheus

API exposes \`GET /metrics\` including HTTP request counters and latency histograms (\`agentmesh_*\` series).

## Grafana

Compose profile \`monitoring\` starts Prometheus + Grafana.

- Grafana: http://localhost:3001  
- User: \`admin\` / \`agentmesh_grafana_dev\`  
- Dashboard: **AgentMesh API Overview**

## Traces

Jaeger is available on the monitoring profile for distributed tracing experiments.

## Structured logs

Services emit structured logs suitable for local \`docker compose logs\` during demos.
`,
  },
  {
    slug: "deployment",
    title: "Deployment",
    description: "Compose and Kubernetes",
    section: "Operations",
    body: `
## Docker Compose (primary demo path)

\`\`\`bash
docker compose up --build -d
docker compose --profile monitoring up -d
\`\`\`

## Kubernetes

Manifests live under \`infrastructure/kubernetes/\`:

- Deployments + Services for API, worker, runtime, web, data plane  
- Readiness/liveness probes  
- CPU HPA on API / worker / runtime  
- NGINX Ingress template  

\`\`\`bash
kubectl apply -k infrastructure/kubernetes/
\`\`\`

See \`docs/deployment.md\` in the repo for Kind/Minikube notes. Local secrets templates are **dev-only**.

## CI

GitHub Actions run API Ruff/Pytest, runtime tests, web lint/typecheck/Vitest, Docker builds, and Kustomize validation.
`,
  },
  {
    slug: "api",
    title: "API reference",
    description: "REST surface overview",
    section: "Operations",
    body: `
## Interactive OpenAPI

Full schemas and try-it-out live at:

**http://localhost:8000/docs**

## Common routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | \`/api/v1/auth/login\` | Dev/OIDC login helper |
| GET | \`/api/v1/me\` | Current user + membership |
| GET/POST | \`/api/v1/agents\` | List/create agents |
| GET/POST | \`/api/v1/agents/{id}/versions\` | Versions |
| POST | \`/api/v1/executions\` | Submit execution |
| GET | \`/api/v1/executions/{id}\` | Detail |
| GET | \`/api/v1/executions/{id}/events\` | SSE stream |
| GET | \`/api/v1/usage\` | Quota snapshot |
| GET/POST | \`/api/v1/api-keys\` | Manage keys |
| GET | \`/api/v1/audit-logs\` | Audit trail |
| GET | \`/health\` \`/ready\` \`/metrics\` | Ops |

## Errors

- \`401\` unauthenticated  
- \`403\` missing permission / wrong tenant  
- \`409\` idempotency conflict  
- \`429\` rate limited  
`,
  },
];

export function getDoc(slug: string): DocPage | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export function getAllDocSlugs(): string[] {
  return DOCS.map((d) => d.slug);
}
