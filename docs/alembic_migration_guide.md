# Alembic Migration Guide for Churn V2

## Overview

This guide will help you create and run the database migration for Churn V2.

---

## Step 1: Review Changes Needed

The migration will:

1. **Create new table:** `datasets`
2. **Update table:** `model_metadata` (add new columns)

---

## Step 2: Auto-Generate Migration

```bash
cd backend

# Generate migration
alembic revision --autogenerate -m "Add churn v2 - datasets table and model_metadata updates"
```

This will create a new file in `backend/alembic/versions/` with a name like:
```
xxxx_add_churn_v2_datasets_table_and_model_metadata_updates.py
```

---

## Step 3: Review Generated Migration

Open the generated migration file and verify it contains:

### Expected Upgrade Operations

```python
def upgrade():
    # Create datasets table
    op.create_table('datasets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dataset_type', sa.String(), nullable=False),
        sa.Column('file_url', sa.String(), nullable=False),
        sa.Column('bucket_name', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('has_churn_label', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_datasets_id'), 'datasets', ['id'], unique=False)
    op.create_index(op.f('ix_datasets_organization_id'), 'datasets', ['organization_id'], unique=False)

    # Add new columns to model_metadata
    op.add_column('model_metadata', sa.Column('model_type', sa.String(), nullable=True))
    op.add_column('model_metadata', sa.Column('status', sa.String(), nullable=False, server_default='training'))
    op.add_column('model_metadata', sa.Column('error_message', sa.String(), nullable=True))
    op.add_column('model_metadata', sa.Column('f1_score', sa.Numeric(precision=5, scale=4), nullable=True))
    op.add_column('model_metadata', sa.Column('training_samples', sa.Integer(), nullable=True))
    op.add_column('model_metadata', sa.Column('churn_rate', sa.Numeric(precision=5, scale=4), nullable=True))
```

### Expected Downgrade Operations

```python
def downgrade():
    # Remove columns from model_metadata
    op.drop_column('model_metadata', 'churn_rate')
    op.drop_column('model_metadata', 'training_samples')
    op.drop_column('model_metadata', 'f1_score')
    op.drop_column('model_metadata', 'error_message')
    op.drop_column('model_metadata', 'status')
    op.drop_column('model_metadata', 'model_type')

    # Drop datasets table
    op.drop_index(op.f('ix_datasets_organization_id'), table_name='datasets')
    op.drop_index(op.f('ix_datasets_id'), table_name='datasets')
    op.drop_table('datasets')
```

---

## Step 4: Apply Migration

```bash
# Apply the migration
alembic upgrade head
```

You should see output like:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade xxx -> yyy, Add churn v2 - datasets table and model_metadata updates
```

---

## Step 5: Verify Migration

### Check Tables Exist

```sql
-- Connect to your database
psql -U your_user -d pulse_retention

-- List tables
\dt

-- Should see:
-- datasets
-- model_metadata
-- (and other existing tables)

-- Describe datasets table
\d datasets

-- Describe model_metadata table
\d model_metadata
```

### Verify Columns

```sql
-- Check datasets table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'datasets';

-- Check model_metadata new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'model_metadata'
AND column_name IN ('model_type', 'status', 'error_message', 'f1_score', 'training_samples', 'churn_rate');
```

---

## Troubleshooting

### Issue: Migration Already Exists

If you see an error about duplicate tables/columns:

```bash
# Check current migration version
alembic current

# Rollback one version
alembic downgrade -1

# Re-apply
alembic upgrade head
```

### Issue: "Table already exists"

If `datasets` table was manually created:

Option 1: Drop the table and re-run migration
```sql
DROP TABLE datasets CASCADE;
```

Option 2: Mark migration as applied without running it
```bash
alembic stamp head
```

### Issue: Column conflicts in model_metadata

If columns were manually added:

```sql
-- Check which columns exist
\d model_metadata

-- Drop conflicting columns
ALTER TABLE model_metadata DROP COLUMN IF EXISTS model_type;
ALTER TABLE model_metadata DROP COLUMN IF EXISTS status;
-- etc.

-- Then re-run migration
alembic upgrade head
```

---

## Manual Migration (If Auto-Generate Fails)

If auto-generate doesn't work, create migration manually:

```bash
alembic revision -m "Add churn v2 tables"
```

Then edit the generated file:

```python
"""Add churn v2 tables

Revision ID: xxxx
Revises: yyyy
Create Date: 2024-12-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'xxxx'
down_revision = 'yyyy'  # Previous migration
branch_labels = None
depends_on = None


def upgrade():
    # Create datasets table
    op.create_table(
        'datasets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dataset_type', sa.String(), nullable=False),
        sa.Column('file_url', sa.String(), nullable=False),
        sa.Column('bucket_name', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('has_churn_label', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_datasets_id', 'datasets', ['id'])
    op.create_index('ix_datasets_organization_id', 'datasets', ['organization_id'])

    # Add columns to model_metadata
    op.add_column('model_metadata', sa.Column('model_type', sa.String(), nullable=True))
    op.add_column('model_metadata', sa.Column('status', sa.String(), nullable=False, server_default='training'))
    op.add_column('model_metadata', sa.Column('error_message', sa.String(), nullable=True))
    op.add_column('model_metadata', sa.Column('f1_score', sa.Numeric(precision=5, scale=4), nullable=True))
    op.add_column('model_metadata', sa.Column('training_samples', sa.Integer(), nullable=True))
    op.add_column('model_metadata', sa.Column('churn_rate', sa.Numeric(precision=5, scale=4), nullable=True))


def downgrade():
    # Drop new columns from model_metadata
    op.drop_column('model_metadata', 'churn_rate')
    op.drop_column('model_metadata', 'training_samples')
    op.drop_column('model_metadata', 'f1_score')
    op.drop_column('model_metadata', 'error_message')
    op.drop_column('model_metadata', 'status')
    op.drop_column('model_metadata', 'model_type')

    # Drop datasets table
    op.drop_index('ix_datasets_organization_id', table_name='datasets')
    op.drop_index('ix_datasets_id', table_name='datasets')
    op.drop_table('datasets')
```

---

## Post-Migration Checklist

- [ ] Migration created successfully
- [ ] Migration file reviewed
- [ ] Migration applied (`alembic upgrade head`)
- [ ] `datasets` table exists
- [ ] `model_metadata` has new columns
- [ ] No errors in migration output
- [ ] Can insert test data into `datasets`
- [ ] API server starts without errors

---

## Next Steps

After successful migration:

1. Update `app/db/base.py` if needed to import new models
2. Restart your FastAPI server
3. Test the API endpoints
4. Create test organization if needed
5. Upload sample CSV and test workflow

---

## Rollback (If Needed)

If you need to undo the migration:

```bash
# Rollback one version
alembic downgrade -1

# Or rollback to specific version
alembic downgrade <revision_id>

# Or rollback all migrations
alembic downgrade base
```

---

## Reference: Alembic Commands

```bash
# Show current version
alembic current

# Show migration history
alembic history

# Show pending migrations
alembic heads

# Upgrade to specific version
alembic upgrade <revision_id>

# Downgrade to specific version
alembic downgrade <revision_id>

# Create empty migration
alembic revision -m "description"

# Auto-generate migration
alembic revision --autogenerate -m "description"

# Show SQL without executing
alembic upgrade head --sql

# Stamp database with version (without running migration)
alembic stamp head
```

---

## Database Backup (Recommended)

Before running migrations in production:

```bash
# PostgreSQL backup
pg_dump -U your_user pulse_retention > backup_before_churn_v2.sql

# Restore if needed
psql -U your_user pulse_retention < backup_before_churn_v2.sql
```

---

Good luck with your migration! 🚀
