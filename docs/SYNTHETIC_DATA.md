# Synthetic data assumptions

Default: seed 42, 16,000 users, observation window `[2025-01-01, 2025-07-01)` UTC.
The dates do not depend on today's date. `random.Random(seed)` and SHA-256 variant assignment
avoid global RNG state and Python's salted hash. Reproducibility applies to the same code version,
configuration and pinned Python/dependencies; retain these when comparing snapshots.

Accounts arrive approximately uniformly across the window. Company-size weights are 22/48/22/8
for solo/SMB/mid-market/enterprise, with 1/3/5/9 observed members respectively. Final account size
may be truncated to meet the requested user count. Colleagues join within 36 hours. Country
weights are UK 30%, Germany 25%, Spain 16%, France 18%, Netherlands 11%.

Channel weights: organic 27%, paid search 23%, paid social 30%, referral 12%, partner 8%.
94% attempt onboarding. Conditional progression probabilities are .65/.57/.46/.70/.64 respectively;
mobile subtracts .04. Enterprise lognormal onboarding delays have log-mean .6 versus -.6 for other
segments, both log-SD .9. Completion and the subsequent action may be censored by the cutoff.
These are fictional modeling inputs, not claims about real benchmarks.

Recurring sessions use heterogeneous mean cadences of 3–11 days, exponentially sampled gaps plus
half a day, and 1–3 actions per session. Session continuation probabilities follow channel quality
(.88/.84/.78/.91/.88); 16% of active users are durable through the observation window. This creates
both natural attrition and long-lived activity. Onboarding and visit behavior are probabilistic.

Accounts with an observed active member convert with probability .16/.22/.28/.35 by size, after
1–14 days; contracts beyond cutoff are censored. Monthly values are $29/$59/$199/$499. Solo/SMB
use pro; larger segments use business. 25% draw a cancellation 14–100 days after start, emitted
only if observed. Thus observed churn is lower than the latent probability.

Experiment 1 (guided onboarding) enrolls in the first half of the window; treatment adds .055
to conditional onboarding progression probability. Its seven-day activation effect is consequently
smaller and varies with delay/censoring. Experiment 2 (checklist copy) enrolls in the second half
and adds zero effect. Assignment is approximately 50/50, keyed by seed/experiment/user at signup,
before onboarding or actions. No concurrent exposure, outcome-based assignment, or forced sample
balancing. No experiment statistics are calculated in Stage 1.

Known simplifications: all registered users complete signup; no anonymous traffic, seasonal growth,
account moves, historical dimension changes, subscription upgrades/reactivation or international
currencies. Country and device are synthetic labels. This is an analytical playground, not a calibrated
business simulation. Sanity counts are data-quality checks, not an analytics engine.
