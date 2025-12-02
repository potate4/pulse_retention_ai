"""change customer_id to string in segments and behavior

Revision ID: e1f2g3h4i5j6
Revises: 8ad6670603fd
Create Date: 2024-12-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e1f2g3h4i5j6'
down_revision: Union[str, None] = '8ad6670603fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change customer_id from UUID to String in customer_segments table
    # Map from internal customer UUID to external_customer_id using churn_predictions

    # customer_segments table
    op.drop_constraint('customer_segments_customer_id_fkey', 'customer_segments', type_='foreignkey')
    op.add_column('customer_segments', sa.Column('customer_id_temp', sa.String(), nullable=True))
    op.execute("""
        UPDATE customer_segments cs
        SET customer_id_temp = c.external_customer_id
        FROM customers c
        WHERE c.id = cs.customer_id
    """)
    op.drop_column('customer_segments', 'customer_id')
    op.alter_column('customer_segments', 'customer_id_temp', new_column_name='customer_id')
    op.alter_column('customer_segments', 'customer_id', nullable=False)

    # behavior_analysis table
    op.drop_constraint('behavior_analysis_customer_id_fkey', 'behavior_analysis', type_='foreignkey')
    op.add_column('behavior_analysis', sa.Column('customer_id_temp', sa.String(), nullable=True))
    op.execute("""
        UPDATE behavior_analysis ba
        SET customer_id_temp = c.external_customer_id
        FROM customers c
        WHERE c.id = ba.customer_id
    """)
    op.drop_column('behavior_analysis', 'customer_id')
    op.alter_column('behavior_analysis', 'customer_id_temp', new_column_name='customer_id')
    op.alter_column('behavior_analysis', 'customer_id', nullable=False)


def downgrade() -> None:
    # Revert customer_id back to UUID in behavior_analysis table
    op.alter_column('behavior_analysis', 'customer_id',
                    existing_type=sa.String(),
                    type_=postgresql.UUID(),
                    existing_nullable=False,
                    postgresql_using='customer_id::uuid')
    op.create_foreign_key('behavior_analysis_customer_id_fkey', 'behavior_analysis', 'customers', ['customer_id'], ['id'], ondelete='CASCADE')
    
    # Revert customer_id back to UUID in customer_segments table
    op.alter_column('customer_segments', 'customer_id',
                    existing_type=sa.String(),
                    type_=postgresql.UUID(),
                    existing_nullable=False,
                    postgresql_using='customer_id::uuid')
    op.create_foreign_key('customer_segments_customer_id_fkey', 'customer_segments', 'customers', ['customer_id'], ['id'], ondelete='CASCADE')

