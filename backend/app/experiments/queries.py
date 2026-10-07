"""SQL constructs ITT populations; Python receives per-experiment variant aggregates."""

from datetime import UTC, datetime

from sqlalchemy import text

from app.analytics.contracts import OBSERVATION_START

LIST_SQL = """
SELECT e.*, count(a.user_id) FILTER (WHERE a.variant = 'control') AS control,
       count(a.user_id) FILTER (WHERE a.variant = 'treatment') AS treatment
FROM experiments e LEFT JOIN experiment_assignments a
    ON a.experiment_id = e.id AND a.assigned_at < :cutoff
GROUP BY e.id ORDER BY e.id
"""

POPULATION_SQL = """
WITH outcomes AS (
    SELECT user_id,
           min(occurred_at) FILTER (WHERE event_name = 'signup_completed') AS signup_completed,
           min(occurred_at) FILTER (WHERE event_name = 'core_action') AS first_action
    FROM events
    WHERE event_name IN ('signup_completed', 'core_action') AND occurred_at < :cutoff
    GROUP BY user_id
), population AS (
    SELECT a.experiment_id, a.user_id, a.variant, a.assigned_at, u.signup_at,
           a.assigned_at >= e.started_at AND a.assigned_at < e.ended_at
               AND a.assigned_at >= :observed_start AS timing_valid,
           f.signup_completed = u.signup_at AND a.assigned_at = u.signup_at AS signup_valid,
           f.first_action,
           f.first_action <= a.assigned_at AS pre_assignment_outcome
    FROM experiment_assignments a JOIN experiments e ON e.id = a.experiment_id
    JOIN users u ON u.id = a.user_id
    LEFT JOIN outcomes f ON f.user_id = a.user_id
    WHERE (CAST(:experiment_id AS integer) IS NULL OR a.experiment_id = :experiment_id)
      AND a.assigned_at < :cutoff
), checked AS (
    SELECT *, timing_valid AND COALESCE(signup_valid, false)
        AND NOT COALESCE(pre_assignment_outcome, false) AS valid,
        assigned_at + interval '7 days' <= :cutoff AS mature
    FROM population
)
SELECT experiment_id, variant, count(*) AS assigned,
       count(*) FILTER (WHERE valid AND mature) AS mature,
       count(*) FILTER (WHERE valid AND NOT mature) AS censored,
       count(*) FILTER (WHERE NOT valid) AS invalid,
       count(*) FILTER (WHERE valid AND mature AND first_action > assigned_at
           AND first_action < signup_at + interval '7 days') AS conversions,
       count(*) FILTER (WHERE NOT timing_valid) AS invalid_assignment_timing,
       count(*) FILTER (WHERE NOT COALESCE(signup_valid, false)) AS missing_or_mismatched_signup,
       count(*) FILTER (WHERE pre_assignment_outcome) AS pre_assignment_outcomes
FROM checked GROUP BY experiment_id, variant ORDER BY experiment_id, variant
"""


def params(query, experiment_id=None):
    return {
        "cutoff": datetime.combine(query.as_of, datetime.min.time(), UTC),
        "observed_start": datetime.combine(OBSERVATION_START, datetime.min.time(), UTC),
        "experiment_id": experiment_id,
    }


def list_rows(session, query):
    return [dict(row) for row in session.execute(text(LIST_SQL), params(query)).mappings()]


def metadata(session, experiment_id):
    row = (
        session.execute(text("SELECT * FROM experiments WHERE id = :id"), {"id": experiment_id})
        .mappings()
        .one_or_none()
    )
    return dict(row) if row else None


def population(session, query, experiment_id):
    return [
        dict(row)
        for row in session.execute(text(POPULATION_SQL), params(query, experiment_id)).mappings()
    ]
