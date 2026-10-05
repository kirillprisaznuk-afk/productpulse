"""Pure deterministic generator; no database, wall clock, or global random state."""

import hashlib
import random
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from pydantic import AwareDatetime, BaseModel, Field, model_validator

from app.models.warehouse import CHANNELS, COUNTRIES, SIZES


class SeedConfig(BaseModel):
    seed: int = 42
    users: int = Field(default=16000, ge=20, le=200000)
    start: AwareDatetime = datetime(2025, 1, 1, tzinfo=UTC)
    end: AwareDatetime = datetime(2025, 7, 1, tzinfo=UTC)

    @model_validator(mode="after")
    def check_window(self):
        if self.end - self.start < timedelta(days=30):
            raise ValueError("Observation window must be at least 30 days")
        return self


@dataclass
class Dataset:
    accounts: list[dict] = field(default_factory=list)
    users: list[dict] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)
    subscriptions: list[dict] = field(default_factory=list)
    experiments: list[dict] = field(default_factory=list)
    experiment_assignments: list[dict] = field(default_factory=list)


def assign_variant(seed: int, experiment_id: int, user_id: int) -> str:
    digest = hashlib.sha256(f"{seed}:{experiment_id}:{user_id}".encode()).digest()
    return ("control", "treatment")[digest[0] % 2]


def generate(config: SeedConfig) -> Dataset:
    rng = random.Random(config.seed)
    data = Dataset()
    duration = (config.end - config.start).total_seconds()
    midpoint = config.start + (config.end - config.start) / 2
    for eid, name, start, end in (
        (1, "Guided onboarding", config.start, midpoint),
        (2, "Workspace checklist copy", midpoint, config.end),
    ):
        data.experiments.append(
            dict(
                id=eid,
                name=name,
                description=(
                    "Synthetic user-randomized onboarding experiment for fictional TaskHarbor."
                ),
                status="completed",
                primary_metric="activation_within_7_days",
                started_at=start,
                ended_at=end,
            )
        )

    # Group members around an account's creation; no independent fictitious companies per user.
    remaining = config.users
    while remaining:
        size = rng.choices(SIZES, weights=[22, 48, 22, 8])[0]
        members = min(remaining, {"solo": 1, "smb": 3, "mid_market": 5, "enterprise": 9}[size])
        account_id = len(data.accounts) + 1
        created = config.start + timedelta(seconds=rng.uniform(0, duration - 86400))
        data.accounts.append(dict(id=account_id, created_at=created, company_size=size))
        country = rng.choices(COUNTRIES, weights=[30, 25, 16, 18, 11])[0]
        subscribers = []
        for member in range(members):
            uid = len(data.users) + 1
            joined = min(
                created + timedelta(hours=rng.uniform(0, 36) if member else 0),
                config.end - timedelta(hours=2),
            )
            signup = joined + timedelta(minutes=rng.uniform(3, 35))
            channel = rng.choices(CHANNELS, weights=[27, 23, 30, 12, 8])[0]
            device = rng.choices(("desktop", "mobile", "tablet"), weights=[76, 20, 4])[0]
            data.users.append(
                dict(
                    id=uid,
                    account_id=account_id,
                    created_at=joined,
                    signup_at=signup,
                    country=country,
                    acquisition_channel=channel,
                    device_type=device,
                )
            )

            def emit(name, when, session=0, user_id=uid):
                if when < config.end:
                    data.events.append(
                        dict(
                            id=len(data.events) + 1,
                            user_id=user_id,
                            session_id=f"u{user_id}-s{session}",
                            event_name=name,
                            occurred_at=when,
                            properties={"source": "synthetic"},
                        )
                    )

            emit("landing_view", joined)
            emit("signup_started", joined + timedelta(minutes=1))
            emit("signup_completed", signup)
            experiment = data.experiments[0 if signup < midpoint else 1]
            variant = assign_variant(config.seed, experiment["id"], uid)
            data.experiment_assignments.append(
                dict(
                    experiment_id=experiment["id"],
                    user_id=uid,
                    variant=variant,
                    assigned_at=signup,
                )
            )
            onboarding_start = signup + timedelta(hours=rng.uniform(0.1, 8))
            # Some users never even begin onboarding.
            if rng.random() > 0.94:
                continue
            emit("onboarding_started", onboarding_start, 1)
            propensity = {
                "organic": 0.65,
                "paid_search": 0.57,
                "paid_social": 0.46,
                "referral": 0.70,
                "partner": 0.64,
            }[channel]
            if experiment["id"] == 1 and variant == "treatment":
                propensity += 0.055
            if device == "mobile":
                propensity -= 0.04
            if rng.random() >= propensity:
                continue
            delay = rng.lognormvariate(0.6 if size == "enterprise" else -0.6, 0.9)
            completed = onboarding_start + timedelta(days=delay)
            first_action = completed + timedelta(hours=rng.uniform(0.1, 20))
            emit("onboarding_completed", completed, 2)
            emit("core_action", first_action, 2)
            if first_action >= config.end:
                continue
            subscribers.append((uid, first_action))
            # Heterogeneous visit cadence and lifetime; calendar cutoff censors recent users.
            loyalty = {
                "organic": 0.88,
                "paid_search": 0.84,
                "paid_social": 0.78,
                "referral": 0.91,
                "partner": 0.88,
            }[channel]
            cadence = rng.uniform(3, 11)
            durable = rng.random() < 0.16
            visit = first_action
            session = 3
            while True:
                visit += timedelta(days=rng.expovariate(1 / cadence) + 0.5)
                if visit >= config.end or (not durable and rng.random() > loyalty):
                    break
                for action in range(rng.randint(1, 3)):
                    emit("core_action", visit + timedelta(minutes=action * 8), session)
                session += 1
        # One account contract, paid by an already active member; free is absence of a contract.
        conversion = {"solo": 0.16, "smb": 0.22, "mid_market": 0.28, "enterprise": 0.35}[size]
        if subscribers and rng.random() < conversion:
            owner, action_at = min(subscribers, key=lambda item: item[1])
            started = action_at + timedelta(days=rng.uniform(1, 14))
            if started < config.end:
                plan = "business" if size in ("mid_market", "enterprise") else "pro"
                value = {
                    "solo": "29.00",
                    "smb": "59.00",
                    "mid_market": "199.00",
                    "enterprise": "499.00",
                }[size]
                cancelled = None
                if rng.random() < 0.25:
                    possible = started + timedelta(days=rng.uniform(14, 100))
                    if possible < config.end:
                        cancelled = possible
                data.subscriptions.append(
                    dict(
                        id=len(data.subscriptions) + 1,
                        account_id=account_id,
                        started_by_user_id=owner,
                        plan=plan,
                        started_at=started,
                        cancelled_at=cancelled,
                        monthly_value=Decimal(value),
                    )
                )
                for name, when in (
                    ("subscription_started", started),
                    ("subscription_cancelled", cancelled),
                ):
                    if when is not None:
                        data.events.append(
                            dict(
                                id=len(data.events) + 1,
                                user_id=owner,
                                session_id=f"u{owner}-billing-{name}",
                                event_name=name,
                                occurred_at=when,
                                properties={"source": "synthetic"},
                            )
                        )
        remaining -= members
    return data
