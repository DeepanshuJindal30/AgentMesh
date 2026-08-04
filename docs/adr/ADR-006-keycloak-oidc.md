# ADR-006: Keycloak for OAuth2/OIDC

## Status

Accepted

## Context

The platform needs standards-based identity without paid IdP dependencies for local demos.

## Decision

Use **Keycloak** as the OAuth2/OIDC provider with Authorization Code + PKCE for the web app.

## Alternatives considered

1. Auth0 / Cognito (paid / cloud-locked)
2. Homegrown JWT issuer
3. Dex

## Benefits

- Full OIDC locally via Compose
- Realm import for demo users/roles
- JWT validation compatible with FastAPI

## Drawbacks

- Heavier than a mock auth stub
- Cold start time in Compose

## Consequences

- Demo users documented as local-only
- BFF/session pattern; no tokens in localStorage
