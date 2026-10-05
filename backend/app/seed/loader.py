from sqlalchemy import exists, insert, select, text
from sqlalchemy.engine import Engine

from app.models.warehouse import Base
from app.seed.generator import Dataset


def load(engine: Engine, data: Dataset, *, reset: bool = False, if_empty: bool = False) -> bool:
    if reset and if_empty:
        raise ValueError("--reset and --if-empty are mutually exclusive")
    with engine.begin() as connection:
        # Serialize seed runs. Lock also protects the empty-check/insert race.
        connection.execute(text("SELECT pg_advisory_xact_lock(7042025)"))
        tables = list(Base.metadata.sorted_tables)
        populated = any(connection.scalar(select(exists().select_from(t))) for t in tables)
        if populated and if_empty:
            return False
        if populated and not reset:
            raise ValueError("Warehouse is not empty; use --reset explicitly to replace demo data")
        if reset:
            # No CASCADE: refuse to touch unrelated dependent tables.
            names = ", ".join(t.name for t in tables)
            connection.execute(text(f"TRUNCATE TABLE {names}"))
        for table in tables:
            rows = getattr(data, table.name)
            for offset in range(0, len(rows), 2000):
                connection.execute(insert(table), rows[offset : offset + 2000])
    return True
