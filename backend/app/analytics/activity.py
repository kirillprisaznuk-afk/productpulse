from app.analytics.common import ratio, rows, segment_filter
from app.analytics.comparisons import comparisons
from app.analytics.contracts import ActivityPoint, ActivityResponse, Period


def activity_sql(query):
    return f"""
    WITH days AS (
        SELECT generate_series(CAST(:start AS timestamptz),
                               CAST(:end AS timestamptz) - interval '1 day',
                               interval '1 day') AS day
    ), user_days AS (
        SELECT DISTINCT e.user_id,
               date_trunc('day', e.occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS day
        FROM events e JOIN users u ON u.id = e.user_id
        JOIN accounts a ON a.id = u.account_id
        WHERE e.event_name = ANY(:active_events)
          AND e.occurred_at >= CAST(:start AS timestamptz) - interval '29 days'
          AND e.occurred_at < LEAST(:end, :cutoff)
          AND {segment_filter(query, "a" if query.dimension == "company_size" else "u")}
    )
    SELECT (d.day AT TIME ZONE 'UTC')::date AS date,
        CASE WHEN d.day >= :observed_start AND d.day + interval '1 day' <= :cutoff
             THEN count(DISTINCT u.user_id) FILTER (WHERE u.day = d.day) END AS dau,
        CASE WHEN d.day - interval '6 days' >= :observed_start
                   AND d.day + interval '1 day' <= :cutoff
             THEN count(DISTINCT u.user_id)
                  FILTER (WHERE u.day >= d.day - interval '6 days') END AS wau,
        CASE WHEN d.day - interval '29 days' >= :observed_start
                   AND d.day + interval '1 day' <= :cutoff
             THEN count(DISTINCT u.user_id) END AS mau
    FROM days d LEFT JOIN user_days u ON u.day BETWEEN d.day - interval '29 days' AND d.day
    GROUP BY d.day ORDER BY d.day
    """


def series(session, query):
    result = []
    for row in rows(session, activity_sql(query), query):
        row["dau_mau"] = ratio(row["dau"], row["mau"]) if row["dau"] is not None else None
        row["wau_mau"] = ratio(row["wau"], row["mau"]) if row["wau"] is not None else None
        result.append(ActivityPoint(**row))
    return result


def snapshot(session, query):
    from datetime import timedelta

    last_day = query.model_copy(update={"start_date": query.end_date - timedelta(days=1)})
    point = series(session, last_day)[0]
    return point.model_dump(exclude={"date"})


def activity(session, query):
    points = series(session, query)
    current = points[-1].model_dump(exclude={"date"})
    previous = snapshot(session, query.previous())
    return ActivityResponse(
        period=Period.from_query(query),
        previous_period=Period.from_query(query.previous()),
        dimension=query.dimension,
        segment_value=query.segment_value,
        series=points,
        comparisons=comparisons(current, previous),
    )
