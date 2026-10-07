# Local portfolio release validation

Validated on **7 October 2026**. ProductPulse is a local-only synthetic-data portfolio project.
No product features or statistical definitions were added in this release. No remote repository,
remote CI run, public publication or production deployment is claimed.

## Release scope

README positioning, case-study workflow, architecture, six current screenshots, developer/local
operation guides, Windows launch/stop wrappers, a containerized frontend and GitHub Actions.
Obsolete stage-by-stage frontend setup prose was replaced by one current developer guide.
Useful analytical documentation, validation scripts and legitimate Git history were preserved.
A default local credential was replaced by a placeholder; the launcher creates a random ignored
password. The only other backend edit shortens an overlong module docstring for Ruff compliance.

## Acceptance results

| Gate             | Result                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh setup      | New `productpulse-local` project, new named volume, clean dependency installation, migrations and deterministic seed completed            |
| Start            | `START_PRODUCT_PULSE.bat` succeeded; PostgreSQL/API/frontend healthy; browser-launch branch executed                                      |
| Stop             | `STOP_PRODUCT_PULSE.bat` stopped only this project's resources; old development stack remained running                                    |
| Persistence      | Named volume retained; restart seed reported `preserved_existing_dataset`                                                                 |
| Backend          | 136 passed, 0 skipped; 98.96% coverage (99% rounded), threshold 95%                                                                       |
| Frontend         | 47 passed across 5 files, 0 skipped; also passed in isolated Linux container                                                              |
| Static checks    | Ruff lint/format, ESLint, Prettier and TypeScript passed                                                                                  |
| Production build | Next.js production build passed inside the clean Docker image                                                                             |
| Migrations       | `8831dde5f821 (head)`; `alembic check`: no new upgrade operations; fresh and existing startup succeeded                                   |
| API contracts    | Live OpenAPI schema equals generated frontend schema; `/docs` returned HTTP 200                                                           |
| Live smoke       | All six routes, date changes, four dimensions, cohort cells, cross-page metrics and both actual experiments passed                        |
| Browser          | All six routes reviewed; no application console errors/warnings observed                                                                  |
| Logs             | No application errors, 500 responses, failed queries, hydration or permission errors observed                                             |
| Dataset          | Six persisted table fingerprints match the Stage 1 baseline after new initialization and restart                                          |
| CI               | Workflow defined for push/PR; equivalent commands validated locally with PostgreSQL and Linux frontend container; no remote run available |

One dependency warning remains in the backend test harness: Starlette refers to a deprecated AnyIO
alias. It is not an application runtime error. No frontend coverage percentage is claimed.

## Dataset and performance

16,000 users, 185,249 events, 4,578 accounts, 834 subscriptions, 2 experiments and 16,000 assignments.
Generator, seed configuration, migrations and dataset semantics were unchanged.

Single sequential local HTTP-body sanity sample during release work (not a benchmark or paint time):
Overview 2,066 ms, Funnels 1,331 ms, Retention 468 ms, Segments 259 ms, Experiments 226 ms,
Methodology 11 ms. Docker build activity was concurrent; no new optimization was justified.
Stage 6 timing methodology and SQL optimization evidence remain in [DECISION_INSIGHTS.md](DECISION_INSIGHTS.md).

## Screenshots

Six real application screenshots in `screenshots/`, captured through the browser after startup
validation. Requested viewport 1440 x 1000; browser content captures are consistently **1425 x 990**.
JPEG files total approximately 565 KiB, with no UI alterations or fabricated data. Overview/Funnels
use June, Retention/Segments use the full observation window, Experiments shows Guided onboarding.
Images focus on the relevant analytical section; the retention matrix is scrolled to recent cohorts.
README links point to the actual `.jpg` format. No stale stage screenshots are published.

## Privacy and repository audit

Standalone root and `main` branch verified. No remote or license was configured. No token, private
key, personal absolute path, customer data, IDE configuration, environment credential, dependency
folder, cache, log, local database, build output or internal prompt is included in release files.
`.env.example` contains placeholders only. Generated OpenAPI types/schema and synthetic fixtures
are intentional source assets. The ignored `.runtime/local.env` is not staged or published.

The original history contains a deliberately public disposable localhost demo default, not an
external service secret. Current startup uses a newly generated local password; legitimate history
was not rewritten. No employer material, copyrighted external dataset or fake product adoption.

## Reproduce

1. Start Docker Desktop, double-click `START_PRODUCT_PULSE.bat`.
2. Visit `http://localhost:3000` and `http://localhost:8000/docs`.
3. Use `STOP_PRODUCT_PULSE.bat`, then start again; data persists.
4. Follow [DEVELOPMENT.md](DEVELOPMENT.md) for quality checks. Database tests must target a separate
   disposable database ending `_test`, never the demo warehouse.
5. Run `frontend/scripts/smoke.mjs` with the running API and frontend.

The launcher detects Docker on PATH or in standard system/per-user Docker Desktop locations.
Missing prerequisites and startup failures keep an explanatory console open. It never resets data,
prunes Docker or terminates unrelated Node/Python processes.

## Publication handoff

The repository is prepared for public review. No intended GitHub remote exists, so publication is
the only manual handoff. Create/select the intended public repository, add its remote, and push
without force. Remote Actions should then run; do not claim its success in advance.

Suggested description: Product analytics and experimentation platform for activation, funnels,
retention, segmentation, monetization and A/B testing.

Suggested topics: `product-analytics`, `business-analytics`, `ab-testing`, `experimentation`,
`fastapi`, `postgresql`, `nextjs`, `typescript`, `python`, `sql`, `decision-support`.

No version tag was added because the project has no release-tag convention and package metadata
remains at 0.1.0. No license was chosen on the owner's behalf. The public repository is not thereby
licensed for unrestricted reuse. No LinkedIn modification was performed.

Known product limitations: synthetic fixed-window data, simplified subscriptions, no authentication
or ingestion, local-only runtime, fixed-horizon tests and unadjusted shared-account dependence.
