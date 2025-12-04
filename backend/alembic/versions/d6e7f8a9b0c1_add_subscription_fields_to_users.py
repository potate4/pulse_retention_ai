"""Add subscription fields to users

Revision ID: d6e7f8a9b0c1
Revises: c5d8e9f1a2b3
Create Date: 2025-12-03 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd6e7f8a9b0c1'
down_revision: Union[str, None] = 'f2g3h4i5j6k7'  # Latest migration: change_transactions_customer_id_to_string
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add subscription fields to users table
    op.add_column('users', sa.Column('subscription_plan', sa.String(), nullable=True))
    op.add_column('users', sa.Column('subscription_status', sa.String(), nullable=True))
    op.add_column('users', sa.Column('subscription_start_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('subscription_end_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('billing_cycle', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove subscription fields from users table
    op.drop_column('users', 'billing_cycle')
    op.drop_column('users', 'subscription_end_date')
    op.drop_column('users', 'subscription_start_date')
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'subscription_plan')

