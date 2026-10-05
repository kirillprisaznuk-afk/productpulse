import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.seed.generator import SeedConfig, generate
from app.seed.validation import validate


@pytest.fixture(scope="session")
def small_config():
    return SeedConfig(users=250)


@pytest.fixture(scope="session")
def small_data(small_config):
    data = generate(small_config)
    validate(data, small_config)
    return data


@pytest.fixture(scope="session")
def pg_engine():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable PostgreSQL database ending in _test")
    if not (make_url(url).database or "").endswith("_test"):
        pytest.fail("TEST_DATABASE_URL database name must end in _test (destructive tests)")
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.attributes["database_url"] = url
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    command.check(config)
    engine = create_engine(url)
    yield engine
    engine.dispose()


@pytest.fixture
def empty_db(pg_engine):
    with pg_engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE experiment_assignments, events, subscriptions, "
                "users, experiments, accounts"
            )
        )
    return pg_engine
