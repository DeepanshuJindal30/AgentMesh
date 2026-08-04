# ADR-005: At-least-once delivery and idempotency

## Status

Accepted

## Context

RabbitMQ/Celery provide at-least-once delivery. Duplicate messages and crash redeliveries are expected.

## Decision

Embrace **at-least-once** delivery. Prevent duplicate business effects using unique execution IDs, atomic status transitions, idempotency keys, DB constraints, and row locks where needed.

## Alternatives considered

1. Attempt exactly-once (not realistically achievable end-to-end)
2. At-most-once (drops work on failure)

## Benefits

- No silent loss of executions
- Clear recovery story after worker crash

## Drawbacks

- Handlers must be idempotent
- Extra DB complexity

## Consequences

- Never rely solely on broker acks for correctness
- Integration tests cover duplicate delivery
