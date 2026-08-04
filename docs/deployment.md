# Deployment

## Local (Docker Compose)

```bash
cp .env.example .env
docker compose up --build -d
```

With monitoring (Prometheus, Grafana, Jaeger):

```bash
docker compose --profile monitoring up --build -d
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:8000 |
| Grafana | http://localhost:3001 (admin / `agentmesh_grafana_dev`) |
| Prometheus | http://localhost:9090 |
| Jaeger | http://localhost:16686 |

## Kubernetes (Kind / Minikube)

Manifests: [`infrastructure/kubernetes/`](../infrastructure/kubernetes/).

```bash
# Build images
docker build -t agentmesh/api:local ./services/api
docker build -t agentmesh/worker:local ./services/worker
docker build -t agentmesh/runtime:local ./services/runtime
docker build -t agentmesh/web:local -f ./apps/web/Dockerfile ./apps/web

# Kind load (example)
kind load docker-image agentmesh/api:local agentmesh/worker:local \
  agentmesh/runtime:local agentmesh/web:local

kubectl apply -k infrastructure/kubernetes/
kubectl -n agentmesh get pods,svc,hpa,ingress
```

Includes:

- Deployments + Services for API, worker, runtime, web, Postgres, Redis, RabbitMQ
- HTTP/TCP/CLI probes
- CPU HPA on API, worker, runtime
- NGINX Ingress (`agentmesh.local`)

See [`infrastructure/kubernetes/README.md`](../infrastructure/kubernetes/README.md) for probes, port-forwards, and honest limits (Keycloak omitted from base overlay; secrets are local-dev only).

## CI/CD

GitHub Actions:

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — Ruff + Pytest (API), Pytest (runtime), ESLint/tsc/Vitest (web), Docker builds, `kubectl kustomize` validation
- [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml) — Playwright smoke against Compose
