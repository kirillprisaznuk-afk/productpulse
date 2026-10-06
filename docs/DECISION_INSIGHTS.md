# Decision intelligence and Stage 6 acceptance

Validated locally on 6 October 2026, using the unchanged January–June 2025 synthetic warehouse.
Stage 7 and public publication have not begun.

## Architecture and authority

`backend/app/analytics/insights.py` is a small pure-function layer over existing analytics
aggregates. No extra analytics queries, LLMs, external services or frontend decision rules.
Overview, funnel, retention and segment responses add structured `insights`: rule identifier,
severity, priority, metric, message, evidence, destination and an explicit descriptive caveat.
Existing metrics, denominators, observation windows and experiment decision algorithms remain
unchanged. The frontend formats evidence and renders backend messages without rewriting them.

## Rules

| Rule | Eligibility / materiality |
| --- | --- |
| Period changes | Activation >= 2 percentage points; MAU/MRR >= 5% relative; churn >= 1 point |
| Funnel loss | At least 100 entrants; largest positive count and proportional loss |
| Slow transition | At least 100 reached users; highest ordered-stage median >= 1 hour |
| Funnel segment gap | At least 100 entrants in each segment; end-to-end gap >= 2 points |
| Volume vs quality | At least 100 mature users per segment; activation gap >= 5 points against weighted overall activation; signup share >= 20% for weakness, <= 20% for opportunity |
| Retention trend | Fixed Week 4, three consecutive complete cohorts, >= 100 users each, monotonic movement >= 3 points |
| Retention range | Complete observable Week 4 cohorts, >= 100 users each, best–weakest spread >= 3 points |
| Retention segment gap | Same signup cohort and Week 4, >= 100 users per segment, gap >= 5 points |

Missing values and undefined relative changes do not produce insights. Observed zero remains
zero. Incomplete cohorts never enter mature-cohort rules. There are no pooled retention averages.
These are descriptive selection rules, not statistical tests, causal explanations or forecasts.

Priority is explicit: negative changes (20), high-volume weakness (25), funnel losses (30),
retention decline (40), opportunities/segment differences (65), positive period changes (70),
slow transitions (75), cohort ranges (80). Stable rule/segment ordering breaks ties. Overview
shows up to four signals, never padding with fabricated results. Experiment health and decision
validity remain owned by the experimentation engine and are surfaced within Experiments.

## UX and request behavior

- Existing typography, restrained green/neutral palette, panels, tables and chart language remain.
- Signals precede detailed metrics; Evidence disclosures expose actual values and rule thresholds.
- Funnel drop-off highlights are retained; elapsed-time and segment comparisons add context.
- Retention has a bounded scroll region, sticky cohort/header cells, text values and explicit
  unavailable cells. Selected matrix segment and comparison cohort are preserved in the URL.
- Funnel segment, date range, comparison dimension and selected experiment use URL state.
  Curve visibility and table sorting remain local presentation state.
- Date changes reset local cohort/segment selection. Reset stays on the current route.
  Experiments explicitly use their own fixed windows, independent of dashboard dates.
- Four date-filtered pages stream analytics beneath their heading/filter controls. Errors retain
  usable context and offer retry/reset; empty signals do not manufacture a narrative.
- `GET /api/experiments/workspace` returns the register and analyses in one read-only repeatable-read
  transaction: two SQL queries, with no per-experiment HTTP or SQL request loop.
- The population query aggregates signup/core-action timestamps once before joining assignments.
  It preserves the same minimum timestamp, cutoff, validity and maturity semantics as the original
  per-user lateral lookups. Both seeded experiment results exactly match the individual endpoints.
- Generated OpenAPI types and the runtime validation schema match the live backend.

## Performance

Local production server, existing PostgreSQL seed, three sequential full HTTP-body samples per
route. These measurements include server rendering and transport, not browser paint, and are
subject to workstation load. No absolute before/after speed claim is made across separate runs.

| Route | Before median ms | Final median ms |
| --- | ---: | ---: |
| Overview | 1231 | 1444 |
| Funnels | 654 | 742 |
| Retention | 279 | 320 |
| Segments | 212 | 279 |
| Experiments | 151 | 188 |
| Methodology | not recorded | 4 |

The initial batch experiment query exposed a JIT compilation cost: EXPLAIN ANALYZE measured
917 ms total, including 697 ms JIT. Replacing repeated lateral lookups with one grouped outcomes
CTE reduced the measured execution to 189 ms, without changing server JIT configuration, indexes,
warehouse data or statistical definitions. The initial Stage 6 experiment page median was 689 ms;
the final median was 188 ms. This is a bounded local sample, not a general benchmark.

Browser interaction observations: retention dimension submission to rendered matrix about 571 ms;
sample planning submission to visible result about 325 ms. Local segment and curve controls do
not issue aggregate refetches. API analytics measurements ranged from roughly 150 ms retention
to 1 second overview/activity in the earlier sample. No background polling or remote cache added.

## Validation evidence

- Backend: **136 tests passed**, **99% overall coverage**, insight module **96%**. Full PostgreSQL
  regression repeated after SQL optimization. Tests include migration lifecycle, statistical
  validation, batch/single equivalence and the two-query workspace bound.
- Frontend: **47 tests passed across 5 files**. New cases cover signal priority/evidence/zero/null,
  no invented insights, URL selection restoration and route-correct reset. Existing retention,
  segment, experiment, significance/SRM, insufficient-data and planning tests remain green.
- Ruff lint/format, ESLint, Prettier, TypeScript and Next.js production build pass.
- Read-only live smoke passed all six routes, three overview periods, four funnel dimensions,
  four retention/segment dimensions, every displayed matrix cell, weighted activation/MRR
  consistency, invalid inputs and both real experiment analyses.
- The real API was stopped temporarily: all five data pages displayed unavailable errors with
  no fabricated metrics. Restored API; browser retry successfully recovered Retention.
- Browser flows covered Overview signal -> Segments, sorting, Funnels and saved segment reload,
  Retention period/dimension changes and saved cohort reload, both experiments, planning and
  Methodology. Empty signal state observed for company-size segments. Censored cells stayed dashes.
- Experiment 1: +4.9062 pp, p=0.0000125886, 95% CI [+2.7045, +7.1016] pp; 7,812 mature users.
- Experiment 2: +2.3547 pp, p=0.0389820, 95% CI [+0.1192, +4.5869] pp; 7,666 mature and 522 censored.
  Positive evidence is accompanied by a prominent incomplete-horizon decision limitation.
- Planning with baseline 40%, absolute 3 pp, alpha .05 and target power 80% returned 4,234 per
  variant / 8,468 total, matching the API.
- All six pages visually reviewed. Desktop/laptop checks at 1440, 1280 and 1024 pixels included
  local wide-table scrolling, readable controls, numeric alignment, focus indicators, keyboard
  navigation and keyboard-operated Evidence. No page-wide overflow or console warnings/errors
  observed. Semantic tables and textual chart equivalents retained; no claim of formal WCAG audit.
- Product audit: visible questions, concise first-level findings, details progressively disclosed,
  no filler charts, gradients, emoji decorations, fabricated scores or celebratory statistics.
- All six persisted table fingerprints match the Stage 1 baseline: accounts, users, events,
  subscriptions, experiments and experiment_assignments. No dataset regeneration or migration.

## Known limitations

Insights use conservative fixed heuristics, not multiple-comparison-adjusted inference.
No signal is appropriate when eligibility/materiality rules fail. Synthetic sample behavior is not
an assertion about real businesses. Fixed-horizon, independent-user and equal-allocation limits
remain documented. The default data do not exercise every adverse experiment state; SRM warning,
negative/no-difference and insufficient data are covered by fixtures and backend tests.
One existing Starlette/AnyIO deprecation warning remains. Browser QA is manual; repeatable live
HTTP smoke is in `frontend/scripts/smoke.mjs`. Mobile perfection, deployment and portfolio
packaging are outside this stage.

## Reproduction

Use the setup and commands in the root and frontend READMEs. For the existing local validation
stack set `PRODUCTPULSE_API_URL=http://127.0.0.1:18081`, start the production frontend, and run
`node scripts/smoke.mjs` from `frontend`. Backend tests require the separate test database.
Use Ruff with `--config backend/pyproject.toml` for both `backend` and `scripts`.
The Git checkpoint includes the previously uncommitted Stage 4/5 frontend alongside Stage 6;
local runtime artifacts, screenshots, credentials, dependencies and database files are ignored.
