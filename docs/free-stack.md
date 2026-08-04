# Free & Lightweight Local Stack

All AgentMesh dependencies are **free / open source**. No paid SaaS is required.

## Already on this machine

| Tool | Status | Use |
|------|--------|-----|
| Node.js 20 | Installed | Next.js web app |
| Python 3.13 | Installed | API, worker, runtime |
| Git | Installed | Version control |
| npm packages | Installed under `apps/web` | Frontend deps |
| pip packages | Installed for API tests | Backend deps |

## Must install (free)

| Tool | Why | Notes |
|------|-----|-------|
| **Docker Desktop** | Runs Postgres, Redis, RabbitMQ, Keycloak, services | Free for personal use. Primary install. |
| WSL2 | Required by Docker on Windows | Docker installer usually prompts for this |

Optional later (not required to develop core features):

| Tool | Why |
|------|-----|
| Kind or Minikube | Local Kubernetes (Phase 9) — install only when ready |
| Make | Convenience targets — Compose commands work without it |

## Lightweight defaults in this project

- **LLM:** mock provider (no OpenAI key, no cost)
- **Embeddings:** local/mock (no paid vector API)
- **Auth:** Keycloak in Compose (no Auth0)
- **Observability:** Prometheus/Grafana/Jaeger via Compose profile `monitoring` (off by default to save RAM)
- **Images:** Alpine / slim where practical

## Recommended RAM usage (dev)

Start **without** monitoring first:

```powershell
docker compose up --build -d postgres redis rabbitmq keycloak api worker runtime web
```

Add metrics only when needed:

```powershell
docker compose --profile monitoring up -d
```

## Demo credentials (local only)

See README — Keycloak realm import, not production secrets.
