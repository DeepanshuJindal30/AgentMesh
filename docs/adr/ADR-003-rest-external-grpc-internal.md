# ADR-003: REST externally and gRPC internally

## Status

Accepted (foundation)

## Context

Browsers and public clients need approachable HTTP APIs. Internal step execution benefits from typed streaming RPCs.

## Decision

Expose **REST/OpenAPI** from FastAPI to browsers and partners. Use **gRPC + Protobuf** for worker → runtime `RunExecution` streaming.

## Alternatives considered

1. gRPC-Web to browsers
2. REST everywhere including runtime
3. GraphQL public API

## Benefits

- Browser-native debugging and OpenAPI docs
- Efficient typed internal streaming
- Clear trust boundary (runtime not public)

## Drawbacks

- Two protocol stacks to maintain
- Proto codegen in CI

## Consequences

- Document why gRPC is not a durable job queue (see ADR-002)
- Proto package lives in `packages/proto`
