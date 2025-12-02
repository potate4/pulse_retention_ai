"""add_unique_constraint_to_customer_segments

Revision ID: c5d8e9f1a2b3
Revises: b4b707c0d9f8
Create Date: 2025-12-02 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5d8e9f1a2b3'
down_revision: Union[str, None] = 'b4b707c0d9f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add unique constraint on customer_id in customer_segments table.
    First, clean up any duplicate segments by keeping only the most recent one.
    """
    # Clean up duplicates before adding constraint
    connection = op.get_bind()

    # Find and delete duplicate segments, keeping only the most recent for each customer
    connection.execute(sa.text("""
        DELETE FROM customer_segments
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY customer_id
                           ORDER BY assigned_at DESC, id DESC
                       ) as row_num
                FROM customer_segments
            ) t
            WHERE row_num > 1
        )
    """))

    # Now add the unique constraint
    op.create_unique_constraint(
        'uq_customer_segments_customer_id',
        'customer_segments',
        ['customer_id']
    )


def downgrade() -> None:
    """Remove unique constraint from customer_segments table."""
    op.drop_constraint(
        'uq_customer_segments_customer_id',
        'customer_segments',
        type_='unique'
    )
