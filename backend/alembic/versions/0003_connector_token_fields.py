"""add connector token/status fields

Revision ID: 0003_connector_token_fields
Revises: 0002_add_completed_at
Create Date: 2025-09-20
"""
from alembic import op
import sqlalchemy as sa

revision = '0003_connector_token_fields'
down_revision = '0002_add_completed_at'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure message column exists (already in initial) but keep placeholder for future alterations.
    # Add status_message if not exists (some providers may want separate user-facing message)
    with op.batch_alter_table('connectors') as batch:
        if not _has_column('connectors', 'status_message'):
            batch.add_column(sa.Column('status_message', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('connectors') as batch:
        if _has_column('connectors', 'status_message'):
            batch.drop_column('status_message')


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c['name'] for c in inspector.get_columns(table)]
    return column in cols
