"""Ten users with intentionally adversarial events; expected answers are in ANALYTICS.md."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import insert

from app.models.warehouse import Account, Event, Subscription, User


def at(value):
    return datetime.fromisoformat(value).replace(tzinfo=UTC)


def worked_dataset(engine):
    accounts, users, events = [], [], []

    def event(uid, name, timestamp):
        events.append(
            dict(
                id=len(events) + 1,
                user_id=uid,
                session_id=f"u{uid}-test",
                event_name=name,
                occurred_at=timestamp,
                properties={"source": "synthetic"},
            )
        )

    for uid in range(1, 11):
        signup = at("2025-01-06") if uid <= 8 else at("2025-01-28" if uid == 9 else "2025-01-31")
        accounts.append(
            dict(
                id=uid,
                created_at=at("2025-01-01"),
                company_size="smb" if uid <= 5 else "enterprise",
            )
        )
        users.append(
            dict(
                id=uid,
                account_id=uid,
                created_at=signup - timedelta(hours=1),
                signup_at=signup,
                country="Spain" if uid <= 5 else "Germany",
                acquisition_channel="organic" if uid <= 5 else "paid_social",
                device_type="desktop" if uid <= 5 else "mobile",
            )
        )
        event(uid, "landing_view", signup - timedelta(hours=1))
        event(uid, "signup_started", signup - timedelta(minutes=30))
        if uid != 8:
            event(uid, "signup_completed", signup)
        if uid <= 6 or uid == 9:
            event(uid, "onboarding_started", signup + timedelta(hours=1))
        if uid <= 4 or uid == 9:
            event(uid, "onboarding_completed", signup + timedelta(hours=2))
        if uid == 6:
            # Wrong order: completion before onboarding starts must not progress the funnel.
            event(uid, "onboarding_completed", signup + timedelta(minutes=30))
    for uid, timestamp in [
        (1, "2025-01-06T03:00:00"),
        (2, "2025-01-14"),
        (4, "2025-01-08"),
        (6, "2025-01-06T03:00:00"),
        (9, "2025-01-29"),
        (1, "2025-01-13"),
        (1, "2025-01-20"),
        (4, "2025-01-22"),
    ]:
        event(uid, "core_action", at(timestamp))
    event(1, "core_action", at("2025-01-13"))
    event(1, "signup_completed", at("2025-01-06T00:05:00"))
    event(1, "subscription_started", at("2025-01-08"))
    event(1, "subscription_cancelled", at("2025-01-20"))
    event(2, "subscription_started", at("2025-01-20"))
    event(2, "subscription_cancelled", at("2025-02-10"))
    subscriptions = [
        dict(
            id=uid,
            account_id=uid,
            started_by_user_id=uid,
            plan="pro",
            started_at=at(start),
            cancelled_at=at(end),
            monthly_value=Decimal(value),
        )
        for uid, start, end, value in [
            (1, "2025-01-08", "2025-01-20", "29"),
            (2, "2025-01-20", "2025-02-10", "59"),
        ]
    ]
    with engine.begin() as connection:
        for table, data in [
            (Account, accounts),
            (User, users),
            (Event, events),
            (Subscription, subscriptions),
        ]:
            connection.execute(insert(table), data)
