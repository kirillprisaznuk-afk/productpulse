# Architecture

One Python application and one PostgreSQL database. SQLAlchemy 2 describes the schema; Alembic
owns DDL. There is no application-startup `create_all`. Pydantic validates seed configuration and
API response contracts. Synchronous FastAPI handlers use per-request SQLAlchemy sessions.

`app/seed/generator.py` is pure and deterministic. `validation.py` checks row shapes, referential
integrity, controlled categories and lifecycle relationships. `loader.py` writes validated data
in batches within a transaction, using a PostgreSQL advisory lock to serialize seed commands.
Readers see a consistent summary from one SQL statement. A failed reset rolls back old data.

Foreign keys and CHECK constraints guard row-local invariants in PostgreSQL. Cross-row temporal
rules and matching billing events are verified by the dataset validator. They are not database
triggers: future ingestion paths must reuse or extend these contracts.

Compose exposes PostgreSQL and the API only on loopback. Database readiness gates migrations;
migration success gates a seed job, then seed success gates the API. The startup seed uses
`--if-empty` under the same transaction lock, preserving any existing warehouse rows. Partial
manual data is not silently repaired. Destructive reseeding always requires explicit `--reset`.
The API runs as a non-root container user. This is a local demo, with no authentication.

Stage 2 analytics are SQL-first in `app/analytics/`, with typed HTTP contracts and read-only,
repeatable-read request transactions. See [ANALYTICS.md](ANALYTICS.md) for queries and semantics.
Stage 3 experiment queries aggregate assignment eligibility, maturity and conversions in PostgreSQL.
Only two variant rows reach the statistical functions in `app/experiments/`. Routes validate typed
contracts; the service assembles inference, health and deterministic decisions. Read-only,
repeatable-read transactions use UTC and a 15-second statement timeout. Planning endpoints need no
database. Standard-library statistics require no new runtime dependency or migration. See
[EXPERIMENTATION.md](EXPERIMENTATION.md). A Next.js client remains a later milestone.

Implementation references: [SQLAlchemy PostgreSQL dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html),
[FastAPI session dependency lifecycle](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/).
