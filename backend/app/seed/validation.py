"""Cross-table warehouse contracts. Reject invalid data before opening a write transaction."""

from collections import Counter, defaultdict
from datetime import timedelta

from app.models.warehouse import CHANNELS, COUNTRIES, DEVICES, EVENTS, SIZES, VARIANTS, Base
from app.seed.generator import Dataset, SeedConfig


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(data: Dataset, config: SeedConfig) -> None:
    for name, table in Base.metadata.tables.items():
        keys = set(table.columns.keys())
        ids = set()
        pk = [column.name for column in table.primary_key]
        for row in getattr(data, name):
            require(set(row) == keys, f"{name}: unexpected/missing fields (PII not allowed)")
            identity = tuple(row[k] for k in pk)
            require(identity not in ids, f"{name}: duplicate primary key")
            ids.add(identity)
            for col in table.columns:
                require(row[col.name] is not None or col.nullable, f"{name}: null {col.name}")
            for key in (
                "created_at",
                "signup_at",
                "occurred_at",
                "assigned_at",
                "started_at",
                "cancelled_at",
                "ended_at",
            ):
                when = row.get(key)
                if when is not None:
                    require(
                        when.tzinfo is not None and when.utcoffset() is not None,
                        f"{name}: naive timestamp",
                    )
                    require(config.start <= when <= config.end, f"{name}: outside window")
                    if key != "ended_at":
                        require(when < config.end, f"{name}: exclusive end boundary")

    accounts = {row["id"]: row for row in data.accounts}
    users = {row["id"]: row for row in data.users}
    experiments = {row["id"]: row for row in data.experiments}
    require(len(users) == config.users, "Unexpected user count")
    for account in data.accounts:
        require(account["company_size"] in SIZES, "Invalid company size")
    for user in data.users:
        require(user["account_id"] in accounts, "Orphan user")
        require(
            accounts[user["account_id"]]["created_at"] <= user["created_at"] <= user["signup_at"],
            "User/account timestamp order",
        )
        require(
            user["country"] in COUNTRIES
            and user["acquisition_channel"] in CHANNELS
            and user["device_type"] in DEVICES,
            "Invalid user category",
        )

    by_user = defaultdict(lambda: defaultdict(list))
    for event in data.events:
        require(event["user_id"] in users, "Orphan event")
        require(event["event_name"] in EVENTS, "Invalid event category")
        require(event["properties"] == {"source": "synthetic"}, "Unexpected properties/PII")
        require(event["session_id"].startswith(f"u{event['user_id']}-"), "Invalid session owner")
        require(users[event["user_id"]]["created_at"] <= event["occurred_at"], "Event before user")
        by_user[event["user_id"]][event["event_name"]].append(event["occurred_at"])
    for uid, user in users.items():
        events = by_user[uid]
        for name in ("landing_view", "signup_started", "signup_completed"):
            require(len(events[name]) == 1, f"Missing/duplicate {name}")
        require(events["signup_completed"][0] == user["signup_at"], "Signup event mismatch")
        require(
            events["landing_view"][0] <= events["signup_started"][0] < user["signup_at"],
            "Signup ordering",
        )
        for before, after in (
            ("signup_completed", "onboarding_started"),
            ("onboarding_started", "onboarding_completed"),
            ("onboarding_completed", "core_action"),
            ("core_action", "subscription_started"),
            ("subscription_started", "subscription_cancelled"),
        ):
            if events[after]:
                require(
                    events[before] and min(events[before]) < min(events[after]),
                    f"Invalid lifecycle ordering: {before} / {after}",
                )
        for name in (
            "onboarding_started",
            "onboarding_completed",
            "subscription_started",
            "subscription_cancelled",
        ):
            require(len(events[name]) <= 1, f"Duplicate {name}")

    subscribed = set()
    billing_events = Counter()
    for sub in data.subscriptions:
        uid = sub["started_by_user_id"]
        require(sub["account_id"] in accounts and uid in users, "Orphan subscription")
        require(users[uid]["account_id"] == sub["account_id"], "Subscription owner mismatch")
        require(sub["account_id"] not in subscribed, "Duplicate account subscription")
        subscribed.add(sub["account_id"])
        require(
            sub["plan"] in ("pro", "business") and sub["monthly_value"] > 0, "Invalid plan/value"
        )
        require(sub["started_at"] >= users[uid]["signup_at"], "Subscription before signup")
        require(
            sub["cancelled_at"] is None or sub["cancelled_at"] > sub["started_at"],
            "Cancellation before subscription",
        )
        for event, key in (
            ("subscription_started", "started_at"),
            ("subscription_cancelled", "cancelled_at"),
        ):
            if sub[key] is not None:
                require(by_user[uid][event] == [sub[key]], "Billing event mismatch")
                billing_events[event] += 1
    for event in ("subscription_started", "subscription_cancelled"):
        require(
            sum(len(events[event]) for events in by_user.values()) == billing_events[event],
            "Unmatched billing event",
        )

    for experiment in data.experiments:
        require(experiment["started_at"] < experiment["ended_at"], "Invalid experiment window")
        require(experiment["status"] in ("planned", "running", "completed"), "Experiment status")
        require(experiment["primary_metric"] == "activation_within_7_days", "Invalid metric")
    assigned_users = set()
    for assignment in data.experiment_assignments:
        uid, eid = assignment["user_id"], assignment["experiment_id"]
        require(uid in users and eid in experiments, "Orphan assignment")
        require(uid not in assigned_users, "Overlapping experiments for user")
        assigned_users.add(uid)
        require(assignment["variant"] in VARIANTS, "Invalid variant")
        require(assignment["assigned_at"] == users[uid]["signup_at"], "Assignment after signup")
        require(
            experiments[eid]["started_at"]
            <= assignment["assigned_at"]
            < experiments[eid]["ended_at"],
            "Assignment outside experiment",
        )
        actions = by_user[uid]["core_action"]
        require(not actions or assignment["assigned_at"] < min(actions), "Assignment after outcome")
    require(assigned_users == set(users), "Missing experiment assignment")
    # Large seeds must actually cover the intended window and all lifecycle categories.
    if config.users >= 12000:
        times = [event["occurred_at"] for event in data.events]
        require(
            min(times) < config.start + timedelta(days=2)
            and max(times) > config.end - timedelta(days=2),
            "Insufficient date coverage",
        )
        require(
            set(event["event_name"] for event in data.events) == set(EVENTS),
            "Missing event categories",
        )
