from app.analytics.common import ratio, rows, segment_filter, segment_sql
from app.analytics.contracts import FUNNEL_STEPS, FunnelGroup, FunnelResponse, FunnelStage, Period


def funnel_sql(query):
    # Each lateral lookup chooses the first valid occurrence after its predecessor.
    # A missing stage makes every subsequent comparison NULL, preventing skipped stages.
    joins = []
    for index, event in enumerate(FUNNEL_STEPS):
        lower = "e.occurred_at >= :start" if index == 0 else f"e.occurred_at > s{index - 1}.at"
        upper = "e.occurred_at < :end AND" if index == 0 else ""
        joins.append(f"""
            LEFT JOIN LATERAL (
                SELECT min(e.occurred_at) AS at FROM events e
                WHERE e.user_id = u.id AND e.event_name = '{event}'
                  AND {lower} AND {upper} e.occurred_at < :cutoff
            ) s{index} ON TRUE
        """)
    columns = ", ".join(f"s{i}.at AS t{i}" for i in range(len(FUNNEL_STEPS)))
    values = ", ".join(
        f"({i}, t{i}, {'NULL::timestamptz' if i == 0 else f't{i - 1}'})"
        for i in range(len(FUNNEL_STEPS))
    )
    return f"""
    WITH paths AS (
        SELECT {segment_sql(query, "a" if query.dimension == "company_size" else "u")} AS segment,
               {columns}
        FROM users u JOIN accounts a ON a.id = u.account_id
        {" ".join(joins)}
        WHERE s0.at IS NOT NULL
          AND {segment_filter(query, "a" if query.dimension == "company_size" else "u")}
    )
    SELECT segment, v.step, count(v.at) AS users,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM v.at - v.previous))
               AS median_seconds_from_previous,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM t3 - t1))
               AS median_signup_to_onboarding_seconds,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM t4 - t1))
               AS median_signup_to_core_action_seconds,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM t5 - t4))
               AS median_core_action_to_paid_seconds
    FROM paths CROSS JOIN LATERAL (VALUES {values}) v(step, at, previous)
    GROUP BY segment, v.step ORDER BY segment, v.step
    """


def funnel(session, query):
    if not query.complete:
        return FunnelResponse(period=Period.from_query(query), dimension=query.dimension, groups=[])
    grouped = {}
    for row in rows(session, funnel_sql(query), query):
        grouped.setdefault(row["segment"], []).append(row)
    # Empty unsegmented window is an explicit zero-count funnel.
    if not grouped and query.dimension is None:
        grouped["all"] = [
            dict(
                step=i,
                users=0,
                median_seconds_from_previous=None,
                median_signup_to_onboarding_seconds=None,
                median_signup_to_core_action_seconds=None,
                median_core_action_to_paid_seconds=None,
            )
            for i in range(len(FUNNEL_STEPS))
        ]
    groups = []
    for segment, stages in grouped.items():
        initial = stages[0]["users"]
        previous = None
        results = []
        for row in stages:
            count = row["users"]
            dropped = previous - count if previous is not None else None
            results.append(
                FunnelStage(
                    event_name=FUNNEL_STEPS[row["step"]],
                    users=count,
                    conversion_from_previous=ratio(count, previous),
                    cumulative_conversion=ratio(count, initial),
                    drop_off_count=dropped,
                    drop_off_rate=ratio(dropped, previous),
                    median_seconds_from_previous=row["median_seconds_from_previous"],
                )
            )
            previous = count
        groups.append(
            FunnelGroup(
                segment=segment,
                stages=results,
                **{
                    key: stages[0][key]
                    for key in (
                        "median_signup_to_onboarding_seconds",
                        "median_signup_to_core_action_seconds",
                        "median_core_action_to_paid_seconds",
                    )
                },
            )
        )
    from app.analytics.insights import funnel_group, funnel_segments

    for group in groups:
        group.insights = funnel_group(group)
    return FunnelResponse(
        period=Period.from_query(query),
        dimension=query.dimension,
        groups=groups,
        insights=funnel_segments(groups),
    )
