from copy import deepcopy
from datetime import datetime, timedelta

import pytest
from pydantic import ValidationError

from app.schemas.demo import DemoSummary
from app.seed.generator import SeedConfig, assign_variant, generate
from app.seed.validation import validate


def test_reproducibility(small_config, small_data):
    assert generate(small_config) == small_data
    assert generate(small_config.model_copy(update={"seed": 43})) != small_data
    assert assign_variant(42, 1, 1) == assign_variant(42, 1, 1)


@pytest.mark.parametrize("seed", [0, 1, 7, 42, 99])
def test_small_dataset_invariants(seed):
    config = SeedConfig(users=300, seed=seed)
    validate(generate(config), config)


def test_config_and_response_schema():
    with pytest.raises(ValidationError):
        SeedConfig(users=-1)
    with pytest.raises(ValidationError):
        SeedConfig(start=datetime(2025, 1, 1))
    with pytest.raises(ValidationError):
        SeedConfig(end="2025-01-03T00:00:00Z")
    with pytest.raises(ValidationError):
        DemoSummary(
            dataset_start=None,
            dataset_end=None,
            accounts=-1,
            users=0,
            events=0,
            subscriptions=0,
            experiments=0,
            experiment_assignments=0,
        )


@pytest.mark.parametrize(
    "mutation, message",
    [
        (lambda d: d.users[0].update(account_id=999999), "Orphan user"),
        (lambda d: d.events[0].update(user_id=999999), "Orphan event"),
        (lambda d: d.users[0].update(country="Atlantis"), "Invalid user category"),
        (lambda d: d.events[0].update(event_name="random"), "Invalid event category"),
        (lambda d: d.events[0].update(properties={"email": "test"}), "PII"),
        (lambda d: d.users[0].update(email="test"), "PII"),
        (lambda d: d.events.append(d.events[0].copy()), "duplicate primary key"),
        (lambda d: d.subscriptions[0].update(monthly_value=-1), "Invalid plan/value"),
        (
            lambda d: d.subscriptions[0].update(
                cancelled_at=d.subscriptions[0]["started_at"] - timedelta(days=1)
            ),
            "Cancellation",
        ),
        (
            lambda d: d.experiment_assignments[0].update(
                assigned_at=d.experiment_assignments[0]["assigned_at"] + timedelta(hours=1)
            ),
            "Assignment",
        ),
        (lambda d: d.experiment_assignments[0].update(experiment_id=999), "Orphan assignment"),
        (lambda d: d.experiment_assignments[0].update(variant="third"), "Invalid variant"),
        (lambda d: d.experiment_assignments.pop(), "Missing experiment assignment"),
    ],
)
def test_corruption_rejected(small_data, small_config, mutation, message):
    data = deepcopy(small_data)
    mutation(data)
    with pytest.raises(ValueError, match=message):
        validate(data, small_config)


def test_onboarding_order_rejected(small_data, small_config):
    data = deepcopy(small_data)
    completed = next(e for e in data.events if e["event_name"] == "onboarding_completed")
    start = next(
        e
        for e in data.events
        if e["event_name"] == "onboarding_started" and e["user_id"] == completed["user_id"]
    )
    completed["occurred_at"] = start["occurred_at"] - timedelta(seconds=1)
    with pytest.raises(ValueError, match="lifecycle ordering"):
        validate(data, small_config)


def test_event_before_user_rejected(small_data, small_config):
    data = deepcopy(small_data)
    data.events[0]["occurred_at"] -= timedelta(seconds=1)
    with pytest.raises(ValueError, match="Event before user"):
        validate(data, small_config)


def test_outcomes_are_not_all_positive(small_data):
    active = {e["user_id"] for e in small_data.events if e["event_name"] == "core_action"}
    assert 0 < len(active) < len(small_data.users)
    assert 0 < len(small_data.subscriptions) < len(active)
    assert any(s["cancelled_at"] for s in small_data.subscriptions)
    assert {a["variant"] for a in small_data.experiment_assignments} == {"control", "treatment"}
