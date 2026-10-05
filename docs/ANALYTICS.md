# Product analytics engine — Stage 2

## Architecture and API

`app/analytics/` contains inspectable PostgreSQL queries and small response-shaping functions.
`common.py` supplies the shared first-event CTE and enum-controlled dimension expressions.
Activity, activation, funnels, retention and monetization keep their own business SQL. Overview
composes bounded aggregate queries; comparisons operate on scalar results. No pandas or raw-event
Python aggregation is used. `app/api/analytics.py` only validates requests and delegates.

Each HTTP request uses one read-only, repeatable-read transaction in UTC, so its multiple queries
cannot see inconsistent snapshots during a reseed. Queries have a 15-second statement timeout.
Requests span at most 366 days; retention is capped at Week 26. These are local-demo bounds, not
a general OLAP engine. Values are bound parameters; only controlled enum members become SQL identifiers.

| GET endpoint | Output |
| --- | --- |
| `/api/analytics/overview` | Activity, signup, activation, paid conversion, MRR, churn and comparisons |
| `/api/analytics/activity` | Zero-filled daily DAU/WAU/MAU series, stickiness and snapshot comparisons |
| `/api/analytics/activation` | Eligible/censored/activated counts, rate, median duration; weekly cohorts |
| `/api/analytics/funnel` | Ordered stage counts, conversions, drop-offs and median durations |
| `/api/analytics/retention` | Signup-week cohorts and nullable Week N retention cells |
| `/api/analytics/segments` | User activation and account monetization grouped by one dimension |
| `/api/analytics/monetization` | Account conversion, paid members, subscription stocks/flows and comparisons |

Common parameters: `start_date`, exclusive `end_date`, exclusive `as_of`, optional `dimension` and
`segment_value`; retention also uses `max_weeks`. Defaults: June 2025, cutoff July 1, 12 retention
weeks. Dimensions: `acquisition_channel`, `company_size`, `country`, `device_type`. Grouped endpoints
use the dimension for grouping; scalar/overview/activity endpoints use it only when a segment value
is provided. `/segments` defaults to acquisition channel. Retention comparisons use `/retention`
with a dimension. Invalid dates, enum values, segment values and excessive ranges return HTTP 422.
OpenAPI documents response types. Examples:

```text
/api/analytics/overview?start_date=2025-06-01&end_date=2025-07-01
/api/analytics/activation?start_date=2025-01-01&end_date=2025-07-01&dimension=acquisition_channel
/api/analytics/funnel?dimension=company_size
/api/analytics/retention?start_date=2025-01-06&end_date=2025-06-30&dimension=acquisition_channel&max_weeks=12
/api/analytics/activity?dimension=country&segment_value=Spain
```

See [METRICS.md](METRICS.md) for exact definitions, denominator choices, attribution, chronology,
cutoff rules, and equal-duration previous periods. Cohort activation and conversion use `as_of`
follow-up, whereas stock/flow financial metrics use the reporting period's boundaries. These are
different questions and are deliberately labeled separately.

## Independent worked example

`backend/tests/analytics_fixture.py` inserts ten users, each initially in one account. It is separate
from the synthetic generator. Users 1–8 arrive January 6; user 9 January 28; user 10 January 31.
User 8 has no completed-signup event. These adversarial fixtures intentionally include incomplete
and out-of-order event histories that the valid Stage 1 generator never creates.

| User | Behavior |
| --- | --- |
| 1 | Entire funnel, core action after 3 hours; pays Jan 8, cancels Jan 20; repeats activity Jan 13/20 |
| 2 | Entire funnel, first action Jan 14 (8 days late); pays Jan 20, cancels Feb 10 |
| 3 | Completes onboarding but never acts |
| 4 | Completes onboarding, acts Jan 8 and Jan 22, never pays |
| 5 | Starts onboarding but never completes it |
| 6 | Onboarding completion occurs before start; acts after 3 hours, but fails ordered funnel |
| 7 | Completes signup only |
| 8 | Lands and starts signup only |
| 9 | Completes onboarding and acts Jan 29; recent at Feb 1 cutoff |
| 10 | Completes signup only; recent at Feb 1 cutoff |

Duplicate signup and core-action records for user 1 must not change counts. As of **Feb 1**, for
January entrants: 9 completed signups, 7 eligible activation users, 2 censored; users 1/4/6 activate,
so activation is **3/7**. Median activation time is **3 hours**. Activation checks behavior timing,
not onboarding chronology, so user 6 activates but cannot progress in the ordered funnel.

Funnel counts are **10 → 9 → 7 → 5 → 4 → 2**. Cumulative paid-stage conversion is **2/10** and
core-to-paid conversion **2/4**. The Jan 6 signup cohort contains 7 users; Week 0/1/2 active counts
are **3/2/2**, so Week 1 retention is **2/7**. Week 3 ends after cutoff and is null, not zero.

For paid conversion, use **Mar 1** cutoff to observe thirty days: 8 eligible accounts, 1 censored
(Jan 31 origin), and 2 conversions, hence **2/8 = 25%**. At January's closing snapshot, one $59
contract remains active; MRR is **$59**, ARPU **$5.90** across ten accounts. January new MRR is
$88 and churned MRR $29, but opening stock is zero, so January churn rate is null. February opens
with one contract and loses it: **1/1 = 100%** opening-stock churn. Automated tests assert these
answers, exclusive 7/30-day boundaries, filter behavior, account attribution, and no cutoff leakage.

## Reproduce validation

Use the existing Docker/local setup from the README. Keep the default warehouse intact and point
tests at a separate database ending in `_test` as documented there. From `backend`:

```sh
pytest --cov=app --cov-report=term-missing
ruff check . ../scripts
ruff format --check . ../scripts
alembic check
python ../scripts/verify_analytics.py --explain
```

The verification script returns only database aggregates, timings and optional execution plans.
It reports June overview/activity and all-history activation/funnel/retention/segments. SQL plans
and timings depend on host load and cache warmth. No experiment statistics or frontend is implemented.

## Full-dataset validation — 2026-10-04

The existing seed-42 warehouse was preserved: 16,000 users, 185,249 events, 4,578 accounts,
834 contracts and 16,000 experiment assignments. The following are actual PostgreSQL results.
Percentages below are rounded only for this report; API values are not rounded.

| June reporting metric (cutoff July 1) | Result |
| --- | ---: |
| June 30 DAU / trailing WAU / trailing MAU | 455 / 2,347 / 4,325 |
| DAU/MAU; WAU/MAU | 10.5202%; 54.2659% |
| Started / completed signups | 2,668 / 2,668 |
| Activation among 2,146 mature June signups | 52.5629% |
| June signup-account paid conversion | null: all 749 accounts are censored |
| Active contracts / paid members | 707 / 2,961 |
| Closing MRR / ARPU | $110,293 / $24.09196 |
| New / churned MRR | $22,942 / $5,533 |
| Opening-stock churn | 37 / 596 = 6.2081% |

The equal-duration previous period is May 2–June 1. Previous ending DAU/WAU/MAU were
448/2,100/3,969; previous closing MRR $92,884. MRR increased $17,409 (18.7427%).

Across all signup history, activation is **8,402 / 15,478 = 54.2835%**, with 522 censored users.
Thirty-day account conversion is **734 / 3,829 = 19.1695%**, with 749 censored accounts.
All-history ordered funnel counts are **16,000 → 16,000 → 15,029 → 8,853 → 8,838 → 834**.
This final funnel count is paid initiating users; it is not the paid-account conversion denominator.

| Signup cohort | Size | Week 0 active | Week 1 active | Week 2 active | Week 4 active |
| --- | ---: | ---: | ---: | ---: | ---: |
| Jan 6 | 683 | 303 | 263 | 201 | 159 |
| Jan 13 | 585 | 257 | 227 | 154 | 138 |
| Jan 20 | 468 | 201 | 157 | 131 | 119 |

| User acquisition channel | Mature activation |
| --- | ---: |
| Organic | 60.5909% |
| Paid search | 53.1073% |
| Paid social | 43.1877% |
| Referral | 66.6299% |
| Partner | 59.9206% |

For the Jan 6 cohort, Week 4 retention was 22.8723% Organic, 17.5879% Paid Social, and 37.6344%
Referral. Enterprise activation was 49.6117%, below SMB's 55.7671%, while enterprise thirty-day
account conversion was 31.6498% versus SMB's 18.3740%. These align with the encoded slower
enterprise onboarding and channel activity patterns. Account revenue attribution to the first
member is a different grain; not every channel revenue ranking should mirror user activation.
No data or calculations were adjusted to force these patterns.

All seven analytics endpoints returned HTTP 200 from Docker PostgreSQL; all four segment dimensions
and invalid-parameter 422 responses were checked. Existing health and demo summary still passed.
The final Linux container suite reported **75 passed, no skips, 99% total statement coverage**;
analytics modules/routes had 100% statement coverage. Ruff lint/format passed across 40 Python files.
Alembic remained at `8831dde5f821` with no schema drift. One existing upstream TestClient deprecation
warning remains. Statement coverage complements the hand-calculated SQL assertions; it does not
alone prove analytical correctness.

Measured live default endpoints took approximately 0.16–1.16 seconds on this host. All-history
funnel/retention aggregate calls took about 0.88/0.63 seconds. Selective `EXPLAIN (ANALYZE, BUFFERS)`
showed approximately 0.88 s for a 30-day activity series, 0.98 s for the full-history funnel,
0.79 s for full-history retention and 0.10 s for monetization. The event-name/time index narrows
activity; user/time index scans serve ordered funnel lookups; sequential scans/hash aggregation
are appropriate for broad first-event/cohort summaries. No speculative index or migration was added.
Plans contain JIT overhead and are sensitive to cache/load; these are measurements, not an SLA.

Remaining methodological limits: fixed observation window, observed follow-up funnels, conservative
partial-week retention masking, account-origin revenue attribution, and no upgrades/reactivations.
These are explicit contracts rather than missing Stage 2 features. **Ready for Stage 3: YES.**
No experiment inference or frontend work has begun.
