# Developer guide

Use Python 3.12, PostgreSQL 17, Node 24 and pnpm 11.25.0. The easiest full-product launch is
[the Docker launcher](LOCAL_DEMO.md). For host development, install pinned dependencies and set
`DATABASE_URL` to your local database; root `.env` is loaded by the backend. Never commit it.

```sh
python -m venv .venv
# Activate: .venv/bin/activate (POSIX) or .venv/Scripts/Activate.ps1 (PowerShell)
pip install -r backend/requirements.lock
cd backend
alembic upgrade head
alembic check
python -m app.seed --if-empty
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal, with `PRODUCTPULSE_API_URL=http://127.0.0.1:8000`:

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

The UI runs at port 3000. API requests are server-side; the browser receives no database credential.

## Tests and quality

Backend integration tests require `TEST_DATABASE_URL` pointing to a **separate disposable
PostgreSQL database whose name ends in `_test`**. They recreate/truncate schema and exercise Alembic.
Never point this variable at the demonstration warehouse. Missing test configuration skips database
checks; such a run is not full acceptance. CI supplies a PostgreSQL service and requires 95% coverage.

From root: `ruff check --config backend/pyproject.toml backend scripts` and
`ruff format --check --config backend/pyproject.toml backend scripts`.
From backend: `pytest --cov=app --cov-report=term-missing`.
From frontend: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
Frontend tests use API-shaped fixtures; the live smoke script performs read-only comparisons with
real API responses: `node scripts/smoke.mjs` (requires API and production frontend running).

Regenerate contracts with `pnpm generate:api`, then format generated artifacts with the installed
Prettier if needed. Do not hand-edit `types/api.d.ts` or `types/openapi.json`. Runtime Ajv checks
reject schema drift. The production build does not require a running API for dynamic data routes.

Useful read-only helpers in `scripts/`: `verify_database.py`, `verify_analytics.py --explain`,
`verify_experiments.py --explain`. They use the configured database, never seed or reset it.
See [analytics](ANALYTICS.md), [experiments](EXPERIMENTATION.md) and [decision rules](DECISION_INSIGHTS.md).
