from app.analytics.common import USER_FACTS, rows, segment_filter, segment_sql
from app.analytics.contracts import ActivationResponse, ActivationRow, Period


def activation_sql(query, cohort=False):
    cohort_expr = "date_trunc('week', u.signup_completed AT TIME ZONE 'UTC')::date"
    return f"""
    WITH {USER_FACTS}, eligible AS (
        SELECT u.*, {segment_sql(query)} AS segment,
               {cohort_expr if cohort else "NULL::date"} AS cohort_start,
               signup_completed + interval '7 days' <= :cutoff AS mature,
               first_action >= signup_completed
                   AND first_action < signup_completed + interval '7 days' AS activated
        FROM user_facts u
        WHERE signup_completed >= :start AND signup_completed < :end
          AND signup_completed >= :observed_start AND {segment_filter(query)}
    )
    SELECT segment, cohort_start, count(*) AS completed_signups,
           count(*) FILTER (WHERE mature) AS eligible_users,
           count(*) FILTER (WHERE NOT mature) AS censored_users,
           count(*) FILTER (WHERE mature AND activated) AS activated_users,
           count(*) FILTER (WHERE mature AND activated)::double precision
               / NULLIF(count(*) FILTER (WHERE mature), 0) AS activation_rate,
           percentile_cont(0.5) WITHIN GROUP (
               ORDER BY extract(epoch FROM first_action - signup_completed))
               FILTER (WHERE mature AND activated) AS median_activation_seconds
    FROM eligible GROUP BY segment, cohort_start ORDER BY segment, cohort_start
    """


def activation_groups(session, query, cohort=False):
    return [ActivationRow(**row) for row in rows(session, activation_sql(query, cohort), query)]


def activation(session, query):
    return ActivationResponse(
        period=Period.from_query(query),
        dimension=query.dimension,
        groups=activation_groups(session, query),
        cohorts=activation_groups(session, query, cohort=True),
    )


def signup_summary(session, query):
    sql = f"""
    WITH {USER_FACTS}
    SELECT count(*) FILTER (WHERE signup_started >= :start AND signup_started < :end)
               AS total_signups,
           count(*) FILTER (WHERE signup_completed >= :start AND signup_completed < :end)
               AS completed_signups,
           count(*) FILTER (WHERE signup_started >= :start AND signup_started < :end
                             AND signup_completed >= signup_started AND signup_completed < :end)
               ::double precision / NULLIF(count(*) FILTER (
                   WHERE signup_started >= :start AND signup_started < :end), 0)
               AS signup_completion_rate,
           count(*) FILTER (WHERE signup_completed >= :start AND signup_completed < :end
                              AND signup_completed + interval '7 days' <= :cutoff)
               AS eligible_users,
           count(*) FILTER (WHERE signup_completed >= :start AND signup_completed < :end
               AND signup_completed + interval '7 days' <= :cutoff
               AND first_action >= signup_completed
               AND first_action < signup_completed + interval '7 days')::double precision
               / NULLIF(count(*) FILTER (WHERE signup_completed >= :start
                   AND signup_completed < :end
                   AND signup_completed + interval '7 days' <= :cutoff), 0) AS activation_rate
    FROM user_facts u WHERE {segment_filter(query)}
    """
    result = rows(session, sql, query)[0]
    return result if query.complete else dict.fromkeys(result)
