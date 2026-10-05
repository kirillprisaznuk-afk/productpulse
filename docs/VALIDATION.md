# Stage 1 validation record

Verified on 2026-10-04 with Python 3.12.14 and an isolated PostgreSQL 17.11 Windows cluster.
Seed 42, generator version 0.1.0. This report records actual persisted rows, not estimates.
Docker acceptance was also completed on 2026-10-04 using Python 3.12.11 and PostgreSQL 17.6
in the pinned Linux containers, through Docker Desktop's WSL2 backend.

## Quality gates

| Check | Result |
| --- | --- |
| pytest including real PostgreSQL integration | 33 passed, no skips, 98% statement coverage |
| Ruff lint | Passed across backend and verification script |
| Ruff format check | Passed, 23 Python files |
| Dependency consistency (`pip check`) | Passed |
| Fresh PostgreSQL migration | Passed; head `8831dde5f821` |
| Downgrade to base and upgrade to head | Passed on disposable test database |
| Alembic schema drift check | Passed; no new upgrade operations |
| Offline migration SQL generation | Passed |
| Default dataset generation/load | Passed |
| Full persisted dataset read-back and invariants | Passed |
| Existing seed refused without reset | Passed in integration tests |
| Failed reset preserves prior dataset | Passed in integration tests |
| Startup `--if-empty` preserves seeded database | Passed against full default dataset |
| Live HTTP `/health` | 200, `{"status":"ok","database":"ok"}` |
| Live HTTP `/api/demo/summary` | 200, counts match persisted warehouse |
| Docker image build and Compose startup | Passed from a new project-scoped volume |
| Docker PostgreSQL restart persistence | Passed; all six full-table SHA-256 fingerprints unchanged |
| Docker seed without reset | Refused with exit 1; all six table fingerprints unchanged |
| Docker explicit reset with seed 42 | Passed; all six table fingerprints reproduced exactly |
| Docker pytest / coverage | 33 passed, no skips, 98% coverage |
| Docker Ruff lint / format / Alembic check | Passed; 23 Python files formatted, no schema drift |

One upstream Starlette/AnyIO TestClient deprecation warning is present; no test failures.
Coverage does not include the manual full-dataset checks. Portable PostgreSQL came from the
[EDB binary distribution](https://www.enterprisedb.com/download-postgresql-binaries), linked by
the [PostgreSQL Windows download page](https://www.postgresql.org/download/windows/).

The native verification database listens on loopback port 55432 and API on port 18080. Port 8000
was occupied by an unrelated application, which was left unchanged. Runtime binaries, database
files, logs, and the virtual environment live only in ignored local directories. These processes
are development helpers, not registered system services. Compose normally uses 5432/8000.

## Persisted dataset

| Entity | Count |
| --- | ---: |
| Accounts | 4,578 |
| Users | 16,000 |
| Events | 185,249 |
| Paid subscriptions | 834 |
| Experiments | 2 |
| Experiment assignments | 16,000 |

Observation window: 2025-01-01 through 2025-06-30, cutoff 2025-07-01 00:00 UTC.
Actual first event: `2025-01-01T00:52:57.825985Z`.
Actual last event: `2025-06-30T23:59:20.052160Z`.

| User acquisition channel | Count |
| --- | ---: |
| Organic | 4,349 |
| Paid search | 3,656 |
| Paid social | 4,809 |
| Referral | 1,882 |
| Partner | 1,304 |

| Account company size | Count |
| --- | ---: |
| Solo | 971 |
| SMB | 2,217 |
| Mid-market | 1,033 |
| Enterprise | 357 |

| User country | Count |
| --- | ---: |
| United Kingdom | 4,807 |
| Germany | 4,065 |
| Spain | 2,542 |
| France | 2,865 |
| Netherlands | 1,721 |

| Experiment | Control | Treatment |
| --- | ---: | ---: |
| Guided onboarding | 3,844 | 3,968 |
| Workspace checklist copy | 4,098 | 4,090 |

| Event | Count |
| --- | ---: |
| landing_view | 16,000 |
| signup_started | 16,000 |
| signup_completed | 16,000 |
| onboarding_started | 15,029 |
| onboarding_completed | 8,853 |
| core_action | 112,406 |
| subscription_started | 834 |
| subscription_cancelled | 127 |

8,838 distinct users have a core action (not a seven-day activation calculation).
478 pro and 356 business contracts; 127 observed cancellations; 707 contracts remain uncancelled
at cutoff. 3,744 accounts never subscribed. Free is represented by absence of an active contract.

Representative rows were inspected: account 1 is SMB, created January 5; user 1 belongs to it,
arrives at account creation, starts signup one minute later, completes signup around ten minutes
later, and is assigned to experiment 1 at completion. Subscription 1 belongs to account 4,
initiated by user 12 on February 1, business plan at $199/month. The full read-back validator checks
these temporal and referential conditions for every row, including billing-event parity.

## Docker acceptance completed

The earlier claim that Docker was not installed was incorrect. Docker Desktop was available in
a per-user installation: the Windows PowerShell environment lacked its CLI on PATH, and the
sandbox denied direct execution. Running that installed CLI with the required execution permission
reached Docker Desktop 4.93.0, Engine 29.8.1, Compose 5.5.1, using the `desktop-linux` context and
WSL2 backend. No reinstall, global settings changes, or WSL configuration changes were needed.

The smoke test used project `productpulse-stage1-smoke`, a newly created
`productpulse-stage1-smoke_postgres_data` volume, PostgreSQL port 55433, and API port 18081.
Compose configuration resolved correctly; the source configuration contains no machine-specific
paths. PostgreSQL health gated the migration from zero, successful migration gated seeding, and
successful seeding gated FastAPI startup. Both one-shot services exited 0.

The complete persisted dataset was read back and validated before and after restart, refused
reseed, and explicit reset. Counts and dates match the tables above; representative rows were
inspected again. Both live HTTP endpoints returned 200 and the summary matched database counts.
The final tests ran inside the Linux API container against a separate `productpulse_test` database
in this same isolated PostgreSQL container. Dependency consistency and Alembic head/drift checks
also passed. The existing Yummy Flow container remained running and healthy throughout.

The README startup and reset commands required no corrections. No application code or Compose
configuration changed. The smoke stack remains available on loopback port 18081, with its volume
preserved. Local transcripts and table fingerprints are saved under ignored `.runtime/` files.

**Stage 1: COMPLETE. Ready for Stage 2: YES.** No Stage 2 work was started.
