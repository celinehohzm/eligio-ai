"""index submitted_at and use jsonb for triage_profile on postgres

Revision ID: 9c4e6b8a1d3f
Revises: 3a7e9d2c5f1b
Create Date: 2026-06-19 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "9c4e6b8a1d3f"
down_revision = "3a7e9d2c5f1b"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("submissions", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_submissions_submitted_at"), ["submitted_at"], unique=False
        )

    if op.get_bind().dialect.name == "postgresql":
        op.alter_column(
            "submissions",
            "triage_profile",
            existing_type=sa.JSON(),
            type_=postgresql.JSONB(astext_type=sa.Text()),
            postgresql_using="triage_profile::jsonb",
        )


def downgrade():
    if op.get_bind().dialect.name == "postgresql":
        op.alter_column(
            "submissions",
            "triage_profile",
            existing_type=postgresql.JSONB(astext_type=sa.Text()),
            type_=sa.JSON(),
        )

    with op.batch_alter_table("submissions", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_submissions_submitted_at"))
