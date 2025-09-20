"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2025-09-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(), nullable=True, unique=True),
        sa.Column('display_name', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        'connectors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('kind', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='disconnected'),
        sa.Column('scopes', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('last_checked', sa.DateTime(timezone=True), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('idx_connectors_user_kind', 'connectors', ['user_id', 'kind'])
    op.create_table(
        'tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('horizon', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='todo'),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('source_kind', sa.String(), nullable=True),
        sa.Column('source_ref', sa.String(), nullable=True),
        sa.Column('source_url', sa.String(), nullable=True),
        sa.Column('priority', sa.Float(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('idx_tasks_user_horizon_status', 'tasks', ['user_id', 'horizon', 'status', 'priority'])
    op.create_table(
        'task_links',
        sa.Column('parent', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id'), primary_key=True),
        sa.Column('child', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id'), primary_key=True),
        sa.Column('kind', sa.String(), nullable=False, server_default='relates_to'),
    )
    op.create_index('idx_task_links_parent', 'task_links', ['parent'])
    op.create_index('idx_task_links_child', 'task_links', ['child'])
    op.create_table(
        'events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('ts', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        'embeddings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_kind', sa.String(), nullable=True),
        sa.Column('source_id', sa.String(), nullable=True),
        sa.Column('vector_id', sa.String(), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('embeddings')
    op.drop_table('events')
    op.drop_index('idx_task_links_child', table_name='task_links')
    op.drop_index('idx_task_links_parent', table_name='task_links')
    op.drop_table('task_links')
    op.drop_index('idx_tasks_user_horizon_status', table_name='tasks')
    op.drop_table('tasks')
    op.drop_index('idx_connectors_user_kind', table_name='connectors')
    op.drop_table('connectors')
    op.drop_table('users')
