from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, text, update
from sqlalchemy.orm import Session

from app.analytics.activation import activation, signup_summary
from app.analytics.activity import activity
from app.analytics.contracts import AnalyticsQuery, Dimension
from app.analytics.funnels import funnel
from app.analytics.monetization import monetization
from app.analytics.overview import overview
from app.analytics.retention import retention
from app.analytics.segmentation import segments
from app.api.analytics import analytics_session
from app.main import app
from app.models.warehouse import Event, Subscription, User
from tests.analytics_fixture import at, worked_dataset

pytestmark = pytest.mark.integration


@pytest.fixture
def analytical_db(empty_db):
    worked_dataset(empty_db)
    with Session(empty_db) as session:
        yield session


def query(**kwargs):
    return AnalyticsQuery(
        start_date=date(2025, 1, 1), end_date=date(2025, 2, 1), as_of=date(2025, 2, 1), **kwargs
    )


def test_worked_activation_and_signups(analytical_db):
    result = activation(analytical_db, query()).groups[0]
    assert (result.completed_signups, result.eligible_users, result.censored_users) == (9, 7, 2)
    assert result.activated_users == 3
    assert result.activation_rate == pytest.approx(3 / 7)
    assert result.median_activation_seconds == 3 * 3600
    signup = signup_summary(analytical_db, query())
    assert signup["total_signups"] == 10
    assert signup["completed_signups"] == 9
    assert signup["signup_completion_rate"] == 0.9


def test_funnel_order_duplicates_and_duration(analytical_db):
    result = funnel(analytical_db, query()).groups[0]
    assert [s.users for s in result.stages] == [10, 9, 7, 5, 4, 2]
    assert [s.drop_off_count for s in result.stages] == [None, 1, 2, 2, 1, 2]
    assert result.stages[-1].cumulative_conversion == 0.2
    assert result.stages[-1].conversion_from_previous == 0.5
    assert result.stages[0].conversion_from_previous is None
    assert result.median_signup_to_onboarding_seconds == 7200
    assert result.median_signup_to_core_action_seconds == 1.5 * 86400


def test_later_valid_occurrence_recovers_funnel(analytical_db):
    analytical_db.execute(
        insert(Event),
        dict(
            id=999,
            user_id=6,
            session_id="u6-extra",
            event_name="onboarding_completed",
            occurred_at=at("2025-01-06T02:00:00"),
            properties={},
        ),
    )
    result = funnel(analytical_db, query()).groups[0]
    assert [s.users for s in result.stages] == [10, 9, 7, 6, 5, 2]


def test_seven_day_boundary_is_exclusive(analytical_db):
    analytical_db.execute(
        insert(Event),
        dict(
            id=999,
            user_id=3,
            session_id="u3-boundary",
            event_name="core_action",
            occurred_at=at("2025-01-13"),
            properties={},
        ),
    )
    assert activation(analytical_db, query()).groups[0].activated_users == 3


def test_retention_original_denominator_and_censoring(analytical_db):
    result = retention(analytical_db, query(max_weeks=4))
    first = next(c for c in result.cohorts if c.cohort_start == date(2025, 1, 6))
    assert first.cohort_size == 7
    assert [p.active_users for p in first.periods] == [3, 2, 2, None, None]
    assert first.periods[1].retention_rate == pytest.approx(2 / 7)
    assert first.periods[3].observable is False
    recent = next(c for c in result.cohorts if c.cohort_start == date(2025, 1, 27))
    assert not recent.complete_cohort
    assert all(p.active_users is None for p in recent.periods)


def test_activity_rolling_and_zero_filled_days(analytical_db):
    response = activity(analytical_db, query())
    points = {p.date: p for p in response.series}
    assert points[date(2025, 1, 13)].dau == 1  # duplicate action counted once
    assert points[date(2025, 1, 6)].dau == 2
    assert points[date(2025, 1, 6)].wau is None  # left-censored seven-day window
    assert points[date(2025, 1, 14)].wau == 3
    assert points[date(2025, 1, 31)].dau == 0
    assert points[date(2025, 1, 31)].wau == 1
    assert points[date(2025, 1, 31)].mau == 5
    assert points[date(2025, 1, 31)].wau_mau == 0.2
    assert response.comparisons["mau"].previous is None


def test_paid_conversion_account_grain_and_mrr(analytical_db):
    period = query().model_copy(update={"as_of": date(2025, 3, 1)})
    values = monetization(analytical_db, period).current
    assert (values.eligible_accounts, values.censored_accounts, values.converted_accounts) == (
        8,
        1,
        2,
    )
    assert values.paid_conversion_rate == 0.25
    assert values.active_subscriptions == values.paid_users == 1
    assert values.mrr == 59
    assert values.arpu == 5.9
    assert values.new_mrr == 88
    assert values.churned_mrr == 29
    assert values.churned_subscriptions == 1
    assert values.opening_subscriptions == 0
    assert values.churn_rate is None


def test_opening_stock_churn_and_comparison(analytical_db):
    period = AnalyticsQuery(
        start_date=date(2025, 2, 1), end_date=date(2025, 3, 1), as_of=date(2025, 3, 1)
    )
    response = monetization(analytical_db, period)
    assert response.current.opening_subscriptions == 1
    assert response.current.churned_opening_subscriptions == 1
    assert response.current.churn_rate == 1
    assert response.current.mrr == 0
    assert response.comparisons["mrr"].previous == 59
    assert response.comparisons["mrr"].absolute_change == -59
    assert response.comparisons["mrr"].relative_change == -1
    assert response.previous_period.start_date == date(2025, 1, 4)


def test_subscription_end_boundary(analytical_db):
    analytical_db.execute(
        insert(Subscription),
        dict(
            id=3,
            account_id=3,
            started_by_user_id=3,
            plan="pro",
            started_at=at("2025-02-01"),
            cancelled_at=at("2025-03-01"),
            monthly_value=29,
        ),
    )
    values = monetization(analytical_db, query()).current
    assert values.mrr == 59  # starts at exclusive end; not in ending stock
    period = AnalyticsQuery(start_date=date(2025, 2, 1), end_date=date(2025, 3, 1))
    values = monetization(analytical_db, period).current
    assert values.mrr == 29  # cancellation at end belongs to next period
    assert values.new_mrr == 29
    assert values.churned_subscriptions == 1
    assert values.opening_subscriptions == 1


@pytest.mark.parametrize("dimension", list(Dimension))
def test_all_segment_dimensions(analytical_db, dimension):
    period = query(dimension=dimension)
    result = segments(analytical_db, period)
    assert len(result.groups) == 2
    assert sum(g.activation.eligible_users for g in result.groups) == 7
    assert sum(g.activation.activated_users for g in result.groups) == 3
    assert sum(g.monetization.mrr for g in result.groups) == 59
    assert sum(g.stages[0].users for g in funnel(analytical_db, period).groups) == 10
    assert sum(c.cohort_size for c in retention(analytical_db, period).cohorts) == 9


def test_filter(analytical_db):
    result = activation(
        analytical_db, query(dimension=Dimension.acquisition_channel, segment_value="organic")
    ).groups[0]
    assert result.eligible_users == 5
    assert result.activated_users == 2


def test_empty_and_unobserved(analytical_db):
    period = AnalyticsQuery(start_date=date(2025, 4, 1), end_date=date(2025, 5, 1))
    result = overview(analytical_db, period)
    assert result.metrics["completed_signups"].current == 0
    assert result.metrics["activation_rate"].current is None
    assert result.metrics["dau_mau"].current is None
    assert all(stage.users == 0 for stage in funnel(analytical_db, period).groups[0].stages)
    future = AnalyticsQuery(start_date=date(2025, 7, 1), end_date=date(2025, 8, 1))
    result = overview(analytical_db, future)
    assert all(metric.current is None for metric in result.metrics.values())


def test_empty_database(empty_db):
    with Session(empty_db) as session:
        result = overview(session, query())
        assert result.metrics["completed_signups"].current == 0
        assert result.metrics["mrr"].current == 0
        assert result.metrics["arpu"].current is None


@pytest.mark.parametrize(
    "path",
    ["overview", "activity", "activation", "funnel", "retention", "segments", "monetization"],
)
def test_api_contracts(analytical_db, path):
    app.dependency_overrides[analytics_session] = lambda: analytical_db
    try:
        with TestClient(app) as client:
            response = client.get(
                f"/api/analytics/{path}",
                params={
                    "start_date": "2025-01-01",
                    "end_date": "2025-02-01",
                    "as_of": "2025-02-01",
                },
            )
            assert response.status_code == 200, response.text
            assert response.json()["period"]["fully_observed"] is True
    finally:
        app.dependency_overrides.clear()


def test_sql_timezone_independent(analytical_db):
    expected = retention(analytical_db, query()).model_dump()
    analytical_db.execute(text("SET LOCAL TIME ZONE 'America/Los_Angeles'"))
    assert retention(analytical_db, query()).model_dump() == expected


def test_member_channel_does_not_duplicate_account_revenue(analytical_db):
    analytical_db.execute(
        update(User).where(User.id == 2).values(account_id=1, acquisition_channel="referral")
    )
    result = segments(analytical_db, query(dimension=Dimension.acquisition_channel))
    referral = next(group for group in result.groups if group.segment == "referral")
    assert referral.activation.eligible_users == 1
    assert referral.monetization.mrr == 0
    assert referral.monetization.arpu is None
    assert sum(group.monetization.mrr for group in result.groups) == 59


@pytest.mark.parametrize(
    "dimension,value",
    [
        (Dimension.company_size, "smb"),
        (Dimension.country, "Spain"),
        (Dimension.device_type, "desktop"),
        (Dimension.acquisition_channel, "organic"),
    ],
)
def test_filters_apply_to_all_query_families(analytical_db, dimension, value):
    period = query(dimension=dimension, segment_value=value)
    assert activity(analytical_db, period).series[-1].mau == 3
    assert funnel(analytical_db, period).groups[0].stages[0].users == 5
    assert monetization(analytical_db, period).current.mrr == 59
    assert sum(c.cohort_size for c in retention(analytical_db, period).cohorts) == 5


def test_full_seven_days_required_even_for_early_success(analytical_db):
    period = query().model_copy(update={"as_of": date(2025, 1, 13)})
    group = activation(analytical_db, period).groups[0]
    assert group.eligible_users == 7  # Jan 6 midnight + exactly seven days
    earlier = period.model_copy(update={"as_of": date(2025, 1, 12)})
    group = activation(analytical_db, earlier).groups[0]
    assert group.eligible_users == group.activated_users == 0
    assert group.activation_rate is None
    assert funnel(analytical_db, earlier).groups == []


def test_conversion_thirty_day_boundary(analytical_db):
    analytical_db.execute(
        update(Subscription)
        .where(Subscription.id == 1)
        .values(started_at=at("2025-02-05"), cancelled_at=None)
    )
    period = query().model_copy(update={"as_of": date(2025, 3, 1)})
    assert monetization(analytical_db, period).current.converted_accounts == 1


def test_cutoff_does_not_leak_later_activity(analytical_db):
    analytical_db.execute(
        insert(Event),
        dict(
            id=999,
            user_id=3,
            session_id="u3-cutoff",
            event_name="core_action",
            occurred_at=at("2025-02-01"),
            properties={},
        ),
    )
    assert activity(analytical_db, query()).series[-1].mau == 5
    assert activation(analytical_db, query()).groups[0].activated_users == 3


def test_real_api_uses_read_only_consistent_snapshot(analytical_db, monkeypatch):
    from contextlib import contextmanager

    monkeypatch.setattr("app.api.analytics.get_engine", lambda: analytical_db.bind)
    with contextmanager(analytics_session)(query()) as session:
        assert session.scalar(text("SHOW transaction_read_only")) == "on"
        assert session.scalar(text("SHOW transaction_isolation")) == "repeatable read"
        assert session.scalar(text("SHOW TimeZone")) == "UTC"
    with TestClient(app) as client:
        response = client.get(
            "/api/analytics/overview",
            params={"start_date": "2025-01-01", "end_date": "2025-02-01", "as_of": "2025-02-01"},
        )
        assert response.status_code == 200, response.text
        assert response.json()["metrics"]["activation_rate"]["current"] == pytest.approx(3 / 7)
