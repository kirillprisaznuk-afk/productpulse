from app.analytics.activation import signup_summary
from app.analytics.activity import snapshot
from app.analytics.comparisons import comparisons
from app.analytics.contracts import OverviewResponse, Period
from app.analytics.monetization import monetization_summary


def overview(session, query):
    def summary(period):
        return {
            **snapshot(session, period),
            **signup_summary(session, period),
            **monetization_summary(session, period).model_dump(),
        }

    return OverviewResponse(
        period=Period.from_query(query),
        previous_period=Period.from_query(query.previous()),
        dimension=query.dimension,
        segment_value=query.segment_value,
        metrics=comparisons(summary(query), summary(query.previous())),
    )
