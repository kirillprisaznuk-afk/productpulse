from datetime import date, timedelta
from types import SimpleNamespace as N

import pytest

from app.analytics.contracts import Comparison, RetentionCell, RetentionCohort
from app.analytics.insights import (
    changes,
    funnel_group,
    funnel_segments,
    retention_findings,
    segment_findings,
)


def comparison(current, previous):
    return Comparison(
        current=current,
        previous=previous,
        absolute_change=current - previous,
        relative_change=(current - previous) / previous if previous else None,
        direction="down" if current < previous else "up",
    )


def test_material_changes_and_explicit_units():
    result = changes(
        {
            "activation_rate": comparison(0.50, 0.53),
            "mrr": comparison(90, 100),
            "mau": comparison(101, 100),
        }
    )
    assert len(result) == 2
    assert result[0].severity == "warning"
    assert "3.0 pp" in result[0].message
    assert result[0].evidence["change"] == pytest.approx(-0.03)
    assert "10.0 % relative" in result[1].message


@pytest.mark.parametrize("delta,trigger", [(0.0199, False), (0.02, True), (-0.02, True)])
def test_materiality_boundary(delta, trigger):
    assert bool(changes({"activation_rate": comparison(0.5 + delta, 0.5)})) is trigger


def test_null_zero_and_small_changes():
    null = Comparison(
        current=None,
        previous=None,
        absolute_change=None,
        relative_change=None,
        direction="unavailable",
    )
    assert changes({"activation_rate": null, "mrr": comparison(100, 0)}) == []
    assert changes({"activation_rate": comparison(0, 0.1)})[0].evidence["current"] == 0
    assert changes({"activation_rate": comparison(0.5003, 0.5)}) == []


def group(segment="all", n=1000, paid=200):
    return N(
        segment=segment,
        stages=[
            N(
                event_name="landing_view",
                users=n,
                drop_off_count=None,
                drop_off_rate=None,
                median_seconds_from_previous=None,
                cumulative_conversion=1,
            ),
            N(
                event_name="signup_completed",
                users=800,
                drop_off_count=n - 800,
                drop_off_rate=(n - 800) / n,
                median_seconds_from_previous=300,
                cumulative_conversion=800 / n,
            ),
            N(
                event_name="subscription_started",
                users=paid,
                drop_off_count=800 - paid,
                drop_off_rate=(800 - paid) / 800,
                median_seconds_from_previous=86400,
                cumulative_conversion=paid / n,
            ),
        ],
    )


def test_largest_drop_and_slowest_transition_are_evidence_backed():
    result = funnel_group(group())
    assert len(result) == 3
    assert result[0].metric == "subscription_started"
    assert result[0].evidence["value"] == 600
    assert result[1].evidence["value"] == 0.75
    assert result[2].evidence["median_seconds"] == 86400
    assert funnel_group(N(stages=[], segment="all")) == []


def test_funnel_segment_materiality():
    assert funnel_segments([group("organic"), group("referral", paid=210)]) == []
    result = funnel_segments([group("organic"), group("referral", paid=300)])
    assert result[0].evidence["gap"] == pytest.approx(0.1)


def segment(key, n, activated):
    return N(
        segment=key,
        activation=N(
            completed_signups=n,
            eligible_users=n,
            activated_users=activated,
            activation_rate=activated / n,
        ),
    )


def test_segment_quality_uses_weighted_denominator_and_volume():
    result = segment_findings([segment("paid_social", 800, 320), segment("referral", 200, 160)])
    assert [r.severity for r in result] == ["warning", "opportunity"]
    assert result[0].evidence["overall_rate"] == 0.48
    assert result[1].evidence["signup_share"] == 0.2
    assert segment_findings([]) == []
    assert segment_findings([segment("tiny", 50, 25)]) == []


def cohort(i, rate, segment="all", complete=True, n=500):
    return RetentionCohort(
        segment=segment,
        cohort_start=date(2025, 1, 6) + timedelta(weeks=i),
        cohort_size=n,
        complete_cohort=complete,
        periods=[
            RetentionCell(
                week=4,
                observable=complete,
                active_users=int(n * rate) if complete else None,
                retention_rate=rate if complete else None,
            )
        ],
    )


def test_retention_trend_ignores_censored_and_small_cohorts():
    result = retention_findings(
        [cohort(0, 0.3), cohort(1, 0.28), cohort(2, 0.25), cohort(3, 0, complete=False)]
    )
    trend = next(r for r in result if r.rule == "retention.trend")
    assert trend.evidence["change"] == pytest.approx(-0.05)
    assert trend.evidence["last_cohort"] == "2025-01-20"
    assert trend.severity == "warning"
    assert len(retention_findings([cohort(0, 0.3, n=10)])) == 0


def test_retention_never_claims_trend_across_gaps_or_reversals():
    for rows in [
        [cohort(0, 0.3), cohort(2, 0.25), cohort(3, 0.2)],
        [cohort(0, 0.3), cohort(1, 0.35), cohort(2, 0.2)],
        [cohort(0, 0.3), cohort(1, 0.31), cohort(2, 0.32)],
    ]:
        assert not any(r.rule == "retention.trend" for r in retention_findings(rows))


def test_retention_same_cohort_segment_comparison():
    result = retention_findings(
        [
            cohort(0, 0.3, "organic"),
            cohort(0, 0.4, "referral"),
            cohort(1, 0.8, "paid_social", complete=False),
        ]
    )
    assert len(result) == 1
    assert result[0].cohort_start == date(2025, 1, 6)
    assert result[0].evidence["gap"] == pytest.approx(0.1)
