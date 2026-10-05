from app.analytics.common import USER_FACTS, rows, segment_filter, segment_sql
from app.analytics.contracts import Period, RetentionCell, RetentionCohort, RetentionResponse


def retention_sql(query):
    return f"""
    WITH {USER_FACTS}, members AS (
        SELECT u.id, u.signup_completed, {segment_sql(query)} AS segment,
               date_trunc('week', u.signup_completed AT TIME ZONE 'UTC')
                   AT TIME ZONE 'UTC' AS cohort
        FROM user_facts u
        WHERE u.signup_completed >= :start AND u.signup_completed < :end
          AND u.signup_completed >= :observed_start AND {segment_filter(query)}
    ), active_weeks AS (
        SELECT DISTINCT e.user_id,
               date_trunc('week', e.occurred_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS week
        FROM events e JOIN members m ON m.id = e.user_id
        WHERE e.event_name = ANY(:active_events) AND e.occurred_at < :cutoff
          AND e.occurred_at >= m.signup_completed
    ), grid AS (
        SELECT m.segment, m.cohort, n.week, count(*) AS cohort_size,
               m.cohort >= GREATEST(:start, :observed_start)
                   AND m.cohort + interval '7 days' <= LEAST(:end, :cutoff) AS complete_cohort,
               count(a.user_id) AS observed_active
        FROM members m CROSS JOIN generate_series(0, :max_weeks) n(week)
        LEFT JOIN active_weeks a ON a.user_id = m.id
            AND a.week = m.cohort + n.week * interval '7 days'
        GROUP BY m.segment, m.cohort, n.week
    ), availability AS (
        SELECT *, complete_cohort AND cohort + (week + 1) * interval '7 days' <= :cutoff
               AS observable FROM grid
    )
    SELECT segment, (cohort AT TIME ZONE 'UTC')::date AS cohort_start, cohort_size,
           complete_cohort, week, observable,
           CASE WHEN observable THEN observed_active END AS active_users,
           CASE WHEN observable THEN observed_active::double precision / cohort_size END
               AS retention_rate
    FROM availability ORDER BY segment, cohort, week
    """


def retention(session, query):
    groups = {}
    for row in rows(session, retention_sql(query), query):
        key = (row["segment"], row["cohort_start"])
        if key not in groups:
            groups[key] = RetentionCohort(
                segment=row["segment"],
                cohort_start=row["cohort_start"],
                cohort_size=row["cohort_size"],
                complete_cohort=row["complete_cohort"],
                periods=[],
            )
        groups[key].periods.append(
            RetentionCell(
                **{k: row[k] for k in ("week", "observable", "active_users", "retention_rate")}
            )
        )
    return RetentionResponse(
        period=Period.from_query(query), dimension=query.dimension, cohorts=list(groups.values())
    )
