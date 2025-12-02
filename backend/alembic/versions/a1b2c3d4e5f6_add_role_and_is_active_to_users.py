"""Add role and is_active to users

Revision ID: a1b2c3d4e5f6
Revises: 9087b40beb09
Create Date: 2025-01-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9087b40beb09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add role column with default value 'user'
    op.add_column('users', sa.Column('role', sa.String(), nullable=False, server_default='user'))
    
    # Add is_active column with default value True
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))


def downgrade() -> None:
    # Remove the columns
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'role')

