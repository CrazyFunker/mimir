"""add priority_factors column

Revision ID: 0004_add_priority_factors
Revises: 0003_connector_token_fields
Create Date: 2025-09-20
"""
from alembic import op
import sqlalchemy as sa

revision = '0004_add_priority_factors'
down_revision = '0003_connector_token_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tasks', sa.Column('priority_factors', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('tasks', 'priority_factors')
