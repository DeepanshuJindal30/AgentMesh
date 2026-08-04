# AgentMesh Threat Model

> Status: skeleton — refined as features land.

## Assets

- Tenant agent configurations and execution results
- API keys and session credentials
- Ticket knowledge base content
- Audit logs

## Trust boundaries

1. Browser ↔ Next.js BFF
2. Next.js ↔ FastAPI
3. FastAPI ↔ PostgreSQL / Redis / RabbitMQ
4. Worker ↔ Runtime (gRPC, internal network)
5. Keycloak as identity provider

## Key threats and mitigations

| Threat | Mitigation |
|--------|------------|
| Cross-tenant data access | Membership-derived org + repository filters + tests |
| Privilege escalation across orgs | Org-scoped roles; admin in A ≠ admin in B |
| Token theft from XSS | HttpOnly cookies; CSP/security headers |
| Replay / duplicate executions | Idempotency-Key + DB constraints |
| Queue poison messages | DLQ + max retries |
| Secret leakage in git | `.gitignore`, `.env.example` only |
| Injection | Parameterized SQLAlchemy; Zod/Pydantic validation |

## Out of scope (v1)

- Formal STRIDE workshop sign-off
- Hardware security modules
- Multi-region active-active auth
