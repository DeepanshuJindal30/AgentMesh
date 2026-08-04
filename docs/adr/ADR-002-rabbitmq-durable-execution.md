# ADR-002: RabbitMQ for durable execution

## Status

Accepted (foundation)

## Context

Agent executions are long-running and must survive API restarts and worker crashes.

## Decision

Use **RabbitMQ** as the durable work queue with Celery workers, dead-letter queues, and at-least-once delivery.

## Alternatives considered

1. Redis lists as a queue
2. Postgres `SKIP LOCKED` job table only
3. Synchronous gRPC from API to runtime

## Benefits

- Durable acknowledgements and DLQ tooling
- Mature Celery integration
- Clear separation of request path vs execution path

## Drawbacks

- Additional operational component
- At-least-once requires idempotent consumers

## Consequences

- API returns 202 after transactional enqueue
- Workers treat DB state machine as source of truth
