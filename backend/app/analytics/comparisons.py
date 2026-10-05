from app.analytics.contracts import Comparison


def compare(current, previous) -> Comparison:
    if current is None or previous is None:
        return Comparison(
            current=current,
            previous=previous,
            absolute_change=None,
            relative_change=None,
            direction="unavailable",
        )
    change = current - previous
    return Comparison(
        current=current,
        previous=previous,
        absolute_change=change,
        relative_change=change / previous if previous else None,
        direction="up" if change > 0 else "down" if change < 0 else "flat",
    )


def comparisons(current, previous):
    return {key: compare(value, previous[key]) for key, value in current.items()}
