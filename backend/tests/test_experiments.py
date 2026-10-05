from contextlib import contextmanager
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, text, update
from sqlalchemy.orm import Session

from app.api.experiments import experiment_session
from app.experiments.contracts import AnalysisQuery
from app.experiments.service import analysis, experiment_list
from app.main import app
from app.models.warehouse import Event, Experiment, ExperimentAssignment
from tests.analytics_fixture import at, worked_dataset

pytestmark = pytest.mark.integration


@pytest.fixture
def experiment_db(empty_db):
    worked_dataset(empty_db)
    with empty_db.begin() as connection:
        connection.execute(
            insert(Experiment),
            dict(
                id=1,
                name="Fixture experiment",
                description="Synthetic",
                status="completed",
                primary_metric="activation_within_7_days",
                started_at=at("2025-01-01"),
                ended_at=at("2025-03-01"),
            ),
        )
        connection.execute(
            insert(ExperimentAssignment),
            [
                dict(
                    experiment_id=1,
                    user_id=uid,
                    variant="control" if uid % 2 else "treatment",
                    assigned_at=at("2025-01-06")
                    if uid <= 7
                    else at("2025-01-28" if uid == 9 else "2025-01-31"),
                )
                for uid in [1, 2, 3, 4, 5, 6, 7, 9, 10]
            ],
        )
    with Session(empty_db) as session:
        yield session


def test_mature_itt_population_and_duplicate_outcomes(experiment_db):
    result = analysis(experiment_db, 1, AnalysisQuery(as_of=date(2025, 2, 1)))
    assert (result.population.assigned, result.population.mature, result.population.censored) == (
        9,
        7,
        2,
    )
    assert result.population.invalid == 0
    control, treatment = result.variant_results
    assert (control.assigned, control.mature, control.conversions) == (5, 4, 1)
    assert (treatment.assigned, treatment.mature, treatment.conversions) == (4, 3, 2)
    assert result.effect.absolute_uplift == pytest.approx(2 / 3 - 1 / 4)
    assert result.decision.state == "INSUFFICIENT_DATA"
    assert result.health.data_valid
    assert not result.population.horizon_fully_observed


@pytest.mark.parametrize(
    "event_time,invalid",
    [
        ("2025-01-05", True),
        ("2025-01-06", True),
        ("2025-01-13", False),
        ("2025-01-12T23:59:59", False),
    ],
)
def test_outcome_boundaries(experiment_db, event_time, invalid):
    experiment_db.execute(
        insert(Event),
        dict(
            id=999,
            user_id=3,
            session_id="u3-extra",
            event_name="core_action",
            occurred_at=at(event_time),
            properties={},
        ),
    )
    result = analysis(experiment_db, 1, AnalysisQuery(as_of=date(2025, 2, 1)))
    assert result.population.invalid == int(invalid)
    expected = 2 if event_time == "2025-01-12T23:59:59" else 1
    assert result.variant_results[0].conversions == expected
    if invalid:
        assert result.health.pre_assignment_outcomes == 1
        assert result.decision.state == "DATA_QUALITY_WARNING"
        assert result.inference.p_value is None


def test_maturity_boundary_and_pre_cutoff_snapshot(experiment_db):
    result = analysis(experiment_db, 1, AnalysisQuery(as_of=date(2025, 1, 13)))
    assert result.population.mature == 7
    assert result.population.assigned == 7  # future assignments not visible yet
    earlier = analysis(experiment_db, 1, AnalysisQuery(as_of=date(2025, 1, 12)))
    assert earlier.population.mature == 0
    assert earlier.population.censored == 7
    assert sum(v.conversions for v in earlier.variant_results) == 0


def test_invalid_signup_and_assignment_contract(experiment_db):
    experiment_db.execute(
        insert(ExperimentAssignment),
        dict(experiment_id=1, user_id=8, variant="treatment", assigned_at=at("2025-01-06")),
    )
    experiment_db.execute(
        update(ExperimentAssignment)
        .where(ExperimentAssignment.user_id == 3)
        .values(assigned_at=at("2025-01-06") + timedelta(hours=1))
    )
    result = analysis(experiment_db, 1, AnalysisQuery())
    assert result.health.missing_or_mismatched_signup == 2
    assert result.population.invalid == 2
    assert result.decision.state == "DATA_QUALITY_WARNING"
    assert not result.inference.valid_for_decision


def test_enrollment_boundaries_and_post_enrollment_outcome(experiment_db):
    experiment_db.execute(
        update(Experiment).where(Experiment.id == 1).values(ended_at=at("2025-01-07"))
    )
    result = analysis(experiment_db, 1, AnalysisQuery())
    assert result.health.invalid_assignment_timing == 2  # Jan 28/31
    assert result.variant_results[1].conversions == 2  # Jan 8 outcome still within follow-up


def test_list_and_api_real_transaction(experiment_db, monkeypatch):
    query = AnalysisQuery(as_of=date(2025, 2, 1))
    listed = experiment_list(experiment_db, query)
    assert listed.experiments[0].assignment_counts == {"control": 5, "treatment": 4}
    monkeypatch.setattr("app.api.experiments.get_engine", lambda: experiment_db.bind)
    with contextmanager(experiment_session)(query) as session:
        assert session.scalar(text("SHOW transaction_read_only")) == "on"
        assert session.scalar(text("SHOW transaction_isolation")) == "repeatable read"
    with TestClient(app) as client:
        assert client.get("/api/experiments").status_code == 200
        response = client.get("/api/experiments/1/analysis?as_of=2025-02-01")
        assert response.status_code == 200, response.text
        assert response.json()["population"]["mature"] == 7
        for alpha in (0.01, 0.05, 0.1):
            response = client.get(
                "/api/experiments/1/analysis",
                params={"alpha": alpha, "practical_threshold": 0.02},
            )
            assert response.status_code == 200, response.text
            assert response.json()["inference"]["alpha"] == alpha
        for alpha in ("bad", "0.2"):
            assert (
                client.get("/api/experiments/1/analysis", params={"alpha": alpha}).status_code
                == 422
            )
        assert client.get("/api/experiments/999/analysis").status_code == 404


def test_unsupported_metric_is_not_silently_analysed(experiment_db):
    experiment_db.execute(
        update(Experiment).where(Experiment.id == 1).values(primary_metric="revenue")
    )
    app.dependency_overrides[experiment_session] = lambda: experiment_db
    try:
        with TestClient(app) as client:
            assert client.get("/api/experiments/1/analysis").status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_empty_list(empty_db):
    with Session(empty_db) as session:
        assert experiment_list(session, AnalysisQuery()).experiments == []
