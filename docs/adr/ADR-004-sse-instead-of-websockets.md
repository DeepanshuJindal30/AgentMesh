# ADR-004: SSE instead of WebSockets

## Status

Accepted

## Context

The execution detail screen needs live server→client event delivery with reconnect and catch-up.

## Decision

Use **Server-Sent Events (SSE)** with Redis Pub/Sub for fan-out and PostgreSQL as the durable event log. Support `Last-Event-ID` for reconnection.

## Alternatives considered

1. WebSockets
2. Long polling
3. Client polling only

## Benefits

- Uni-directional fit for event streams
- Automatic reconnect semantics
- Simpler proxies/load balancers than WS in many setups
- Easy catch-up via event IDs

## Drawbacks

- Not bidirectional (cancel/retry remain REST)
- Some proxies buffer SSE if misconfigured

## Consequences

- Document SSE choice in architecture docs
- Persist events so reconnecting clients recover missed data
