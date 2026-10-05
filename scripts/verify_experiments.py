"""Read-only experiment results and optional population query plans on the existing warehouse."""

import argparse
import json
import sys
from pathlib import Path
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database.session import get_engine  # noqa: E402
from app.experiments import queries, service  # noqa: E402
from app.experiments.contracts import AnalysisQuery  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--explain", action="store_true")
    args = parser.parse_args()
    query = AnalysisQuery()
    report = {}
    with get_engine().connect().execution_options(isolation_level="REPEATABLE READ") as connection:
        with connection.begin():
            connection.execute(text("SET TRANSACTION READ ONLY"))
            connection.execute(text("SET LOCAL TIME ZONE 'UTC'"))
            connection.execute(text("SET LOCAL statement_timeout = '15s'"))
            with Session(bind=connection) as session:
                for experiment in service.experiment_list(session, query).experiments:
                    started = perf_counter()
                    result = service.analysis(session, experiment.id, query)
                    record = {
                        "seconds": perf_counter() - started,
                        "result": result.model_dump(mode="json"),
                    }
                    if args.explain:
                        record["plan"] = list(
                            session.execute(
                                text("EXPLAIN (ANALYZE, BUFFERS) " + queries.POPULATION_SQL),
                                queries.params(query, experiment.id),
                            ).scalars()
                        )
                    report[experiment.id] = record
    get_engine().dispose()
    print(json.dumps(report, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
