# AgentMesh Kubernetes (Kind / Minikube)

Local development manifests for the AgentMesh control plane and data plane.
These are **not** production-hardened (single Postgres/Redis/RabbitMQ, plaintext secrets).

## Prerequisites

- Docker Desktop
- [Kind](https://kind.sigs.k8s.io/) or Minikube
- `kubectl`
- NGINX Ingress (Kind: `kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml`)

## Build and load images (Kind)

```bash
# From repo root (agentmesh/)
docker build -t agentmesh/api:local ./services/api
docker build -t agentmesh/worker:local ./services/worker
docker build -t agentmesh/runtime:local ./services/runtime
docker build -t agentmesh/web:local -f ./apps/web/Dockerfile ./apps/web

kind load docker-image agentmesh/api:local agentmesh/worker:local agentmesh/runtime:local agentmesh/web:local
```

## Apply

```bash
kubectl apply -k infrastructure/kubernetes/
kubectl -n agentmesh get pods,svc,hpa,ingress
```

## Port-forward (without Ingress)

```bash
kubectl -n agentmesh port-forward svc/api 8000:8000
kubectl -n agentmesh port-forward svc/web 3000:3000
```

## Probes

| Workload | Readiness | Liveness |
|----------|-----------|----------|
| api | `GET /ready` | `GET /health` |
| web | `GET /` | `GET /` |
| runtime | TCP `:50051` | TCP `:50051` |
| worker | — | `celery inspect ping` |
| postgres / redis / rabbitmq | native CLI probes | native CLI probes |

## HPA

CPU-based HPA on `api`, `worker`, and `runtime` (min 2 / max 6–8). Requires metrics-server.

## Honest limits

- Keycloak is omitted from this base overlay; use Compose for full OIDC demo, or add a Keycloak Deployment separately.
- Secrets are plaintext `stringData` for local demos only.
- Queue-depth autoscaling is a documented future improvement (see README).
