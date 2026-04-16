"""initial tables

Revision ID: 0001_init
Revises:
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email_encrypted", sa.String(), nullable=False),
        sa.Column("email_hash", sa.String(length=128), nullable=False, unique=True),
        sa.Column("phone_encrypted", sa.String(), nullable=True),
        sa.Column("name_encrypted", sa.String(), nullable=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("mfa_secret_encrypted", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_email_hash", "users", ["email_hash"], unique=True)

    op.create_table(
        "workflows",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("original_prompt", sa.Text(), nullable=False),
        sa.Column("intent_summary", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("priority", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "workflow_steps",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("workflow_id", sa.String(length=36), sa.ForeignKey("workflows.id"), nullable=False),
        sa.Column("step_order", sa.Integer(), nullable=False),
        sa.Column("step_name", sa.String(length=64), nullable=False),
        sa.Column("step_type", sa.String(length=64), nullable=False),
        sa.Column("depends_on_step_id", sa.String(length=36), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("input_payload", sa.Text(), nullable=True),
        sa.Column("output_payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("workflow_id", sa.String(length=36), sa.ForeignKey("workflows.id"), nullable=False),
        sa.Column("workflow_step_id", sa.String(length=36), sa.ForeignKey("workflow_steps.id"), nullable=False),
        sa.Column("queue_name", sa.String(length=64), nullable=False),
        sa.Column("worker_type", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False),
        sa.Column("max_retries", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=120), nullable=False, unique=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message_sanitized", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "execution_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("workflow_id", sa.String(length=36), sa.ForeignKey("workflows.id"), nullable=False),
        sa.Column("job_id", sa.String(length=36), sa.ForeignKey("jobs.id"), nullable=True),
        sa.Column("step_id", sa.String(length=36), nullable=True),
        sa.Column("level", sa.String(length=16), nullable=False),
        sa.Column("message_sanitized", sa.String(length=500), nullable=False),
        sa.Column("context_json", sa.Text(), nullable=True),
        sa.Column("trace_id", sa.String(length=64), nullable=True),
        sa.Column("span_id", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False, unique=True),
        sa.Column("jti", sa.String(length=64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("execution_logs")
    op.drop_table("jobs")
    op.drop_table("workflow_steps")
    op.drop_table("workflows")
    op.drop_index("ix_users_email_hash", table_name="users")
    op.drop_table("users")
