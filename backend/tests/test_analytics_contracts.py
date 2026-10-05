from datetime import date

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.analytics.comparisons import compare
from app.analytics.contracts import AnalyticsQuery
from app.main import app


@pytest.mark.parametrize(
    "values",
    [
        {"start_date": "2025-02-01", "end_date": "2025-01-01"},
        {"start_date": "2020-01-01", "end_date": "2025-01-01"},
        {"as_of": "2027-01-01"},
        {"dimension": "event_name; DROP TABLE events"},
        {"segment_value": "organic"},
        {"dimension": "country", "segment_value": "Atlantis"},
        {"max_weeks": 27},
    ],
)
def test_invalid_parameters(values):
    with pytest.raises(ValidationError):
        AnalyticsQuery(**values)


def test_equal_length_comparison_and_zero_baseline():
    query = AnalyticsQuery(start_date=date(2025, 6, 1), end_date=date(2025, 7, 1))
    assert query.previous().start_date == date(2025, 5, 2)
    assert compare(3, 0).relative_change is None
    assert compare(3, 0).absolute_change == 3
    assert compare(0, 0).direction == "flat"
    assert compare(None, 0).direction == "unavailable"


def test_api_invalid_parameters():
    with TestClient(app) as client:
        response = client.get("/api/analytics/activity?start_date=bad")
        assert response.status_code == 422
