"""Read back all warehouse rows and validate the persisted seed, not only generator output."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import select  # noqa: E402

from app.database.session import get_engine  # noqa: E402
from app.models import Base  # noqa: E402
from app.seed.generator import Dataset, SeedConfig  # noqa: E402
from app.seed.report import sanity_report  # noqa: E402
from app.seed.validation import validate  # noqa: E402


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--users", type=int, default=16000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    data = Dataset()
    engine = get_engine()
    with engine.connect().execution_options(isolation_level="REPEATABLE READ") as connection:
        with connection.begin():
            for name, table in Base.metadata.tables.items():
                rows = connection.execute(
                    select(table).order_by(*table.primary_key.columns)
                ).mappings()
                setattr(data, name, [dict(row) for row in rows])
    engine.dispose()
    validate(data, SeedConfig(users=args.users, seed=args.seed))
    print(json.dumps(sanity_report(data), indent=2))
    print("Representative rows (synthetic only):")
    for name, rows in vars(data).items():
        print(name, json.dumps(rows[:2], default=str))


if __name__ == "__main__":
    main()
