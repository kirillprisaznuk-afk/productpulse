# ProductPulse frontend — Stages 4–5

Next.js App Router, React, TypeScript and Tailwind CSS. Overview, Funnels, Retention, Segments,
Experiments and Methodology are fully implemented against the existing FastAPI endpoints.

## Run locally

Use Node.js 24 LTS and pnpm 11. Start the PostgreSQL-backed FastAPI service using the root README.
From this directory:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Set PRODUCTPULSE_API_URL to the running backend, normally http://127.0.0.1:8000.
pnpm dev
```

PowerShell uses `Copy-Item .env.example .env.local`. The existing validation stack uses API port
18081, so set `PRODUCTPULSE_API_URL=http://127.0.0.1:18081` for that stack. Open
http://127.0.0.1:3000. Production verification: `pnpm build`, then `pnpm start`.
Both servers bind to loopback. No secrets or browser-exposed environment variables are needed.

## Quality checks

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

`pnpm format` applies Prettier. Tests use Vitest, Testing Library and isolated fixtures. They cover
formatting, nulls, comparisons, date validation, generated response validation, API failures,
Overview, activity-series selection, Funnels, segment selection and empty/error states.
Backend regressions remain the separate PostgreSQL pytest suite documented at repository root.

## Architecture and contracts

- `app/`: server-rendered routes, shell and loading/error boundaries.
- `features/`: Overview composition, SVG activity chart and funnel presentation.
- `components/`: shared navigation, date filters, KPI presentation and states.
- `lib/api.ts`: server-only HTTP client, 20-second timeout, no-store fetches and safe errors.
- `lib/context.ts`: supported UTC observation window, inclusive UI dates to exclusive API dates.
- `lib/format.ts`: presentation-only counts, rates, percentage points, USD, dates and durations.
- `types/`: generated FastAPI contracts and source OpenAPI snapshot. Ajv validates responses
  against that same snapshot on the server; the schema is not bundled into browser code.

Regenerate contracts after an intentional backend contract change, with the API running:

```sh
PRODUCTPULSE_API_URL=http://127.0.0.1:8000 pnpm generate:api
# PowerShell: $env:PRODUCTPULSE_API_URL='http://127.0.0.1:8000'; pnpm generate:api
```

Review the generated diff and rerun typecheck/tests. TypeScript is pinned to 5.9.3 because the
OpenAPI generator uses its compiler API; dependency versions and the lockfile are committed inputs.
Reference setup: [Next.js server components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
and [Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

The browser requests Next.js pages; only the Next.js server calls FastAPI. This avoids browser CORS
and keeps the API URL server-side without another proxy layer. Independent page data requests run
concurrently. Client components are limited to navigation, chart controls, funnel segment selection
and the error boundary. There is no global state package.

Filters persist in `start`, `end` and `dimension` URL parameters. Presets end on 30 June 2025,
the dataset's final observed day, not today. Changing dates or dimension requests fresh backend
aggregates. Selecting a returned segment only chooses which already-aggregated funnel to display.
The UI computes no eligibility, progression, retention, revenue or inference; it only formats,
orders and highlights returned values. Largest drop-offs select the maximum returned count/rate.

## Interpretation and accessibility

Overview activity is the period-end snapshot. Rate comparisons show percentage points; counts
and currency show relative percentage changes. A dash means unavailable, never zero. In June,
paid conversion is unavailable because no signup accounts have 30 fully observed days. Activation
reports excluded recent signups. Funnel follow-up ends at the observation cutoff and is explicitly
different from mature seven-day activation.

Native labels, semantic tables/captions, visible keyboard focus, skip navigation and reduced-motion
support are provided. The activity chart has an expandable exact-value table. Signs and text carry
comparison meaning without depending on color. Narrow screens wrap the shell/filters and scroll
wide tables locally. Stage 4 is desktop-first; no advanced mobile interaction is claimed.

## Stage 4 acceptance record

Validated on 5 October 2026 against the existing PostgreSQL-backed API on port 18081,
using a production Next.js build on port 3000. No dataset regeneration or backend changes.

- 25 frontend tests passed; ESLint, Prettier, TypeScript and production build passed.
- 124 backend regression tests passed, with 99% overall coverage. Ruff lint and format passed.
- All six persisted dataset fingerprints matched the Stage 1 baseline.
- Live Overview values matched FastAPI across June, the last 90 days and 1 January.
  June activation was 52.6%; paid conversion was correctly unavailable. January MAU was
  correctly unavailable rather than zero.
- All four funnel dimensions matched the live API. The full-window journey was
  16,000 → 16,000 → 15,029 → 8,853 → 8,838 → 834. Country selection and reload persistence passed.
- Stopping the API produced useful error states without fabricated metrics on both pages;
  restarting it restored results through retry. Invalid date ranges also showed an error.
- Browser review covered Overview, Funnels, Methodology, loading, unavailable and API-error
  states at 1440 × 1000, plus responsive layout at 390 × 844. No page-wide horizontal overflow.
  Keyboard focus was visible and the final production browser reported no console errors.
- Browser review found and fixed SVG-title hydration and stale preset date-field issues.
  The preset fix has a regression test and was rechecked in the final production build.

Reproduce the HTTP smoke checks while both services are running:

```sh
node scripts/smoke.mjs
# PowerShell, when using the validation stack:
# $env:PRODUCTPULSE_API_URL='http://127.0.0.1:18081'; node scripts/smoke.mjs
```

The script compares rendered values with live API responses; it does not use fixtures.
With the local API intentionally stopped, `node scripts/smoke.mjs --expect-unavailable`
checks error rendering. Restore the API immediately afterward. Browser interaction and visual
review are manual acceptance checks, not an automated end-to-end browser suite.

The temporary Stage 4 placeholders have been replaced in Stage 5, as recorded below.

## Stage 5 interfaces and acceptance

Completed 6 October 2026. The Stage 4 visual system, Overview and Funnels are preserved.
No backend code or synthetic dataset was changed. Stage 6 and portfolio packaging have not begun.

- Retention uses all weekly cells returned by `/api/analytics/retention` (requested through
  week 26), with text plus a muted heatmap. Partial signup cohorts and future weeks remain
  unavailable. Summary values select the latest observable individual Week 1/4 cohorts;
  they are not averages. Curves compare selected segments within one chosen signup cohort.
- Segments supports the four contract dimensions. Sortable columns show signups, activation,
  account paid conversion, MRR and ARPU, with mature/censored denominators. Volume and activation
  have separate bar scales. Account stock is not presented as signup-cohort revenue.
- Experiments list assignment counts and backend decisions; `?experiment=ID` selects details.
  The backend's fixed experiment windows apply, independently of generic dashboard filters.
  Variant counts, censoring, effects, intervals, significance, health, SRM and MDE are displayed.
  Interpretations are shown verbatim. Sample planning uses a server action calling the existing
  `/api/experiments/power` endpoint; percent-to-fraction conversion is input formatting only.
- Date range and dimension stay in URLs for Retention and Segments. Matrix segment, comparison
  cohort, curve visibility and table sort are local presentation state and reset on date changes.
- OpenAPI types and runtime schema were regenerated from the live API; no handwritten contract
  patches or backend changes were required.

Validation:

- 41 frontend tests passed. Coverage includes matrices, null cells, comparison controls, sorting,
  dimensions, experiment selection, variants, interval states, significance, SRM warnings,
  insufficient data and absolute/relative sample planning. Fixtures are isolated API snapshots;
  production components never import them.
- 124 PostgreSQL backend tests passed, with 99% overall coverage. One existing dependency
  deprecation warning remains. Ruff passes with `--config backend/pyproject.toml`.
- ESLint, Prettier, TypeScript and the Next.js production build passed.
- Live smoke verifies all six routes, all four retention/segment dimensions, every rendered
  matrix cell, activation-denominator consistency and MRR agreement with Overview.
- Experiment 1: +4.9062 pp, p = 0.0000125886, 95% CI [+2.7045, +7.1016] pp; 7,812 mature users.
- Experiment 2: +2.3547 pp, p = 0.0389820, 95% CI [+0.1192, +4.5869] pp; 7,666 mature users
  and 522 censored. Both backend states are `POSITIVE_SIGNIFICANT`. Experiment 2 also correctly
  reports an incomplete horizon and inference invalid for a decision; no automatic rollout.
- Browser sample planning: 40% baseline, +3 pp, alpha 0.05, power 80% returned 4,234 per arm /
  8,468 total. Relative 10% returned 2,389 per arm / 4,778 total, matching the actual API.
- The real API was stopped briefly: all five data pages rendered errors without fabricated
  values. API was restored. Missing experiment IDs, censoring and empty component states passed.
- All six pages were visually reviewed at desktop/laptop widths (1440 and 1280 pixels).
  Native controls, sorting, dates, dimensions, experiment selection and planning were exercised.
  No browser console errors or page-wide horizontal overflow were observed. Wide tables scroll
  locally. Browser review is manual; the HTTP smoke script is repeatable.
- All six persisted table fingerprints match the Stage 1 baseline. One smoke attempt encountered
  a transient unavailable retention response during concurrent local checks; a targeted retry
  and the complete subsequent smoke run passed without relaxing assertions or changing data.

Limits: no pooled retention curves because the API returns cohort-level cells only; no synthetic
aggregate retention added in React. All analytical decisions remain backend-owned. SRM warning,
negative/no-difference and insufficient-data renderings use tests, since the two default live
experiments do not exhibit those states. Fixed-window, equal-allocation, independent-user and
fixed-horizon statistical assumptions remain visible. Authentication, imports, AI and deployment
are out of scope.

## Stage 6 completion

Deterministic backend insights, transparent Evidence disclosures, saved local URL selections,
route-correct filter resets, stable streamed loading and experiment decision limitations are
implemented. The experiment workspace now uses one HTTP request and two aggregate SQL queries.
Generated contracts match the live API. Stage 5 local-state notes above describe that historical
checkpoint; Stage 6 additionally persists the funnel/matrix segment and comparison cohort.

Current acceptance: 47 frontend tests, 136 PostgreSQL backend tests (99% coverage), lint/format,
typecheck, production build, six-route real-backend smoke, API outage/recovery and desktop/laptop
visual review passed. Dataset fingerprints are unchanged. See
[Stage 6 rules and validation](../docs/DECISION_INSIGHTS.md) for thresholds, timings and limits.
Stage 7 has not begun.
