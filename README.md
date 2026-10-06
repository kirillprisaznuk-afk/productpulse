# ProductPulse

**Product Analytics & Experimentation Platform — Stage 5 analytics interfaces.**

ProductPulse is a locally runnable portfolio project for exploring activation, acquisition
quality, retention, account revenue, and experiments in a fictional B2B SaaS product.
All data describes **TaskHarbor**, an invented workspace product. No names, emails, customer
records, or external services are used.

Stage 1 provides a deterministic event generator, PostgreSQL warehouse, migrations and validation.
Stage 2 adds a SQL-first backend analytics engine: activity, activation, ordered funnels, weekly
retention, account monetization, segmentation and period comparisons. Stage 3 adds binary experiment
inference, health diagnostics and sample-size planning. Stage 4 adds a Next.js application shell,
Overview, Funnels and Methodology. Stage 5 completes Retention, Segments and Experiments,
including sample planning. See [frontend setup and validation](frontend/README.md).

```text
Synthetic generator -> PostgreSQL -> SQL analytics
                                     -> statistics -> FastAPI -> Next.js
```

## Quick start with Docker Compose

Requires Docker Engine/Desktop with Compose v2. Run from the repository root:

```sh
cp .env.example .env
docker compose up -d --build
# Compose waits for PostgreSQL readiness, migrates, seeds if empty, then starts the API.
curl http://localhost:8000/health
curl http://localhost:8000/api/demo/summary
```

PowerShell: use `Copy-Item .env.example .env` and `Invoke-RestMethod` instead of `cp`/`curl`
if preferred. Set `API_PORT=18080` in `.env` if port 8000 is occupied (adjust URLs accordingly).
Subsequent startups never overwrite your warehouse. To replace it intentionally:

```sh
docker compose run --rm --no-deps api python -m app.seed --reset --seed 42
```

To start the database alone and run migrations separately:

```sh
docker compose up -d db
docker compose run --rm migrate
```

The startup seed uses `--if-empty`: any existing warehouse rows cause it to preserve the dataset.
It does not repair partial/manual data; validate or explicitly reset such data before use.
`docker compose down` preserves the named database volume. The reset flag replaces only the six
warehouse tables, inside one transaction; it does not drop databases or Alembic history.

## Local Python development

Python 3.12+ and PostgreSQL 17 are required. Create the database using Compose above or your local
PostgreSQL installation. Use a dedicated local synthetic database. From the repository root:

```sh
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# PowerShell: .\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.lock
cd backend
alembic upgrade head
python -m app.seed --seed 42
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Root `.env` supplies `DATABASE_URL`; environment variables take precedence. The example values
are disposable local defaults. Set host/port appropriately if PostgreSQL is already installed.
No machine-specific runtime paths are required. `--users 250` makes a small dataset;
`--dry-run` validates and prints a sanity report without contacting PostgreSQL.

Dependencies, including transitive dependencies, are pinned in `backend/requirements.lock`.
`pyproject.toml` records direct dependencies and tooling. Container image versions are pinned
by release tag, not immutable digest. Update these deliberately alongside validation.

## Validation and tests

From `backend`, with the environment activated:

```sh
pytest --cov=app --cov-report=term-missing
ruff check .
ruff format --check .
alembic check
```

Database integration tests require a **separate disposable database whose name ends in `_test`**.
They drop/recreate the ProductPulse schema and truncate its data:

```sh
# Create once using your PostgreSQL tooling:
createdb -h localhost -U productpulse productpulse_test
# Linux/macOS:
export TEST_DATABASE_URL=postgresql+psycopg://productpulse:productpulse_local@localhost:5432/productpulse_test
# PowerShell equivalent:
# $env:TEST_DATABASE_URL='postgresql+psycopg://productpulse:productpulse_local@localhost:5432/productpulse_test'
pytest --cov=app --cov-report=term-missing
```

Without that variable, PostgreSQL integration tests are explicitly skipped. Do not count such
a run as full validation. Tests use a 250-user seed, never the default large seed.
`python ../scripts/verify_database.py` validates the persisted warehouse, writes a sanity report
to stdout, and prints representative synthetic rows. It expects the default seed/user count;
pass `--users` and `--seed` for a custom seed.

## Endpoints

- `GET /health`: database connectivity check, 200 when available, 503 otherwise.
- `GET /api/demo/summary`: observed event bounds and row counts; null bounds for an empty warehouse.
- FastAPI's standard OpenAPI documentation is available at `/docs`.

Stage 2 endpoints under `/api/analytics/`: `overview`, `activity`, `activation`, `funnel`,
`retention`, `segments`, and `monetization`. Dates use UTC with an exclusive end date. Defaults
cover June 2025, ending July 1. See [analytics contracts and worked example](docs/ANALYTICS.md).
From `backend`, run `python ../scripts/verify_analytics.py --explain` for aggregate sanity results
and representative PostgreSQL plans against the existing dataset.

## Documentation

Stage 3 endpoints: `GET /api/experiments`, `GET /api/experiments/{id}/analysis`,
`POST /api/experiments/power`, and `POST /api/experiments/mde`.
See [experimentation methods, examples and validation](docs/EXPERIMENTATION.md).
Run `python scripts/verify_experiments.py --explain` from the root for read-only full-data results.

- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Event taxonomy](docs/EVENT_TAXONOMY.md)
- [Metric contracts](docs/METRICS.md)
- [Analytics engine](docs/ANALYTICS.md)
- [Experimentation engine](docs/EXPERIMENTATION.md)
- [Synthetic assumptions](docs/SYNTHETIC_DATA.md)
- [Stage 1 validation record](docs/VALIDATION.md)

All six analytics routes are functional. Authentication, uploads, AI features, cloud infrastructure,
deployment and final portfolio packaging remain outside the current scope. Stage 6 is complete;
Stage 7 has not begun. See [decision rules and Stage 6 validation](docs/DECISION_INSIGHTS.md).
