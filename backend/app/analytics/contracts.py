"""Public analytics contracts. Dates are UTC; end_date and as_of are exclusive."""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.warehouse import CHANNELS, COUNTRIES, DEVICES, SIZES

OBSERVATION_START = date(2025, 1, 1)
OBSERVATION_END = date(2025, 7, 1)
ACTIVE_EVENTS = ("core_action",)
FUNNEL_STEPS = (
    "landing_view",
    "signup_completed",
    "onboarding_started",
    "onboarding_completed",
    "core_action",
    "subscription_started",
)


class Dimension(StrEnum):
    acquisition_channel = "acquisition_channel"
    company_size = "company_size"
    country = "country"
    device_type = "device_type"


CATEGORIES = {
    Dimension.acquisition_channel: CHANNELS,
    Dimension.company_size: SIZES,
    Dimension.country: COUNTRIES,
    Dimension.device_type: DEVICES,
}


class AnalyticsQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start_date: date = date(2025, 6, 1)
    end_date: date = OBSERVATION_END
    as_of: date = OBSERVATION_END
    dimension: Dimension | None = None
    segment_value: str | None = Field(default=None, max_length=40)
    max_weeks: int = Field(default=12, ge=0, le=26)

    @model_validator(mode="after")
    def validate_window(self):
        if not 0 < (self.end_date - self.start_date).days <= 366:
            raise ValueError("end_date must be after start_date, with at most 366 days")
        if not OBSERVATION_START <= self.as_of <= OBSERVATION_END:
            raise ValueError("as_of must be within the documented observation window")
        if self.segment_value is not None:
            if self.dimension is None or self.segment_value not in CATEGORIES[self.dimension]:
                raise ValueError("segment_value must belong to the selected dimension")
        return self

    def previous(self):
        return self.model_copy(
            update={
                "start_date": self.start_date - (self.end_date - self.start_date),
                "end_date": self.start_date,
            }
        )

    def params(self):
        def midnight(d):
            return datetime.combine(d, datetime.min.time(), UTC)

        return {
            "start": midnight(self.start_date),
            "end": midnight(self.end_date),
            "cutoff": midnight(self.as_of),
            "observed_start": midnight(OBSERVATION_START),
            "segment_value": self.segment_value,
            "max_weeks": self.max_weeks,
            "active_events": list(ACTIVE_EVENTS),
        }

    @property
    def complete(self):
        return OBSERVATION_START <= self.start_date < self.end_date <= self.as_of


class Period(BaseModel):
    start_date: date
    end_date: date
    as_of: date
    fully_observed: bool

    @classmethod
    def from_query(cls, query):
        return cls(
            start_date=query.start_date,
            end_date=query.end_date,
            as_of=query.as_of,
            fully_observed=query.complete,
        )


class Comparison(BaseModel):
    current: float | None
    previous: float | None
    absolute_change: float | None
    relative_change: float | None
    direction: Literal["up", "down", "flat", "unavailable"]


class ActivityPoint(BaseModel):
    date: date
    dau: int | None
    wau: int | None
    mau: int | None
    dau_mau: float | None
    wau_mau: float | None


class ActivityResponse(BaseModel):
    period: Period
    previous_period: Period
    dimension: Dimension | None
    segment_value: str | None
    series: list[ActivityPoint]
    comparisons: dict[str, Comparison]


class ActivationRow(BaseModel):
    segment: str
    cohort_start: date | None = None
    completed_signups: int
    eligible_users: int
    censored_users: int
    activated_users: int
    activation_rate: float | None
    median_activation_seconds: float | None


class ActivationResponse(BaseModel):
    period: Period
    dimension: Dimension | None
    groups: list[ActivationRow]
    cohorts: list[ActivationRow]


class FunnelStage(BaseModel):
    event_name: str
    users: int
    conversion_from_previous: float | None
    cumulative_conversion: float | None
    drop_off_count: int | None
    drop_off_rate: float | None
    median_seconds_from_previous: float | None


class FunnelGroup(BaseModel):
    segment: str
    stages: list[FunnelStage]
    median_signup_to_onboarding_seconds: float | None
    median_signup_to_core_action_seconds: float | None
    median_core_action_to_paid_seconds: float | None


class FunnelResponse(BaseModel):
    period: Period
    dimension: Dimension | None
    groups: list[FunnelGroup]


class RetentionCell(BaseModel):
    week: int
    observable: bool
    active_users: int | None
    retention_rate: float | None


class RetentionCohort(BaseModel):
    segment: str
    cohort_start: date
    cohort_size: int
    complete_cohort: bool
    periods: list[RetentionCell]


class RetentionResponse(BaseModel):
    period: Period
    dimension: Dimension | None
    cohorts: list[RetentionCohort]


class MonetizationValues(BaseModel):
    eligible_accounts: int | None
    converted_accounts: int | None
    censored_accounts: int | None
    paid_conversion_rate: float | None
    paid_users: int | None
    active_subscriptions: int | None
    mrr: float | None
    arpu: float | None
    new_mrr: float | None
    churned_mrr: float | None
    opening_subscriptions: int | None
    churned_subscriptions: int | None
    churned_opening_subscriptions: int | None
    churn_rate: float | None


class MonetizationResponse(BaseModel):
    period: Period
    previous_period: Period
    dimension: Dimension | None
    segment_value: str | None
    current: MonetizationValues
    comparisons: dict[str, Comparison]


class SegmentRow(BaseModel):
    segment: str
    activation: ActivationRow
    monetization: MonetizationValues


class SegmentsResponse(BaseModel):
    period: Period
    dimension: Dimension
    groups: list[SegmentRow]


class OverviewResponse(BaseModel):
    period: Period
    previous_period: Period
    dimension: Dimension | None
    segment_value: str | None
    metrics: dict[str, Comparison]
