from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

SIZES = ("solo", "smb", "mid_market", "enterprise")
CHANNELS = ("organic", "paid_search", "paid_social", "referral", "partner")
COUNTRIES = ("United Kingdom", "Germany", "Spain", "France", "Netherlands")
DEVICES = ("desktop", "mobile", "tablet")
EVENTS = (
    "landing_view",
    "signup_started",
    "signup_completed",
    "onboarding_started",
    "onboarding_completed",
    "core_action",
    "subscription_started",
    "subscription_cancelled",
)
VARIANTS = ("control", "treatment")


def category(column: str, values: tuple[str, ...]) -> CheckConstraint:
    literals = ", ".join(repr(value) for value in values)
    return CheckConstraint(f"{column} IN ({literals})", name=f"ck_{column}_values")


class Base(DeclarativeBase):
    pass


class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    company_size: Mapped[str] = mapped_column(String(20))
    __table_args__ = (category("company_size", SIZES),)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    signup_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    country: Mapped[str] = mapped_column(String(30))
    acquisition_channel: Mapped[str] = mapped_column(String(20))
    device_type: Mapped[str] = mapped_column(String(10))
    __table_args__ = (
        category("country", COUNTRIES),
        category("acquisition_channel", CHANNELS),
        category("device_type", DEVICES),
        CheckConstraint("signup_at >= created_at", name="ck_user_signup_order"),
    )


class Event(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    session_id: Mapped[str] = mapped_column(String(48))
    event_name: Mapped[str] = mapped_column(String(30))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    properties: Mapped[dict] = mapped_column(JSONB, default=dict)
    __table_args__ = (
        category("event_name", EVENTS),
        CheckConstraint("jsonb_typeof(properties) = 'object'", name="ck_properties_object"),
        Index("ix_events_user_time", "user_id", "occurred_at"),
        Index("ix_events_name_time", "event_name", "occurred_at"),
        Index("ix_events_time", "occurred_at"),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), unique=True)
    started_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    plan: Mapped[str] = mapped_column(String(12))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    monthly_value: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    __table_args__ = (
        category("plan", ("pro", "business")),
        CheckConstraint("monthly_value > 0", name="ck_subscription_value"),
        CheckConstraint("cancelled_at >= started_at", name="ck_subscription_order"),
    )


class Experiment(Base):
    __tablename__ = "experiments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(12))
    primary_metric: Mapped[str] = mapped_column(String(40))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        category("status", ("planned", "running", "completed")),
        CheckConstraint("ended_at > started_at", name="ck_experiment_order"),
    )


class ExperimentAssignment(Base):
    __tablename__ = "experiment_assignments"
    experiment_id: Mapped[int] = mapped_column(ForeignKey("experiments.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True, index=True)
    variant: Mapped[str] = mapped_column(String(12))
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (category("variant", VARIANTS),)
