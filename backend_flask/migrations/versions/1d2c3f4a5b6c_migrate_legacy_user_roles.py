"""migrate legacy user roles

Revision ID: 1d2c3f4a5b6c
Revises: f2407dfe7102
Create Date: 2026-04-16 16:40:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "1d2c3f4a5b6c"
down_revision = "f2407dfe7102"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET role = 'referring_provider'
            WHERE role = 'provider'
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET role = 'patient_scheduler'
            WHERE role = 'admin'
            """
        )
    )


def downgrade():
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET role = 'provider'
            WHERE role = 'referring_provider'
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET role = 'admin'
            WHERE role = 'patient_scheduler'
            """
        )
    )
