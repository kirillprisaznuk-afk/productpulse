from app.analytics.common import USER_FACTS, rows, segment_filter, segment_sql
from app.analytics.comparisons import comparisons
from app.analytics.contracts import MonetizationResponse, MonetizationValues, Period


def monetization_sql(query, grouped=False):
    grouping = f"{segment_sql(query)} AS segment," if grouped else ""
    group_by = "GROUP BY segment ORDER BY segment" if grouped else ""
    return f"""
    WITH {USER_FACTS}, origins AS (
        SELECT DISTINCT ON (account_id) * FROM user_facts
        ORDER BY account_id, signup_completed NULLS LAST, id
    ), contracts AS (
        SELECT a.id, a.created_at, u.acquisition_channel, u.country, u.device_type,
               a.company_size, u.signup_completed AS origin, s.started_at, s.cancelled_at,
               s.monthly_value,
               s.started_at < :end AND (s.cancelled_at IS NULL OR s.cancelled_at >= :end)
                   AS active_at_end,
               s.started_at < :start AND (s.cancelled_at IS NULL OR s.cancelled_at >= :start)
                   AS active_at_start,
               (SELECT count(*) FROM users member WHERE member.account_id = a.id
                    AND member.signup_at < :end) AS member_count
        FROM accounts a LEFT JOIN origins u ON u.account_id = a.id
        LEFT JOIN subscriptions s ON s.account_id = a.id
        WHERE a.created_at < :cutoff
    )
    SELECT {grouping}
        count(*) FILTER (WHERE origin >= :start AND origin < :end
                         AND origin + interval '30 days' <= :cutoff) AS eligible_accounts,
        count(*) FILTER (WHERE origin >= :start AND origin < :end
                         AND origin + interval '30 days' > :cutoff) AS censored_accounts,
        count(*) FILTER (WHERE origin >= :start AND origin < :end
                         AND origin + interval '30 days' <= :cutoff
                         AND started_at >= origin AND started_at < origin + interval '30 days')
                         AS converted_accounts,
        count(*) FILTER (WHERE origin >= :start AND origin < :end
                         AND origin + interval '30 days' <= :cutoff
                         AND started_at >= origin AND started_at < origin + interval '30 days')
                         ::double precision / NULLIF(count(*) FILTER (
                             WHERE origin >= :start AND origin < :end
                             AND origin + interval '30 days' <= :cutoff), 0)
                             AS paid_conversion_rate,
        COALESCE(sum(member_count) FILTER (WHERE active_at_end), 0) AS paid_users,
        count(*) FILTER (WHERE active_at_end) AS active_subscriptions,
        COALESCE(sum(monthly_value) FILTER (WHERE active_at_end), 0) AS mrr,
        COALESCE(sum(monthly_value) FILTER (WHERE active_at_end), 0)::double precision
            / NULLIF(count(*) FILTER (WHERE created_at < :end), 0) AS arpu,
        COALESCE(sum(monthly_value) FILTER (WHERE started_at >= :start AND started_at < :end), 0)
            AS new_mrr,
        COALESCE(sum(monthly_value) FILTER (
            WHERE cancelled_at >= :start AND cancelled_at < :end), 0)
            AS churned_mrr,
        count(*) FILTER (WHERE active_at_start) AS opening_subscriptions,
        count(*) FILTER (WHERE cancelled_at >= :start AND cancelled_at < :end)
            AS churned_subscriptions,
        count(*) FILTER (WHERE active_at_start AND cancelled_at >= :start AND cancelled_at < :end)
            AS churned_opening_subscriptions,
        count(*) FILTER (WHERE active_at_start AND cancelled_at >= :start AND cancelled_at < :end)
            ::double precision / NULLIF(count(*) FILTER (WHERE active_at_start), 0) AS churn_rate
    FROM contracts u WHERE {segment_filter(query)} {group_by}
    """


def money_values(row, query):
    values = {k: row[k] for k in MonetizationValues.model_fields}
    return MonetizationValues(**(values if query.complete else dict.fromkeys(values)))


def monetization_summary(session, query):
    return money_values(rows(session, monetization_sql(query), query)[0], query)


def monetization_groups(session, query):
    return {
        row["segment"]: money_values(row, query)
        for row in rows(session, monetization_sql(query, grouped=True), query)
    }


def monetization(session, query):
    current = monetization_summary(session, query)
    previous = monetization_summary(session, query.previous())
    return MonetizationResponse(
        period=Period.from_query(query),
        previous_period=Period.from_query(query.previous()),
        dimension=query.dimension,
        segment_value=query.segment_value,
        current=current,
        comparisons=comparisons(current.model_dump(), previous.model_dump()),
    )
