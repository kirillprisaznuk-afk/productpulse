"""Pure, descriptive rules over existing aggregates. No database access or inference."""

from datetime import timedelta

from app.analytics.contracts import Insight

MIN_USERS = 100
RATE_CHANGE = 0.02
SEGMENT_GAP = 0.05
RELATIVE_CHANGE = 0.05
RETENTION_CHANGE = 0.03


def name(value):
    return value.replace("_", " ").capitalize()


def ranked(items):
    return sorted(items, key=lambda i: (i.priority, i.rule, i.segment or ""))


def changes(metrics):
    result = []
    specs = [
        ("activation_rate", "Activation", RATE_CHANGE, True, False, "/segments"),
        ("mau", "Monthly active users", RELATIVE_CHANGE, False, False, "/"),
        ("mrr", "MRR", RELATIVE_CHANGE, False, False, "/"),
        ("churn_rate", "Subscription churn", 0.01, True, True, "/segments"),
    ]
    for key, title, threshold, rate, lower_better, destination in specs:
        metric = metrics.get(key)
        if metric is None or metric.current is None or metric.previous is None:
            continue
        delta = metric.absolute_change if rate else metric.relative_change
        if delta is None or abs(delta) + 1e-12 < threshold:
            continue
        worse = delta > 0 if lower_better else delta < 0
        unit = "pp" if rate else "% relative"
        result.append(
            Insight(
                rule=f"change.{key}",
                severity="warning" if worse else "information",
                priority=20 if worse else 70,
                category="change",
                metric=key,
                message=f"{title} {'rose' if delta > 0 else 'fell'} {abs(delta) * 100:.1f} {unit} "
                "versus the previous equal-length period.",
                evidence={
                    "current": metric.current,
                    "previous": metric.previous,
                    "change": delta,
                    "materiality_threshold": threshold,
                    "unit": "rate_fraction" if rate else "relative_fraction",
                },
                destination=destination,
            )
        )
    return ranked(result)


def funnel_group(group):
    stages = group.stages
    if not stages or stages[0].users < MIN_USERS:
        return []
    result = []
    for field, title in [
        ("drop_off_count", "Largest absolute drop-off"),
        ("drop_off_rate", "Largest proportional drop-off"),
    ]:
        candidates = [s for s in stages if getattr(s, field) is not None]
        if not candidates:
            continue
        stage = max(candidates, key=lambda s: getattr(s, field))
        value = getattr(stage, field)
        if value <= 0:
            continue
        display = f"{value:,} users" if field == "drop_off_count" else f"{value * 100:.1f}%"
        result.append(
            Insight(
                rule=f"funnel.{field}",
                severity="warning",
                priority=30,
                category="funnel",
                metric=stage.event_name,
                segment=group.segment,
                message=f"{title}: {name(stage.event_name)} ({display}).",
                evidence={"value": value, "entrants": stages[0].users, "minimum_users": MIN_USERS},
                destination="/funnels",
            )
        )
    transitions = [
        (stages[i - 1], s)
        for i, s in enumerate(stages)
        if i > 0 and s.users >= MIN_USERS and s.median_seconds_from_previous is not None
    ]
    if transitions:
        previous, slowest = max(transitions, key=lambda pair: pair[1].median_seconds_from_previous)
        seconds = slowest.median_seconds_from_previous
        if seconds >= 3600:
            result.append(
                Insight(
                    rule="funnel.slowest",
                    severity="information",
                    priority=75,
                    category="funnel",
                    metric=slowest.event_name,
                    segment=group.segment,
                    message=f"Slowest stage transition: {name(previous.event_name)} → "
                    f"{name(slowest.event_name)}, median {seconds / 3600:.1f} hours.",
                    evidence={
                        "median_seconds": seconds,
                        "reached_users": slowest.users,
                        "minimum_users": MIN_USERS,
                        "minimum_seconds": 3600,
                    },
                    destination="/funnels",
                    caveat="Among users reaching both ordered stages; "
                    "this is elapsed time, not proof of friction.",
                )
            )
    return result


def funnel_segments(groups):
    eligible = [
        g
        for g in groups
        if g.stages
        and g.stages[0].users >= MIN_USERS
        and g.stages[-1].cumulative_conversion is not None
    ]
    if len(eligible) < 2:
        return []
    best = max(eligible, key=lambda g: g.stages[-1].cumulative_conversion)
    worst = min(eligible, key=lambda g: g.stages[-1].cumulative_conversion)
    gap = best.stages[-1].cumulative_conversion - worst.stages[-1].cumulative_conversion
    if gap + 1e-12 < RATE_CHANGE:
        return []
    return [
        Insight(
            rule="funnel.segment_gap",
            severity="information",
            priority=65,
            category="funnel",
            metric="end_to_end_conversion",
            segment=worst.segment,
            message=f"{name(best.segment)} reaches paid at a rate {gap * 100:.1f} pp above "
            f"{name(worst.segment)} in this entry window.",
            evidence={
                "best_segment": best.segment,
                "best_rate": best.stages[-1].cumulative_conversion,
                "other_segment": worst.segment,
                "other_rate": worst.stages[-1].cumulative_conversion,
                "gap": gap,
                "materiality_threshold": RATE_CHANGE,
                "minimum_users": MIN_USERS,
            },
            destination="/funnels",
        )
    ]


def segment_findings(groups):
    eligible = sum(g.activation.eligible_users for g in groups)
    signups = sum(g.activation.completed_signups for g in groups)
    if eligible < MIN_USERS or not signups:
        return []
    overall = sum(g.activation.activated_users for g in groups) / eligible
    result = []
    for g in groups:
        a = g.activation
        if a.eligible_users < MIN_USERS or a.activation_rate is None:
            continue
        gap = a.activation_rate - overall
        share = a.completed_signups / signups
        high_volume_weak = share >= 0.2 and gap <= -SEGMENT_GAP + 1e-12
        low_volume_strong = share <= 0.2 and gap >= SEGMENT_GAP - 1e-12
        if not (high_volume_weak or low_volume_strong):
            continue
        result.append(
            Insight(
                rule="segment.volume_quality",
                severity="warning" if high_volume_weak else "opportunity",
                priority=25 if high_volume_weak else 65,
                category="segment",
                metric="activation_rate",
                segment=g.segment,
                destination="/segments",
                message=f"{name(g.segment)} represents {share * 100:.1f}% of signups; "
                "activation is "
                f"{abs(gap) * 100:.1f} pp {'below' if gap < 0 else 'above'} the overall rate.",
                evidence={
                    "rate": a.activation_rate,
                    "overall_rate": overall,
                    "gap": gap,
                    "signup_share": share,
                    "eligible_users": a.eligible_users,
                    "materiality_threshold": SEGMENT_GAP,
                    "share_boundary": 0.2,
                    "minimum_users": MIN_USERS,
                },
            )
        )
    return ranked(result)


def retention_findings(cohorts):
    # Week 4 is fixed before viewing outcomes. No mixing of ages or incomplete cohorts.
    by_segment = {}
    for c in cohorts:
        cell = next((p for p in c.periods if p.week == 4 and p.observable), None)
        if (
            c.complete_cohort
            and c.cohort_size >= MIN_USERS
            and cell
            and cell.retention_rate is not None
        ):
            by_segment.setdefault(c.segment, []).append((c, cell.retention_rate))
    result = []
    for segment, values in by_segment.items():
        values.sort(key=lambda pair: pair[0].cohort_start)
        if len(values) >= 3:
            recent = values[-3:]
            rates = [rate for _, rate in recent]
            delta = rates[-1] - rates[0]
            adjacent = all(
                recent[i][0].cohort_start - recent[i - 1][0].cohort_start == timedelta(days=7)
                for i in (1, 2)
            )
            monotone = rates[0] < rates[1] < rates[2] or rates[0] > rates[1] > rates[2]
            if adjacent and monotone and abs(delta) + 1e-12 >= RETENTION_CHANGE:
                result.append(
                    Insight(
                        rule="retention.trend",
                        severity="warning" if delta < 0 else "opportunity",
                        priority=40 if delta < 0 else 65,
                        category="retention",
                        metric="week_4_retention",
                        segment=segment,
                        destination="/retention",
                        message=f"Week 4 retention {'declined' if delta < 0 else 'improved'} "
                        f"{abs(delta) * 100:.1f} pp across the last three eligible mature cohorts.",
                        evidence={
                            "first_cohort": str(recent[0][0].cohort_start),
                            "middle_cohort": str(recent[1][0].cohort_start),
                            "last_cohort": str(recent[2][0].cohort_start),
                            "first_rate": rates[0],
                            "middle_rate": rates[1],
                            "last_rate": rates[2],
                            "change": delta,
                            "materiality_threshold": RETENTION_CHANGE,
                            "minimum_users": MIN_USERS,
                        },
                    )
                )
        if len(values) >= 2:
            best = max(values, key=lambda pair: pair[1])
            worst = min(values, key=lambda pair: pair[1])
            if best[1] - worst[1] + 1e-12 >= RETENTION_CHANGE:
                result.append(
                    Insight(
                        rule="retention.range",
                        severity="information",
                        priority=80,
                        category="retention",
                        metric="week_4_retention",
                        segment=segment,
                        message=f"Best mature Week 4 cohort: {best[0].cohort_start} "
                        f"({best[1] * 100:.1f}%). "
                        f"Weakest: {worst[0].cohort_start} ({worst[1] * 100:.1f}%).",
                        evidence={
                            "best_cohort": str(best[0].cohort_start),
                            "best_rate": best[1],
                            "weakest_cohort": str(worst[0].cohort_start),
                            "weakest_rate": worst[1],
                            "materiality_threshold": RETENTION_CHANGE,
                            "minimum_users": MIN_USERS,
                        },
                        destination="/retention",
                    )
                )
    by_date = {}
    for values in by_segment.values():
        for cohort, rate in values:
            by_date.setdefault(cohort.cohort_start, []).append((cohort, rate))
    for cohort_date, values in by_date.items():
        if len(values) < 2:
            continue
        best, worst = max(values, key=lambda v: v[1]), min(values, key=lambda v: v[1])
        gap = best[1] - worst[1]
        if gap + 1e-12 >= SEGMENT_GAP:
            result.append(
                Insight(
                    rule="retention.segment_gap",
                    severity="information",
                    priority=65,
                    category="retention",
                    metric="week_4_retention",
                    cohort_start=cohort_date,
                    message=f"For the {cohort_date} cohort, {name(best[0].segment)} "
                    "Week 4 retention "
                    f"is {gap * 100:.1f} pp above {name(worst[0].segment)}.",
                    evidence={
                        "best_segment": best[0].segment,
                        "best_rate": best[1],
                        "other_segment": worst[0].segment,
                        "other_rate": worst[1],
                        "gap": gap,
                        "minimum_users": MIN_USERS,
                        "materiality_threshold": SEGMENT_GAP,
                    },
                    destination="/retention",
                )
            )
    return ranked(result)
