# Cloud deployment

AgentMesh is a **multi-service** system (API + worker + gRPC runtime + Postgres + Redis/RabbitMQ).  
**Vercel can host the Next.js frontend only.** The control plane needs a Docker-capable host.

## Recommended free split

| Piece | Free host | Notes |
|-------|-----------|--------|
| Marketing + docs + console UI | **Vercel** | `apps/web` |
| API + worker + runtime + DB | **Render** (blueprint) | `render.yaml` — free tier sleeps when idle |
| Local full fidelity | Docker Compose | RabbitMQ + Keycloak + monitoring |

## 1) Frontend → Vercel

### Option A — Dashboard (easiest)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `DeepanshuJindal30/AgentMesh`
3. Set:
   - **Root Directory:** `apps/web`
   - **Framework:** Next.js
4. Environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://<your-render-api>.onrender.com`  
     (set after the API is live; leave empty first to ship docs/marketing)
5. Deploy

### Option B — CLI

```bash
cd apps/web
npx vercel login
npx vercel --prod
```

Set `NEXT_PUBLIC_API_URL` in the Vercel project settings, then redeploy.

## 2) Backend → Render (free)

1. Open [Render Blueprint](https://dashboard.render.com/blueprints/new)
2. Connect the `AgentMesh` GitHub repo
3. Render reads [`render.yaml`](../render.yaml)
4. After deploy, copy the **agentmesh-api** URL
5. In Render → `agentmesh-api` → Environment:
   - `API_CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000`
6. Paste that API URL into Vercel as `NEXT_PUBLIC_API_URL` and redeploy the web app

### Free-tier trade-offs

- Services **spin down** after idle; first request can take 30–60s
- Blueprint uses **Redis as Celery broker** (no RabbitMQ DLQ on free Render)
- **Keycloak omitted** — `AUTH_DEV_BYPASS=true` for the public demo
- Postgres free DB may expire after 90 days on some plans — fine for portfolio demos

### Demo login (cloud)

Same as local when bypass is on:

- `admin@agentmesh.local` / `AgentMesh!Dev1`

## 3) Database URL note (Render + SQLAlchemy)

Render Postgres URLs often look like `postgres://...`.  
If the API fails to connect, set:

```text
DATABASE_URL=postgresql+asyncpg://...
DATABASE_URL_SYNC=postgresql+psycopg2://...
```

(replace scheme; keep user/host/db the same)

Worker needs a **sync** URL (`psycopg2`). You may need to duplicate/adjust the connection string in the worker service env.

## 4) Verify

```bash
curl https://<api>.onrender.com/health
# open https://<app>.vercel.app
# login → Run live demo
```

## Why not “everything on Vercel”?

Vercel is excellent for Next.js, but AgentMesh also needs:

- long-running **Celery workers**
- a **gRPC** runtime process
- **Postgres + Redis** (and locally RabbitMQ)

Those do not map to serverless functions. The Vercel + Render split is the standard free portfolio approach.
