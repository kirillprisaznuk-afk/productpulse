from sqlalchemy import text

from app.analytics.contracts import AnalyticsQuery

# One row per user, despite repeated events. Explicit UTC date_trunc is used in query modules.
USER_FACTS = """
event_facts AS (
    SELECT user_id,
           min(occurred_at) FILTER (WHERE event_name = 'signup_started') AS signup_started,
           min(occurred_at) FILTER (WHERE event_name = 'signup_completed') AS signup_completed,
           min(occurred_at) FILTER (WHERE event_name = ANY(:active_events)) AS first_action
    FROM events WHERE occurred_at < :cutoff
      AND (event_name IN ('signup_started', 'signup_completed')
           OR event_name = ANY(:active_events))
    GROUP BY user_id
), user_facts AS (
    SELECT u.*, a.company_size, f.signup_started, f.signup_completed, f.first_action
    FROM users u JOIN accounts a ON a.id = u.account_id
    LEFT JOIN event_facts f ON f.user_id = u.id
)
"""


def segment_sql(query: AnalyticsQuery, alias="u") -> str:
    # Only an enum member can become a SQL identifier; values always remain bound parameters.
    return (
        f"COALESCE({alias}.{query.dimension.value}, 'unknown')"
        if query.dimension
        else "'all'::text"
    )


def segment_filter(query: AnalyticsQuery, alias="u") -> str:
    if query.segment_value is None:
        return "TRUE"
    return f"{segment_sql(query, alias)} = :segment_value"


def rows(session, sql, query):
    return [dict(row) for row in session.execute(text(sql), query.params()).mappings()]


def ratio(numerator, denominator):
    return numerator / denominator if denominator else None
