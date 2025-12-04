"""add_widget_message_cache_table

Revision ID: d1e2f3g4h5i6
Revises: c5d8e9f1a2b3
Create Date: 2025-12-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd1e2f3g4h5i6'
down_revision: Union[str, None] = 'd6e7f8a9b0c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Create widget_message_cache table for storing LLM-generated personalized widget messages.
    Messages are cached per (organization_id, segment, risk_level) combination with 7-day TTL.
    """
    op.create_table(
        'widget_message_cache',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('segment', sa.String(), nullable=False),
        sa.Column('risk_level', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('cta_text', sa.String(), nullable=False),
        sa.Column('cta_link', sa.String(), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),

        # Foreign key constraint
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),

        # Unique constraint for cache key
        sa.UniqueConstraint('organization_id', 'segment', 'risk_level', name='uq_org_segment_risk')
    )

    # Create indexes for faster lookups
    op.create_index(
        'ix_widget_message_cache_segment',
        'widget_message_cache',
        ['segment']
    )
    op.create_index(
        'ix_widget_message_cache_risk_level',
        'widget_message_cache',
        ['risk_level']
    )
    op.create_index(
        'ix_widget_message_cache_expires_at',
        'widget_message_cache',
        ['expires_at']
    )


def downgrade() -> None:
    """Drop widget_message_cache table."""
    op.drop_index('ix_widget_message_cache_expires_at', table_name='widget_message_cache')
    op.drop_index('ix_widget_message_cache_risk_level', table_name='widget_message_cache')
    op.drop_index('ix_widget_message_cache_segment', table_name='widget_message_cache')
    op.drop_table('widget_message_cache')
