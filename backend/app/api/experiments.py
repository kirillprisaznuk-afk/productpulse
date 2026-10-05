from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_engine
from app.experiments import power, service
from app.experiments.contracts import (
    AnalysisQuery,
    ExperimentAnalysis,
    ExperimentList,
    MDERequest,
    MDEResult,
    PlanningRequest,
    PlanningResponse,
)

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


def parameters(query: Annotated[AnalysisQuery, Query()]):
    return query


Parameters = Annotated[AnalysisQuery, Depends(parameters)]


def experiment_session(query: Parameters):
    with get_engine().connect().execution_options(isolation_level="REPEATABLE READ") as connection:
        with connection.begin():
            connection.execute(text("SET TRANSACTION READ ONLY"))
            connection.execute(text("SET LOCAL TIME ZONE 'UTC'"))
            connection.execute(text("SET LOCAL statement_timeout = '15s'"))
            with Session(bind=connection) as session:
                yield session


Database = Annotated[Session, Depends(experiment_session)]


@router.get("", response_model=ExperimentList)
def list_experiments(session: Database, query: Parameters):
    return service.experiment_list(session, query)


@router.get("/{experiment_id}/analysis", response_model=ExperimentAnalysis)
def experiment_analysis(
    experiment_id: Annotated[int, Path(gt=0)], session: Database, query: Parameters
):
    try:
        return service.analysis(session, experiment_id, query)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/power", response_model=PlanningResponse)
def sample_size(request: PlanningRequest):
    return power.plan(request)


@router.post("/mde", response_model=MDEResult)
def mde(request: MDERequest):
    return power.minimum_detectable_effect(
        request.baseline_rate, request.sample_size_per_variant, request.alpha, request.target_power
    )
