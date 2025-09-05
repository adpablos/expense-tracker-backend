Expense Tracker Backend
=======================

Backend API for the Expense Tracker app. Minimal, typed, and testable.

Features
--------

- **Expenses, Categories, Subcategories**
- **Auth0 JWT auth** with per-request household context (`X-Household-Id`)
- **OpenAI (Responses API)** for receipt/audio extraction
- **Swagger** docs, **Jest** unit/integration tests, **Winston** logging

Quick Start (Local)
-------------------

1) Prereqs: Node 18+, npm 9+, Docker (for Postgres/tests)

2) Install deps:
```bash
npm install
```

3) Start Postgres (example on host port 55432):
```bash
docker run --name expenses-postgres \
  -p 55432:5432 -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=expense_tracker_dev -d postgres:13
```

4) Configure environment: create a `.env` in project root:
```env
PORT=3001
NODE_ENV=development
NPM_CONFIG_PRODUCTION=false

DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=55432
DB_DATABASE=expense_tracker_dev
DB_SSL=false

OPENAI_API_KEY=replace_me
OPENAI_MODEL=gpt-4o-mini

AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.expensetracker.com
AUTH0_CLIENT_ID=replace_me
AUTH0_CLIENT_SECRET=replace_me
```

5) Initialize schema/data:
```bash
npm run init-db
```

6) Run (dev):
```bash
npm run dev
```
Server: http://localhost:3001 — Swagger: http://localhost:3001/api-docs

Deployment (Railway)
--------------------

Service name in Railway: `backend` (project `expense-tracker`). Two environments:

- `staging` — auto-deploy from `feature/**`
- `production` — auto-deploy from `main`

Environment variables (per environment):

- `CORS_ALLOWED_ORIGINS` — include both UI and API domains
- DB variables (managed by Railway)
- `NODE_ENV` (staging|production)

CI/CD (GitHub Actions): add `.github/workflows/deploy-backend.yml` in this repo.
Requires repo secret `RAILWAY_TOKEN`. Optional `BACKEND_HEALTH_URL` for smoke test.

Scripts
-------

- `npm run dev` — Start in development (ts-node)
- `npm run build && npm start` — Build to `dist/` and run
- `npm run test:unit` — Unit tests
- `npm run test:integration` — Integration tests (Dockerized PG on 5433)
- `npm run lint:fix` — ESLint + Prettier

Notes
-----

- Env is centralized in `src/config/` (`config.ts`, `database.ts`, `auth.ts`, `openai.ts`).
- DB port is required; choose any free one (e.g., 55432). Integration tests map host `5433`→container `5432`.
- OpenAI uses the Responses API only; no legacy Chat Completions code.

Folder Structure
----------------

```
src/
  app.ts              Express app wiring
  server.ts           HTTP server
  config/             Centralized config (env, db, auth, openai)
  controllers/        Route handlers
  middleware/         Auth0, household, error, logging
  repositories/       DB access
  services/           Business logic + external clients
  routes/             Express routers
  swagger.ts          Swagger setup
scripts/
  init-db.ts          Initialize schema from scripts/sql/*.sql
  sql/                SQL scripts
tests/                Unit + integration
```

Troubleshooting
---------------

- Cannot connect to DB: verify `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_DATABASE` and container is up.
- 401s in dev: ensure valid Auth0 values or mock in tests only.
- Port in use: change `PORT` or stop the conflicting process.

License
-------

MIT