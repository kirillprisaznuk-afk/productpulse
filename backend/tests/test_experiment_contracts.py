import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.experiments.contracts import AnalysisQuery, MDERequest, PlanningRequest
from app.main import app


@pytest.mark.parametrize(
    "extra",
    [
        {"baseline_rate": 0},
        {"baseline_rate": 1},
        {"minimum_detectable_effect": 0},
        {"minimum_detectable_effect": 0.95},
        {"alpha": 0.5},
        {"target_power": 0.1},
        {"target_power": float("nan")},
        {"effect_mode": "one-sided"},
    ],
)
def test_invalid_planning(extra):
    data = dict(baseline_rate=0.1, minimum_detectable_effect=0.02)
    data.update(extra)
    with pytest.raises(ValidationError):
        PlanningRequest(**data)


def test_invalid_mde_and_as_of():
    with pytest.raises(ValidationError):
        MDERequest(baseline_rate=0.1, sample_size_per_variant=-1)
    with pytest.raises(ValidationError):
        MDERequest(baseline_rate=0.1, sample_size_per_variant=1.5)
    with pytest.raises(ValidationError):
        AnalysisQuery(as_of="2026-01-01")


def test_planning_endpoints_need_no_database():
    with TestClient(app) as client:
        response = client.post(
            "/api/experiments/power", json={"baseline_rate": 0.1, "minimum_detectable_effect": 0.02}
        )
        assert response.status_code == 200
        assert response.json()["required_sample_per_variant"] > 3000
        response = client.post(
            "/api/experiments/mde", json={"baseline_rate": 0.1, "sample_size_per_variant": 1000}
        )
        assert response.status_code == 200
        assert 0.03 < response.json()["absolute_mde"] < 0.05
        assert client.post("/api/experiments/power", json={}).status_code == 422
        assert client.get("/api/experiments?alpha=0.5").status_code == 422
