"""workflow display name

Revision ID: 0004_workflow_display_name
Revises: 0003_mfa_email_otp
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_workflow_display_name"
down_revision = "0003_mfa_email_otp"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("workflows", sa.Column("display_name", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("workflows", "display_name")

