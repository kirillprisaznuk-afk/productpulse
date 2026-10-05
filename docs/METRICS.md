# Implemented metric contracts — Stage 2

Dates and timestamps use UTC. Request intervals are half-open `[start_date, end_date)`; for all of
June, request `2025-06-01` through `2025-07-01`. `as_of` is the exclusive observation cutoff for
outcomes, defaulting to **2025-07-01**. The supported warehouse observation window is
`[2025-01-01, 2025-07-01)`, taken from the fixed Stage 1 dataset contract, not the last event.
Custom observation windows require an explicit contract change; the generator is unchanged.

## Activity and signup

The centralized qualifying event set is `ACTIVE_EVENTS = ("core_action",)` in
`app/analytics/contracts.py`. Lifecycle events do not count as activity. For daily point D:

- DAU: distinct qualifying users in `[D, D + 1 day)`.
- WAU: distinct qualifying users in `[D - 6 days, D + 1 day)`.
- MAU: distinct qualifying users in `[D - 29 days, D + 1 day)`.
- Stickiness: DAU/MAU and WAU/MAU at the **same daily point**. Zero MAU yields null.

Overview activity is the last daily point before `end_date`, not a sum or average of daily counts.
Daily series include zero-activity dates. Windows extending before known observation or beyond
`as_of` return null, not zero. WAU/MAU are rolling windows, not calendar-week/month totals.

`total_signups` counts distinct users whose **first signup_started** is inside the period.
`completed_signups` counts distinct users whose **first signup_completed** is inside it. Signup
completion rate uses period starters as denominator and those same users completing after starting
and before period end as numerator. These two signup counts can differ at period boundaries.
All generated users complete signup, so this is not an anonymous acquisition funnel.

## Activation

Origin is first completed signup. Eligible users have origin in the requested interval and
`origin + 7 days <= as_of`. Activated users' first qualifying core action must be in
`[origin, origin + 7 days)`. An action exactly seven days later does **not** activate the user.
Recent users are excluded even if they already acted; eligibility never depends on the outcome.
The response includes eligible/censored counts and median seconds among eligible activated users.
Weekly activation cohorts use UTC Monday signup weeks. Segment dimensions describe the user.
Activation does not require a specific onboarding path; that is the funnel's separate contract.

## Funnel

The default ordered path is landing → completed signup → onboarding start → onboarding complete
→ first valid core action → subscription start. Users enter with their first landing in the selected
period. Subsequent steps may occur after period end but must be before `as_of`. Each step uses the
first occurrence **strictly after** its predecessor; duplicates never multiply users. A later valid
occurrence can recover from an earlier out-of-order event. Missing a predecessor prevents progress.

For stage i, conversion is `n_i / n_(i-1)`, cumulative conversion `n_i / n_0`, and drop-off
`n_(i-1) - n_i`. The first stage's previous conversion/drop-off fields are null; zero denominators
produce null. Median durations condition on users reaching the relevant stages. Core-action duration
is not limited to the seven-day activation definition. Paid stage counts initiating users, not all
members benefiting from an account contract. Observed funnels are cutoff-limited; recent entrants
have less follow-up. Do not interpret these rates as mature seven/30-day conversion probabilities.
An incompletely observed entry interval returns no groups and `fully_observed=false`.

## Retention

Conventional **N-week retention**, not rolling retention. Cohorts are users with completed signup
in each UTC Monday–Sunday calendar week within the selected signup interval. Week N is that
calendar week shifted by N weeks. Count distinct cohort users performing core_action in that week
and after signup, divided by the **original cohort size**, including never-active users.
Week 0 is actual signup-week activity, not forced to 100%.

A cell is observable only when its entire activity week ends by `as_of` and its signup cohort week
is fully covered by both the selected interval and the warehouse observation window. Partial first
or last signup weeks are labeled `complete_cohort=false`; all their cells are null. Future activity
weeks are null with `observable=false`. This conservative rule avoids silently comparing partial
cohorts. Cohort sizes still report observed selected members.

## Account monetization

Paid conversion is **account-level**: origin is the earliest member's completed signup, breaking
timestamp ties by user ID. Eligible accounts have origins in the selected interval and 30 complete
observed days. Count first contracts starting in `[origin, origin + 30 days)`, even if subsequently
cancelled. No eligible accounts means null conversion rate. Revenue segmentation attributes each
account once to that earliest member's channel/country/device; company size belongs to the account.
An account without members is grouped as `unknown` for member-derived dimensions.

Snapshots are evaluated immediately **before** exclusive `end_date`. A contract is active if
`started_at < end_date` and cancellation is null or `cancelled_at >= end_date`. Events exactly at
the boundary belong to the next period. This implements the Stage 1 instant-state definition at
the left limit of the boundary.

| Metric | Definition |
| --- | --- |
| active_subscriptions | Paid accounts active at ending snapshot |
| paid_users | Members signed up by ending snapshot in those accounts; not the conversion numerator |
| MRR | Sum monthly values of active contracts, USD |
| ARPU | MRR / all accounts created before ending snapshot, including free accounts |
| new_mrr | Monthly values of contracts starting inside the period |
| churned_mrr | Monthly values of all contracts cancelled inside the period |
| churned_subscriptions | All contracts cancelled inside the period |
| opening_subscriptions | Contracts active immediately before period start |
| churned_opening_subscriptions | Opening contracts cancelled inside the period |
| churn_rate | Churned opening contracts / opening contracts; null for an empty opening stock |

New-and-cancelled-in-period contracts contribute to churned count/MRR but not opening-stock churn
rate. Cancellation at start belongs to this period and its opening stock; cancellation at end belongs
to the next. This prevents mixing a flow numerator with an incompatible stock denominator.
Free accounts have no active contract; reactivation, upgrades, invoices and multiple currencies are
not modeled. MRR arithmetic remains PostgreSQL numeric; JSON values are numeric with no early rounding.

## Comparisons and unavailable results

Previous period ends at current start and has exactly the same day count. Both use the same `as_of`
so cohort eligibility has one observation cutoff. Absolute change is current minus previous; relative
change is that difference / previous (a fraction, not percentage points). A zero prior value yields
null relative change. Any unavailable operand yields null changes and direction `unavailable`.
Direction `up/down/flat` describes arithmetic, not whether a change is desirable.

Overview signup and monetization values are null when their requested period is not fully observed.
Activity snapshot availability is determined by its own lookback. Activation groups report observed
signup members and explicit mature/censored counts, with period completeness metadata; retention
uses cell-level availability. An observed empty population has zero counts and null undefined rates.
Comparing mature subsets may still involve different cohort mixes; counts expose that limitation.

Stage 3 experiment inference uses the declared `activation_within_7_days` metric. Assignment occurs
at completed signup in the Stage 1 contract. Among valid assignments with seven fully observed days,
conversion requires first core action strictly after assignment and strictly before signup + seven
days. Immature assignments are censored even when an early success is visible. Invalid chronology
is reported and suppresses primary inference. Assignment variants never change with later behavior.
See [EXPERIMENTATION.md](EXPERIMENTATION.md) for inference and decision rules. Stage 1 data and
Stage 2 analytics definitions remain unchanged.
