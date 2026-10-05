"""create synthetic product warehouse"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "8831dde5f821"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("company_size", sa.String(length=20), nullable=False),
        sa.CheckConstraint(
            "company_size IN ('solo', 'smb', 'mid_market', 'enterprise')",
            name="ck_company_size_values",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "experiments",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False),
        sa.Column("primary_metric", sa.String(length=40), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('planned', 'running', 'completed')", name="ck_status_values"
        ),
        sa.CheckConstraint("ended_at > started_at", name="ck_experiment_order"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("signup_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("country", sa.String(length=30), nullable=False),
        sa.Column("acquisition_channel", sa.String(length=20), nullable=False),
        sa.Column("device_type", sa.String(length=10), nullable=False),
        sa.CheckConstraint(
            "acquisition_channel IN "
            "('organic', 'paid_search', 'paid_social', 'referral', 'partner')",
            name="ck_acquisition_channel_values",
        ),
        sa.CheckConstraint(
            "country IN ('United Kingdom', 'Germany', 'Spain', 'France', 'Netherlands')",
            name="ck_country_values",
        ),
        sa.CheckConstraint(
            "device_type IN ('desktop', 'mobile', 'tablet')", name="ck_device_type_values"
        ),
        sa.CheckConstraint("signup_at >= created_at", name="ck_user_signup_order"),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["accounts.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_account_id"), "users", ["account_id"], unique=False)
    op.create_index(op.f("ix_users_signup_at"), "users", ["signup_at"], unique=False)
    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger(), autoincrement=False, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(length=48), nullable=False),
        sa.Column("event_name", sa.String(length=30), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("properties", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.CheckConstraint(
            "event_name IN ('landing_view', 'signup_started', 'signup_completed', "
            "'onboarding_started', 'onboarding_completed', 'core_action', "
            "'subscription_started', 'subscription_cancelled')",
            name="ck_event_name_values",
        ),
        sa.CheckConstraint("jsonb_typeof(properties) = 'object'", name="ck_properties_object"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_events_name_time", "events", ["event_name", "occurred_at"], unique=False)
    op.create_index("ix_events_time", "events", ["occurred_at"], unique=False)
    op.create_index("ix_events_user_time", "events", ["user_id", "occurred_at"], unique=False)
    op.create_table(
        "experiment_assignments",
        sa.Column("experiment_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("variant", sa.String(length=12), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("variant IN ('control', 'treatment')", name="ck_variant_values"),
        sa.ForeignKeyConstraint(
            ["experiment_id"],
            ["experiments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("experiment_id", "user_id"),
    )
    op.create_index(
        op.f("ix_experiment_assignments_user_id"),
        "experiment_assignments",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("started_by_user_id", sa.Integer(), nullable=False),
        sa.Column("plan", sa.String(length=12), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("monthly_value", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.CheckConstraint("plan IN ('pro', 'business')", name="ck_plan_values"),
        sa.CheckConstraint("cancelled_at >= started_at", name="ck_subscription_order"),
        sa.CheckConstraint("monthly_value > 0", name="ck_subscription_value"),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["accounts.id"],
        ),
        sa.ForeignKeyConstraint(
            ["started_by_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id"),
    )
    op.create_index(
        op.f("ix_subscriptions_cancelled_at"), "subscriptions", ["cancelled_at"], unique=False
    )
    op.create_index(
        op.f("ix_subscriptions_started_at"), "subscriptions", ["started_at"], unique=False
    )


def downgrade():
    op.drop_index(op.f("ix_subscriptions_started_at"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_cancelled_at"), table_name="subscriptions")
    op.drop_table("subscriptions")
    op.drop_index(op.f("ix_experiment_assignments_user_id"), table_name="experiment_assignments")
    op.drop_table("experiment_assignments")
    op.drop_index("ix_events_user_time", table_name="events")
    op.drop_index("ix_events_time", table_name="events")
    op.drop_index("ix_events_name_time", table_name="events")
    op.drop_table("events")
    op.drop_index(op.f("ix_users_signup_at"), table_name="users")
    op.drop_index(op.f("ix_users_account_id"), table_name="users")
    op.drop_table("users")
    op.drop_table("experiments")
    op.drop_table("accounts")
