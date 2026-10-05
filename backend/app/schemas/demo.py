from datetime import datetime

from pydantic import BaseModel, Field


class Health(BaseModel):
    status: str
    database: str


class DemoSummary(BaseModel):
    dataset_start: datetime | None
    dataset_end: datetime | None
    accounts: int = Field(ge=0)
    users: int = Field(ge=0)
    events: int = Field(ge=0)
    subscriptions: int = Field(ge=0)
    experiments: int = Field(ge=0)
    experiment_assignments: int = Field(ge=0)
