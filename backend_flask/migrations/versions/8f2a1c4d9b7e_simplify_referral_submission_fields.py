"""simplify referral submission fields

Revision ID: 8f2a1c4d9b7e
Revises: 1d2c3f4a5b6c
Create Date: 2026-04-16 16:20:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8f2a1c4d9b7e"
down_revision = "1d2c3f4a5b6c"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("submissions", schema=None) as batch_op:
        batch_op.alter_column("age", existing_type=sa.String(length=20), nullable=True)
        batch_op.add_column(sa.Column("doctor_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("reason_for_referral", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("chief_complaint", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("evaluation", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("diagnosis", sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table("submissions", schema=None) as batch_op:
        batch_op.drop_column("diagnosis")
        batch_op.drop_column("evaluation")
        batch_op.drop_column("chief_complaint")
        batch_op.drop_column("reason_for_referral")
        batch_op.drop_column("doctor_name")
        batch_op.alter_column("age", existing_type=sa.String(length=20), nullable=False)
