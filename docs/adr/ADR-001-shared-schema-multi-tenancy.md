# ADR-001: Shared-schema multi-tenancy

## Status

Accepted (foundation)

## Context

AgentMesh must isolate organization data while remaining operable as a single local Compose deployment and a small Kubernetes footprint.

## Decision

Use a **shared database and shared schema**. Every tenant-owned table includes `organization_id`, `created_at`, and `updated_at`. Isolation is enforced in repository/service layers using membership-derived organization context.

## Alternatives considered

1. Database-per-tenant
2. Schema-per-tenant
3. Shared schema + Postgres Row-Level Security (RLS) from day one

## Benefits

- Simple operations and migrations
- Efficient cross-cutting analytics (usage, quotas)
- Fast local bring-up

## Drawbacks

- Requires rigorous query discipline
- Higher blast radius if a filter is omitted
- No DB-enforced isolation until RLS is added

## Consequences

- Mandatory tenant-isolation tests
- Never trust client-supplied `organization_id`
- Future improvement: adopt RLS as defense in depth
