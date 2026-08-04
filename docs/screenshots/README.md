# Screenshots

Captured from the local Compose stack (Playwright).

| File | View |
|------|------|
| `01-login.png` | Login / demo accounts |
| `02-agents.png` | Agents list (Acme Robotics) |
| `03-execution-live.png` | Ticket Similarity execution + SSE timeline |
| `04-usage.png` | Quotas / usage |
| `04b-api-keys.png` | API keys |
| `04c-audit-logs.png` | Audit logs |
| `05-grafana.png` | Grafana AgentMesh API Overview |

Recapture:

```bash
# Stack up; monitoring profile for Grafana
docker compose --profile monitoring up -d
cd tests/e2e
npm install && npx playwright install chromium
CAPTURE_GRAFANA=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test specs/capture-screenshots.spec.ts
```
