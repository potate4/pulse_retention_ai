"""change transactions customer_id to string

Revision ID: f2g3h4i5j6k7
Revises: e1f2g3h4i5j6
Create Date: 2024-12-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f2g3h4i5j6k7'
down_revision: Union[str, None] = 'e1f2g3h4i5j6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change customer_id from UUID to String in transactions table
    # Map from internal customer UUID to external_customer_id string

    # Step 1: Drop the foreign key constraint
    op.drop_constraint('transactions_customer_id_fkey', 'transactions', type_='foreignkey')

    # Step 2: Add a temporary column to store external_customer_id
    op.add_column('transactions', sa.Column('customer_id_temp', sa.String(), nullable=True))

    # Step 3: Populate the temporary column with external_customer_id from customers table
    op.execute("""
        UPDATE transactions t
        SET customer_id_temp = c.external_customer_id
        FROM customers c
        WHERE c.id = t.customer_id
    """)

    # Step 4: Drop the old customer_id column
    op.drop_column('transactions', 'customer_id')

    # Step 5: Rename the temporary column to customer_id
    op.alter_column('transactions', 'customer_id_temp', new_column_name='customer_id')

    # Step 6: Make customer_id NOT NULL
    op.alter_column('transactions', 'customer_id', nullable=False)


def downgrade() -> None:
    # Revert customer_id back to UUID in transactions table

    # Step 1: Add temporary UUID column
    op.add_column('transactions', sa.Column('customer_id_temp', postgresql.UUID(), nullable=True))

    # Step 2: Populate with customer.id by looking up external_customer_id
    op.execute("""
        UPDATE transactions t
        SET customer_id_temp = c.id
        FROM customers c
        WHERE c.external_customer_id = t.customer_id
    """)

    # Step 3: Drop the string customer_id column
    op.drop_column('transactions', 'customer_id')

    # Step 4: Rename temp column to customer_id
    op.alter_column('transactions', 'customer_id_temp', new_column_name='customer_id')

    # Step 5: Make customer_id NOT NULL
    op.alter_column('transactions', 'customer_id', nullable=False)

    # Step 6: Recreate foreign key
    op.create_foreign_key('transactions_customer_id_fkey', 'transactions', 'customers', ['customer_id'], ['id'], ondelete='CASCADE')

