"""add completed_at to tasks

Revision ID: 0002_add_completed_at
Revises: 0001_initial
Create Date: 2025-09-20
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_completed_at'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('tasks', 'completed_at')
