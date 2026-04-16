"""integrations table

Revision ID: 0002_integrations
Revises: 0001_init
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_integrations"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "integrations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("credentials_encrypted", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_integrations_user_id", "integrations", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_integrations_user_id", table_name="integrations")
    op.drop_table("integrations")
