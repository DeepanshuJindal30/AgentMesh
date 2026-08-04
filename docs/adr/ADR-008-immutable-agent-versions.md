# ADR-008: Immutable agent versions

## Status

Accepted

## Context

Executions must be reproducible against a known configuration. Editing a live agent in place breaks auditability.

## Decision

Treat **published agent versions as immutable**. Edits create new versions. Every execution references a specific `agent_version_id`.

## Alternatives considered

1. Mutable config with audit trail only
2. Git-backed config store

## Benefits

- Reproducible runs
- Clear publish workflow
- Safer rollbacks (run prior version)

## Drawbacks

- More rows / UX for version history
- Requires publish step discipline

## Consequences

- DB constraints prevent updating published version payloads
- UI separates draft edit vs publish confirmation
