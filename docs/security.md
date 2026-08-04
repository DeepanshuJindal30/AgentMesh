# AgentMesh Security Design

> Status: skeleton — expanded in Phase 2 and Phase 8.

## Principles

- Prefer OIDC Authorization Code + PKCE via Keycloak.
- Do not store access tokens in browser `localStorage`.
- Use a Next.js BFF / HttpOnly cookie session for the browser.
- Derive tenant context from verified membership, never from client-supplied `organization_id` alone.
- Enforce RBAC in FastAPI dependencies.
- Hash API keys at rest; show plaintext only once at creation.
- Validate JWT signature, issuer, audience, and expiry.
- Structured audit logs for security-sensitive actions.

## Controls map

| Control | Implementation |
|---------|----------------|
| Authentication | Keycloak OIDC |
| Authorization | RBAC permissions |
| Tenant isolation | Service-layer filters + tests |
| Transport | TLS in production / Compose edge |
| Secrets | Env + K8s Secrets templates |
| Input validation | Pydantic / Zod |
| Rate limiting | Redis |

## Demo credentials

Local demo passwords are documented in the README and Keycloak realm import. They are **development-only**.
