import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session


def database_url() -> str:
    load_dotenv(Path(__file__).resolve().parents[3] / ".env")
    return os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://productpulse:replace_me@localhost:5432/productpulse",
    )


@lru_cache
def get_engine():
    return create_engine(
        database_url(),
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5, "options": "-c timezone=UTC"},
    )


def get_session():
    with Session(get_engine()) as session:
        yield session
