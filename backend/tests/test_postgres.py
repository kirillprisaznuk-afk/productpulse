import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, insert, select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.database.session import get_session
from app.main import app
from app.models.warehouse import Account, Event, User
from app.seed.loader import load

pytestmark = pytest.mark.integration


def test_load_and_safe_reseed(empty_db, small_data):
    load(empty_db, small_data)
    with pytest.raises(ValueError, match="--reset"):
        load(empty_db, small_data)
    load(empty_db, small_data, reset=True)
    assert load(empty_db, small_data, if_empty=True) is False
    with empty_db.connect() as connection:
        assert connection.scalar(select(func.count()).select_from(Event)) == len(small_data.events)
        assert connection.scalar(select(func.count()).select_from(User)) == len(small_data.users)


def test_bootstrap_empty_database(empty_db, small_data):
    assert load(empty_db, small_data, if_empty=True) is True
    with pytest.raises(ValueError, match="mutually exclusive"):
        load(empty_db, small_data, if_empty=True, reset=True)


def test_failed_reseed_rolls_back(empty_db, small_data):
    from copy import deepcopy

    load(empty_db, small_data)
    bad = deepcopy(small_data)
    bad.events[0]["user_id"] = 999999
    with pytest.raises(IntegrityError):
        load(empty_db, bad, reset=True)
    with empty_db.connect() as connection:
        assert connection.scalar(select(func.count()).select_from(Event)) == len(small_data.events)


@pytest.mark.parametrize(
    "table, row",
    [
        (
            User,
            dict(
                id=99999,
                account_id=99999,
                created_at="2025-01-01T00:00:00Z",
                signup_at="2025-01-01T00:10:00Z",
                country="Spain",
                acquisition_channel="organic",
                device_type="desktop",
            ),
        ),
        (Account, dict(id=99999, created_at="2025-01-01T00:00:00Z", company_size="invalid")),
    ],
)
def test_database_constraints(empty_db, table, row):
    with pytest.raises(IntegrityError), empty_db.begin() as connection:
        connection.execute(insert(table), row)


def test_api_against_postgres(empty_db, small_data):
    def session():
        with Session(empty_db) as db:
            yield db

    app.dependency_overrides[get_session] = session
    try:
        with TestClient(app) as client:
            assert client.get("/health").json() == {"status": "ok", "database": "ok"}
            empty = client.get("/api/demo/summary")
            assert empty.status_code == 200
            assert empty.json()["dataset_start"] is None
            assert empty.json()["users"] == 0
            load(empty_db, small_data)
            response = client.get("/api/demo/summary")
            assert response.status_code == 200
            summary = response.json()
            assert summary["users"] == len(small_data.users)
            assert summary["events"] == len(small_data.events)
            assert summary["experiments"] == 2
            assert summary["dataset_start"] is not None
            assert summary["subscriptions"] == len(small_data.subscriptions)
    finally:
        app.dependency_overrides.clear()


def test_jsonb_storage(empty_db, small_data):
    load(empty_db, small_data)
    with empty_db.connect() as connection:
        assert (
            connection.scalar(text("SELECT properties->>'source' FROM events LIMIT 1"))
            == "synthetic"
        )


def test_health_does_not_expose_database_errors():
    def unavailable():
        raise OperationalError("secret SQL", {}, Exception("secret password"))

    app.dependency_overrides[get_session] = unavailable
    try:
        with TestClient(app) as client:
            response = client.get("/health")
            assert response.status_code == 503
            assert "secret" not in response.text
    finally:
        app.dependency_overrides.clear()
