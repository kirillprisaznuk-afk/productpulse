from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.analytics import (
    activation,
    activity,
    funnels,
    monetization,
    overview,
    retention,
    segmentation,
)
from app.analytics.contracts import (
    ActivationResponse,
    ActivityResponse,
    AnalyticsQuery,
    FunnelResponse,
    MonetizationResponse,
    OverviewResponse,
    RetentionResponse,
    SegmentsResponse,
)
from app.database.session import get_engine

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def parameters(query: Annotated[AnalyticsQuery, Query()]):
    return query


Parameters = Annotated[AnalyticsQuery, Depends(parameters)]


def analytics_session(query: Parameters):
    # Multiple aggregate queries in one response must see the same database snapshot.
    with get_engine().connect().execution_options(isolation_level="REPEATABLE READ") as connection:
        with connection.begin():
            connection.execute(text("SET TRANSACTION READ ONLY"))
            connection.execute(text("SET LOCAL TIME ZONE 'UTC'"))
            connection.execute(text("SET LOCAL statement_timeout = '15s'"))
            with Session(bind=connection) as session:
                yield session


Database = Annotated[Session, Depends(analytics_session)]


@router.get("/overview", response_model=OverviewResponse)
def get_overview(session: Database, query: Parameters):
    return overview.overview(session, query)


@router.get("/activity", response_model=ActivityResponse)
def get_activity(session: Database, query: Parameters):
    return activity.activity(session, query)


@router.get("/activation", response_model=ActivationResponse)
def get_activation(session: Database, query: Parameters):
    return activation.activation(session, query)


@router.get("/funnel", response_model=FunnelResponse)
def get_funnel(session: Database, query: Parameters):
    return funnels.funnel(session, query)


@router.get("/retention", response_model=RetentionResponse)
def get_retention(session: Database, query: Parameters):
    return retention.retention(session, query)


@router.get("/segments", response_model=SegmentsResponse)
def get_segments(session: Database, query: Parameters):
    return segmentation.segments(session, query)


@router.get("/monetization", response_model=MonetizationResponse)
def get_monetization(session: Database, query: Parameters):
    return monetization.monetization(session, query)
