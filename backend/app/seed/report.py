from collections import Counter

from app.seed.generator import Dataset


def sanity_report(data: Dataset) -> dict:
    return {
        "counts": {name: len(rows) for name, rows in vars(data).items()},
        "event_range": [
            min(e["occurred_at"] for e in data.events).isoformat(),
            max(e["occurred_at"] for e in data.events).isoformat(),
        ],
        "users_by_channel": dict(Counter(u["acquisition_channel"] for u in data.users)),
        "accounts_by_size": dict(Counter(a["company_size"] for a in data.accounts)),
        "users_by_country": dict(Counter(u["country"] for u in data.users)),
        "events_by_name": dict(Counter(e["event_name"] for e in data.events)),
        "users_with_core_action": len(
            {e["user_id"] for e in data.events if e["event_name"] == "core_action"}
        ),
        "subscriptions_by_plan": dict(Counter(s["plan"] for s in data.subscriptions)),
        "cancelled_subscriptions": sum(s["cancelled_at"] is not None for s in data.subscriptions),
        "assignments": dict(
            Counter(f"{a['experiment_id']}:{a['variant']}" for a in data.experiment_assignments)
        ),
    }
