"""mfa email otp fields

Revision ID: 0003_mfa_email_otp
Revises: 0002_integrations
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_mfa_email_otp"
down_revision = "0002_integrations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("mfa_otp_hash", sa.String(length=128), nullable=True))
    op.add_column("users", sa.Column("mfa_otp_expires_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("mfa_otp_email_encrypted", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "mfa_otp_email_encrypted")
    op.drop_column("users", "mfa_otp_expires_at")
    op.drop_column("users", "mfa_otp_hash")
