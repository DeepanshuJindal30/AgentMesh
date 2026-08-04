# Interview talking points

Concise answers for AgentMesh portfolio interviews.

## 1. Why REST externally and gRPC internally?

Public clients need browser-friendly HTTP, OpenAPI, and SSE. Internally, workers need a typed, bidirectional-friendly RPC for streaming step events from the agent runtime. gRPC + protobuf give schema evolution and efficient streaming without exposing that surface to browsers.

## 2. Why RabbitMQ if gRPC already exists?

gRPC answers “how does the worker talk to the runtime while a job runs.” The queue answers “how do we accept work durably, survive crashes, retry, and DLQ.” Submitting an execution must return quickly and persist intent; Celery/RabbitMQ provide at-least-once delivery independent of runtime availability.

## 3. At-least-once + idempotency

Messages can be redelivered. Handlers claim executions with atomic status transitions, honor idempotency keys on submit, and treat side effects as replay-safe. We do **not** claim exactly-once end-to-end.

## 4. SSE vs WebSockets

Execution progress is mostly server→client. SSE maps cleanly to HTTP, works with existing auth headers/cookies, and reconnects with last-event idioms. Redis Pub/Sub fans out live events; Postgres retains history for catch-up.

## 5. Shared-schema multi-tenancy

One schema, every row scoped by `organization_id` resolved from membership (never trusted from the client alone). RBAC via FastAPI dependencies. ADR-001 documents the choice vs schema-per-tenant for a portfolio footprint.

## 6. Immutable agent versions

Published versions are immutable so an execution pins exact prompts/config. Re-runs and audits stay reproducible; edits create new versions.

## 7. Session / token storage

Ideal production pattern: BFF + HttpOnly cookies. Local demo currently uses bearer tokens in client state for speed of iteration — call this out as a known hardening gap, not a best practice.

## Bonus

- Rate limits (Redis), quotas, hashed API keys, append-only audit logs
- Prometheus metrics + Grafana dashboard as the ops story
- K8s probes + HPA show deployability beyond Compose
