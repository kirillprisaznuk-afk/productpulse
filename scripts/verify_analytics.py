"""Aggregate-only Stage 2 sanity report and optional PostgreSQL execution plans."""

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.analytics import (  # noqa: E402
    activation,
    activity,
    funnels,
    monetization,
    overview,
    retention,
    segmentation,
)
from app.analytics.contracts import OBSERVATION_START, AnalyticsQuery, Dimension  # noqa: E402
from app.database.session import get_engine  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-date", type=date.fromisoformat, default=date(2025, 6, 1))
    parser.add_argument("--end-date", type=date.fromisoformat, default=date(2025, 7, 1))
    parser.add_argument("--explain", action="store_true")
    args = parser.parse_args()
    query = AnalyticsQuery(start_date=args.start_date, end_date=args.end_date)
    full = query.model_copy(update={"start_date": OBSERVATION_START})
    report = {}
    with get_engine().connect().execution_options(isolation_level="REPEATABLE READ") as connection:
        with connection.begin():
            connection.execute(text("SET TRANSACTION READ ONLY"))
            connection.execute(text("SET LOCAL TIME ZONE 'UTC'"))
            connection.execute(text("SET LOCAL statement_timeout = '15s'"))
            with Session(bind=connection) as session:
                tasks = [
                    ("overview", overview.overview, query),
                    ("activity", activity.activity, query),
                    ("activation", activation.activation, full),
                    ("funnel", funnels.funnel, full),
                    ("retention", retention.retention, full),
                    ("monetization", monetization.monetization, full),
                ]
                tasks += [
                    (
                        f"segments_{dimension.value}",
                        segmentation.segments,
                        full.model_copy(update={"dimension": dimension}),
                    )
                    for dimension in Dimension
                ]
                for name, function, parameters in tasks:
                    started = perf_counter()
                    result = function(session, parameters)
                    report[name] = {
                        "seconds": perf_counter() - started,
                        "result": result.model_dump(mode="json"),
                    }
                if args.explain:
                    report["plans"] = {}
                    for name, sql in (
                        ("activity", activity.activity_sql(query)),
                        ("funnel", funnels.funnel_sql(full)),
                        ("retention", retention.retention_sql(full)),
                        ("monetization", monetization.monetization_sql(query)),
                    ):
                        plan = (
                            session.execute(
                                text("EXPLAIN (ANALYZE, BUFFERS) " + sql),
                                (full if name in ("funnel", "retention") else query).params(),
                            )
                            .scalars()
                            .all()
                        )
                        report["plans"][name] = list(plan)
    get_engine().dispose()
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
