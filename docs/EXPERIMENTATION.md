# Experimentation engine — Stage 3

## Scope and architecture

One declared binary primary metric per experiment: `activation_within_7_days`. PostgreSQL constructs
the population and returns two aggregate variant rows. Pure Python functions perform inference;
the service assembles typed Pydantic responses and deterministic interpretation. There is no LLM,
frontend, segment significance search, observed-power calculation, new migration or runtime dependency.

`queries.py` owns aggregation, `statistics.py` inference/SRM, `power.py` planning, `contracts.py`
validation and `service.py` decision rules. Listing is one grouped query; detail uses one metadata
query and one population query, without per-variant database round trips. Read-only repeatable-read
transactions use UTC and a 15-second statement timeout. Existing event indexes support the query.

## Population, chronology and censoring

Assignments before the exclusive `as_of` UTC midnight define the assigned population. The default
is 2025-07-01, the fixed observation end; dates outside 2025-01-01 through 2025-07-01 are rejected.
Users remain in their assigned control/treatment group regardless of later behavior, an
intention-to-treat style analysis restricted to fully observed follow-up.

Stage 1 assigns at completed signup. Valid records require first `signup_completed`, user signup
and assignment timestamps to agree, and assignment inside the experiment's half-open enrollment
window and observed date range. First core action must occur strictly after assignment and strictly
before signup + seven days. An outcome exactly at seven days is excluded; a valid outcome after
enrollment ends can still count within that user's follow-up. Pre-assignment or simultaneous core
actions are invalid chronology, not successes. Missing signup and invalid assignment timing are
reported separately; overlapping diagnostics need not sum to invalid records.

A user is mature when assignment + seven days <= cutoff. All other valid users are censored,
including those with already visible early successes. Thus no recent user is selectively included
because they succeeded or treated as a failure merely because follow-up is incomplete.
`assigned = valid + invalid`; `valid = mature + censored`. Rates use mature valid denominators.
Invalid records remain visible in diagnostics; their descriptive exclusion suppresses formal primary
inference, preventing a silently selected subset from supporting a decision.

`horizon_fully_observed` requires enrollment end + seven days <= cutoff. A mature subset can have
nominal statistics before then, but `inference.valid_for_decision` is false and the next action is
to collect mature data. The frozen dataset cannot supply additional follow-up for Experiment 2;
this limitation is reported rather than changing the dataset.

## Statistical methods

Let control be successes x0 among n0 mature users, treatment x1 among n1, rates p0=x0/n0 and
p1=x1/n1. Absolute uplift d=p1-p0; relative uplift=d/p0, null when p0=0. API rates are fractions;
multiply absolute differences by 100 for percentage points. Calculations do not round internally.

The two-sided pooled two-proportion z-test tests H0:p1=p0 against H1:p1!=p0:

```
p = (x0+x1)/(n0+n1)
SE0 = sqrt(p*(1-p)*(1/n0+1/n1))
z = (p1-p0)/SE0
p_value = erfc(abs(z)/sqrt(2))
significant = p_value < alpha
```

Alpha defaults to .05 and supports .01, .05 or .1. Both arms must have at least ten expected
pooled successes AND failures. Otherwise z, p-value and significance are null, with an explicit
insufficient-data reason. Empty arms and all-zero/all-one outcomes never produce false certainty.
The test remains two-sided for negative and positive observed effects.

The absolute-difference interval uses **Newcombe hybrid Wilson without continuity correction**,
at confidence 1-alpha. For each arm, with zc=normal quantile(1-alpha/2), the Wilson bounds are:

```
center = (pi + zc²/(2*ni))/(1+zc²/ni)
half = zc*sqrt(pi*(1-pi)/ni + zc²/(4*ni²))/(1+zc²/ni)
Li = center-half; Ui = center+half
lower = d-sqrt((p1-L1)²+(U0-p0)²)
upper = d+sqrt((U1-p1)²+(p0-L0)²)
```

The response includes lower, point estimate and upper. This interval is available for nonempty
arms even when the normal-test gate fails, but invalid experiment data suppresses it. The interval
and pooled test are different procedures, so their boundary conclusions need not exactly coincide.

SRM uses **all assigned** counts, not mature counts, against nominal 50/50 allocation. Pearson
chi-square=sum((observed-expected)²/expected), one degree of freedom; its survival probability is
`erfc(sqrt(chi_square/2))`. Warning threshold is p<.01. With fewer than ten total assignments,
expected cells are too small, and p/warning are null. SRM is a warning to investigate, not proof of
a bug; it blocks decision validity without erasing nominal descriptive statistics.

## Power, sample size and MDE

Planning assumes independent Bernoulli users, equal allocation, a fixed horizon, positive target
effect delta, baseline p0 strictly between zero and one and p1=p0+delta<=1. Default power=.80,
allowed >.50 through .99. With pbar=(p0+p1)/2:

```
n = [z_(1-alpha/2)*sqrt(2*pbar*(1-pbar))
     + z_power*sqrt(p0*(1-p0)+p1*(1-p1))]² / delta²
required_sample_per_variant = ceil(n)
required_total_sample = 2*ceil(n)
```

This is an approximate two-sided normal planning formula; it ignores the far alternative tail,
as does the independent Statsmodels reference. Absolute or relative requested MDE is supported;
relative delta converts to p0*relative_mde. Inputs cannot imply an impossible treatment rate.

Current MDE inverts the same formula with 80 bisection steps over positive effects through 1-p0.
It uses the smaller mature arm as a conservative equal-allocation sample size, and observed control
rate only as a sensitivity baseline. MDE is not the observed effect or post-hoc observed power.
Empty arms, baseline 0/1 or unattainable power within possible effects return null with a reason.
The planning endpoint requires a strict integer sample size from 1 through one billion.

An optional `practical_threshold` is an absolute positive uplift, e.g. .02 means two percentage
points. The service separately reports whether observed uplift meets it and whether both arms
meet its planning requirement. No default business threshold is invented. Exceeding a threshold
by point estimate does not establish that the true effect exceeds it.

## Health, decisions and limitations

Decision priority is invalid data or SRM => `DATA_QUALITY_WARNING`; unavailable normal inference =>
`INSUFFICIENT_DATA`; significant positive/negative effect => `POSITIVE_SIGNIFICANT` /
`NEGATIVE_SIGNIFICANT`; otherwise `NO_SIGNIFICANT_DIFFERENCE`. Health separately distinguishes
healthy, warning and insufficient_data. Incomplete follow-up can retain a nominal significance
state while blocking `valid_for_decision`. Always inspect health and next_action alongside state.

Data warnings request quality review. Incomplete horizons request mature data. Complete positive
results request product-relevance review, negative results potential-harm review, and nonsignificant
results report no rollout evidence. `rollout_recommended` is always false. Statistical significance
alone is not a rollout decision, practical benefit or proof of permanent business impact.

This is fixed-horizon snapshot inference: repeated peeking and stopping on significance do not
preserve nominal false-positive rates. There is no sequential correction. One declared primary
metric is tested per experiment, without joint correction across the two experiments. User-level
independence is assumed; account clustering is not adjusted. Censoring changes the observed cohort
mix. Sparse-data exact tests, negative-effect planning and generalized nonbinary metrics are outside
scope. Synthetic ground truth is useful for investigation, not a substitute for measured evidence.

## API

| Method and path | Contract |
| --- | --- |
| GET `/api/experiments` | Metadata, status, declared metric, dates, variants and assignment counts |
| GET `/api/experiments/{id}/analysis` | metadata, population, variant_results, effect, inference, health, power, decision |
| POST `/api/experiments/power` | baseline_rate, minimum_detectable_effect, effect_mode, alpha, target_power |
| POST `/api/experiments/mde` | baseline_rate, sample_size_per_variant, alpha, target_power |

GET parameters: as_of, alpha, target_power, practical_threshold. Missing experiments return 404;
invalid inputs or unsupported primary metrics return 422. Planning endpoints do not access the DB.

Example power body: `{"baseline_rate":0.1,"minimum_detectable_effect":0.02,"effect_mode":"absolute"}`.
Example MDE body: `{"baseline_rate":0.1,"sample_size_per_variant":1000}`.

## Independent numerical validation

Committed `backend/tests/fixtures/statistical_references.json` is produced by
`scripts/generate_statistical_references.py` in an isolated reference environment using
Statsmodels 0.14.5, SciPy 1.16.2 and NumPy 2.3.3. These are not application dependencies.
Oracle methods: proportions_ztest, confint_proportions_2indep(method="newcomb"),
samplesize_proportions_2indep_onetail, scipy.optimize.brentq and scipy.stats.chisquare.
Tests compare floating results at 1e-12 tolerance (tiny SRM probability uses relative 1e-11).

| Worked case | Independent result |
| --- | --- |
| Control 100/1000; treatment 140/1000 | d=.04, relative=.40, z=2.752409412816, p=.005915851074 |
| Same case, 95% Newcombe interval | [.0115153390714, .0685637491475] |
| Control 20/100; treatment 22/100 | d=.02, p=.728433810951; CI [-.0930876893653, .132548197953] |
| Baseline .10, delta .02, alpha .05, power .80 | raw n=3840.84748243627; 3841/arm; total 7682 |
| Baseline .10, n=1000/arm | MDE=.0407451543118 absolute, .407451543118 relative |
| SRM 900 versus 100 | chi-square=640; p=3.34148803864e-141 |

For the positive case pooled p=.12 and SE=sqrt(.12*.88*.002); .04/SE gives the z above.
Negative mirror, exact equality, zero/all conversions, empty arms, censored early successes,
pre-assignment events and exact follow-up boundaries have deterministic tests.

Method references: [NIST two-proportion test](https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/binotest.htm),
[NIST Wilson interval](https://itl.nist.gov/div898/handbook/prc/section2/prc241.htm),
[Statsmodels interval and planning implementation](https://www.statsmodels.org/stable/_modules/statsmodels/stats/proportion.html).

## Actual full-dataset snapshot

As of 2025-07-01; alpha=.05, power=.80; no configured practical threshold. Percentages below are
display rounding only. C/T means control/treatment; pp means percentage points.

| Result | Experiment 1: Guided onboarding | Experiment 2: Workspace checklist copy |
| --- | --- | --- |
| Assigned C/T | 3844 / 3968 | 4098 / 4090 |
| Mature C/T | 3844 / 3968 | 3838 / 3828 |
| Conversions C/T | 2056 / 2317 | 1972 / 2057 |
| Censored C/T | 0 / 0 | 260 / 262 |
| Invalid | 0 | 0 |
| Rates C/T | 53.48595% / 58.39214% | 51.38093% / 53.73563% |
| Absolute uplift | +4.906185 pp | +2.354705 pp |
| Relative uplift | +9.172848% | +4.582838% |
| 95% absolute CI | [2.704456, 7.101585] pp | [.119169, 4.586901] pp |
| z; two-sided p | 4.367136; .00001258862768 | 2.064377; .03898198697 |
| Significant | yes | yes, nominal snapshot only |
| SRM p; warning | .1606333154; false | .9295508654; false |
| Current absolute MDE | 3.178204 pp | 3.195685 pp |
| Current relative MDE | 5.942129% | 6.219593% |
| Decision state | POSITIVE_SIGNIFICANT | POSITIVE_SIGNIFICANT |
| Health / decision validity | healthy / true | warning / false |
| Next action | review_product_relevance | collect_mature_data |

Experiment 2 has no encoded treatment effect in the unchanged generator, yet this realization
produces nominal p=.039. A second DISTINCT-join SQL construction reproduced both experiments'
mature denominators and conversion counts. Statsmodels independently reproduced full-data z,
p and Newcombe bounds within 1e-12. The generator applies its treatment increment only to
Experiment 1. Thus this is a nominal false-positive realization under the no-effect generator,
subject also to the independence assumptions above; it is not evidence of an engineered benefit.
Its 522 censored users and incomplete enrollment-plus-follow-up horizon additionally block decision
validity. Neither the data nor thresholds were changed to obtain a preferred narrative.

## Reproduction and validation record

Use a separate `_test` database and run from backend:

```sh
pytest --cov=app --cov-report=term-missing -q
alembic check
alembic current
```

From the repository root, with DATABASE_URL pointing at the existing full warehouse:

```sh
python scripts/verify_experiments.py --explain
ruff check --config backend/pyproject.toml backend scripts
ruff format --check --config backend/pyproject.toml backend scripts
```

Validation on 2026-10-05: 124 tests, including Stage 1/2 regressions and PostgreSQL integration;
99% overall statement coverage and 100% for all experiment modules/routes. One existing upstream
Starlette/AnyIO deprecation warning. Alembic head is `8831dde5f821`, with no new operations detected.
The HTTP smoke covers all four endpoints, configurable alpha and threshold, 404/422 responses,
and all seven Stage 2 endpoints. Explicit alpha query parsing has a regression test.

Representative EXPLAIN ANALYZE population execution: Experiment 1 116.851 ms, Experiment 2
125.450 ms. Plans return two rows, use existing `ix_events_user_time` for signup/core-action
lookups and scan/hash the small assignment/user tables. No extra index or migration is warranted.
These are local observations, not a latency guarantee.

After rebuilding, all six SHA-256 table fingerprints matched the Stage 1 baseline. Counts remain
4578 accounts, 16000 users, 185249 events, 834 subscriptions, two experiments and 16000 assignments.
The generator, outcomes and assignments were not changed. Ignored `.runtime/` files retain the
local raw results, query plans, independent audits, HTTP checks and fingerprint snapshots.
