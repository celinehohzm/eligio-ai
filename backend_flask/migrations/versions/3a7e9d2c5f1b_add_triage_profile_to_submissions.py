"""add triage profile to submissions

Revision ID: 3a7e9d2c5f1b
Revises: 8f2a1c4d9b7e
Create Date: 2026-06-19 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3a7e9d2c5f1b"
down_revision = "8f2a1c4d9b7e"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("submissions", schema=None) as batch_op:
        batch_op.add_column(sa.Column("triage_profile", sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table("submissions", schema=None) as batch_op:
        batch_op.drop_column("triage_profile")
