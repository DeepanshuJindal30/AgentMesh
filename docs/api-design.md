# API Design

> Expanded in Phase 2+. Versioned under `/api/v1`.

## Conventions

- JSON request/response bodies
- RFC7807-inspired structured errors
- `X-Correlation-ID` on every request
- Pagination: `page`, `page_size`
- Filtering and sorting via query params

## Foundation endpoints (Phase 1)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/ready` | Readiness + dependency checks |
| GET | `/api/v1/system/info` | Build/phase metadata |
