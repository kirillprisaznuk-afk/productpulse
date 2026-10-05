from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.database.session import get_session
from app.models.warehouse import Base, Event
from app.schemas.demo import DemoSummary, Health

router = APIRouter()
Database = Annotated[Session, Depends(get_session)]


@router.get("/health", response_model=Health)
def health(session: Database):
    session.execute(text("SELECT 1"))
    return Health(status="ok", database="ok")


@router.get("/api/demo/summary", response_model=DemoSummary)
def demo_summary(session: Database):
    # One statement gives a consistent snapshot even during transactional reseeding.
    counts = [
        select(func.count()).select_from(table).scalar_subquery().label(name)
        for name, table in Base.metadata.tables.items()
    ]
    result = (
        session.execute(
            select(
                select(func.min(Event.occurred_at)).scalar_subquery().label("dataset_start"),
                select(func.max(Event.occurred_at)).scalar_subquery().label("dataset_end"),
                *counts,
            )
        )
        .mappings()
        .one()
    )
    return DemoSummary.model_validate(dict(result))
