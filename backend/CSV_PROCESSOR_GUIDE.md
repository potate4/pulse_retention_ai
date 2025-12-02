# CSV Processor - Complete Guide

## Overview

The `csv_processor.py` module provides a flexible, operation-based approach to preprocessing datasets for churn prediction. It uses a **mapping-based API** where you specify transformations as a list of operations.

**Key Features:**
- ✅ Operation-based API (no hardcoded logic)
- ✅ Works for any dataset structure
- ✅ Automatic validation and cleaning
- ✅ Handles dates, types, and mathematical operations
- ✅ Standardized output schema

---

## Standard Schema

All datasets must be converted to this schema:

```python
{
    'customer_id': str,
    'event_date': str,     # YYYY-MM-DD format
    'amount': float,
    'event_type': str,
    'churn_label': int     # 0 or 1
}
```

---

## Quick Start

### Basic Usage

```python
from app.helpers.csv_processor import preprocess_to_standard

# Define mapping
mapping = [
    # 1. Drop conflicting columns
    ('old_customer_id', 'drop', None),

    # 2. Transform columns
    ('days_since_purchase', 'days_to_date', None),
    ('amount_cents', 'operate', ('divide', 100)),
    ('is_churned', 'cast', 'int'),

    # 3. Rename to standard names
    ('user_id', 'rename', 'customer_id'),
    ('days_since_purchase', 'rename', 'event_date'),
    ('amount_cents', 'rename', 'amount'),
    ('is_churned', 'rename', 'churn_label'),

    # 4. Drop unnecessary columns
    ('internal_notes', 'drop', None),
    ('created_at', 'drop', None),

    # 5. Add constants
    ('event_type', 'add_constant', 'purchase')
]

# Preprocess
df = preprocess_to_standard('input.csv', mapping)
```

---

## Available Operations

### 1. Rename

Rename a column.

```python
(old_column_name, 'rename', new_column_name)
```

**Example:**
```python
('customerID', 'rename', 'customer_id')
```

---

### 2. Drop

Remove a column. Silently skips if column doesn't exist.

```python
(column_name, 'drop', None)
```

**Example:**
```python
('gender', 'drop', None)
```

---

### 3. Operate

Apply mathematical operation to column values.

```python
(column_name, 'operate', (operation_type, value))
```

**Operations:**
- `'add'` - Add value to each element
- `'subtract'` - Subtract value from each element
- `'multiply'` - Multiply each element by value
- `'divide'` - Divide each element by value

**Examples:**
```python
# Convert cents to dollars
('amount', 'operate', ('divide', 100))

# Add 10% tax
('price', 'operate', ('multiply', 1.1))

# Subtract base fee
('total', 'operate', ('subtract', 5.0))
```

---

### 4. Days to Date

Convert "days since last event" to date.

```python
(column_name, 'days_to_date', None)
```

**Example:**
```python
# If column has value 5 and today is 2025-12-02
# Result: 2025-11-27 (5 days ago)
('DaySinceLastOrder', 'days_to_date', None)
```

---

### 5. Months to Date

Convert "months since" to date.

```python
(column_name, 'months_to_date', None)
```

**Example:**
```python
# If column has value 12 and today is 2025-12-02
# Result: 2024-12-02 (12 months ago, approx.)
('tenure', 'months_to_date', None)
```

---

### 6. Cast

Convert column to specified type with null handling.

```python
(column_name, 'cast', target_type)
```

**Types:**
- `'int'` - Integer (nulls become 0)
- `'float'` - Float (nulls become 0.0)
- `'str'` - String

**Examples:**
```python
('MonthlyCharges', 'cast', 'float')
('churned', 'cast', 'int')
('customer_name', 'cast', 'str')
```

---

### 7. Add Constant

Add a new column with a constant value.

```python
(column_name, 'add_constant', value)
```

**Example:**
```python
('event_type', 'add_constant', 'monthly_charge')
('organization_id', 'add_constant', '12345')
```

---

## Operation Order Matters!

Operations are applied **in the order you specify**. Follow this recommended order:

1. **Drop conflicting columns first**
2. **Transform columns** (dates, operations, casts)
3. **Rename columns** to standard names
4. **Drop unnecessary columns**
5. **Add constant columns**

### Example

```python
mapping = [
    # Step 1: Drop conflicts
    ('customer_id', 'drop', None),  # Drop existing customer_id

    # Step 2: Transform
    ('tenure', 'months_to_date', None),
    ('MonthlyCharges', 'cast', 'float'),

    # Step 3: Rename
    ('customerID', 'rename', 'customer_id'),
    ('tenure', 'rename', 'event_date'),

    # Step 4: Drop extras
    ('gender', 'drop', None),
    ('Contract', 'drop', None),

    # Step 5: Add constants
    ('event_type', 'add_constant', 'monthly_charge')
]
```

---

## Complete Examples

### Telco Dataset

```python
from app.helpers.csv_processor import preprocess_to_standard

telco_mapping = [
    # Drop conflicts
    ('customer_id', 'drop', None),
    ('Churn', 'drop', None),

    # Transform
    ('tenure', 'months_to_date', None),
    ('MonthlyCharges', 'cast', 'float'),
    ('churned', 'cast', 'int'),

    # Rename
    ('customerID', 'rename', 'customer_id'),
    ('tenure', 'rename', 'event_date'),
    ('MonthlyCharges', 'rename', 'amount'),
    ('churned', 'rename', 'churn_label'),

    # Drop all demographic columns
    ('gender', 'drop', None),
    ('SeniorCitizen', 'drop', None),
    ('Partner', 'drop', None),
    ('Dependents', 'drop', None),
    ('PhoneService', 'drop', None),
    ('MultipleLines', 'drop', None),
    ('InternetService', 'drop', None),
    ('Contract', 'drop', None),
    ('PaymentMethod', 'drop', None),
    ('TotalCharges', 'drop', None),

    # Add constant
    ('event_type', 'add_constant', 'monthly_charge')
]

df = preprocess_to_standard('datasets/telco.csv', telco_mapping)
df.to_csv('datasets/telco_normalized.csv', index=False)
```

### eCommerce Dataset

```python
ecommerce_mapping = [
    # Transform
    ('DaySinceLastOrder', 'days_to_date', None),
    ('CashbackAmount', 'cast', 'float'),
    ('Churn', 'cast', 'int'),

    # Rename
    ('CustomerID', 'rename', 'customer_id'),
    ('DaySinceLastOrder', 'rename', 'event_date'),
    ('CashbackAmount', 'rename', 'amount'),
    ('Churn', 'rename', 'churn_label'),

    # Drop extras
    ('Tenure', 'drop', None),
    ('PreferredLoginDevice', 'drop', None),
    ('WarehouseToHome', 'drop', None),
    ('HourSpendOnApp', 'drop', None),
    ('SatisfactionScore', 'drop', None),
    ('Gender', 'drop', None),
    ('MaritalStatus', 'drop', None),

    # Add constant
    ('event_type', 'add_constant', 'order')
]

df = preprocess_to_standard('datasets/ecomm.csv', ecommerce_mapping)
```

### SaaS Subscription Dataset

```python
saas_mapping = [
    # Transform amount from cents to dollars
    ('mrr_cents', 'operate', ('divide', 100)),
    ('mrr_cents', 'cast', 'float'),

    # Transform date
    ('days_since_payment', 'days_to_date', None),

    # Cast churn label
    ('cancelled', 'cast', 'int'),

    # Rename
    ('account_id', 'rename', 'customer_id'),
    ('days_since_payment', 'rename', 'event_date'),
    ('mrr_cents', 'rename', 'amount'),
    ('cancelled', 'rename', 'churn_label'),

    # Drop
    ('plan_name', 'drop', None),
    ('billing_cycle', 'drop', None),

    # Add constant
    ('event_type', 'add_constant', 'subscription')
]

df = preprocess_to_standard('datasets/saas.csv', saas_mapping)
```

---

## Validation and Cleaning

The `preprocess_to_standard()` function automatically:

1. **Validates** the schema
2. **Cleans** the data:
   - Removes rows with null customer_id
   - Clips amounts to ≥ 0
   - Clips churn_label to 0 or 1
   - Removes duplicates
   - Ensures correct types

---

## Advanced Usage

### Custom Base Date

```python
from datetime import datetime

base_date = datetime(2025, 1, 1)

df = preprocess_to_standard(
    'input.csv',
    mapping,
    base_date=base_date  # Use this date for date operations
)
```

### Skip Validation

```python
df = preprocess_to_standard(
    'input.csv',
    mapping,
    validate=False  # Skip schema validation
)
```

### Manual Validation

```python
from app.helpers.csv_processor import validate_standard_schema

is_valid, errors = validate_standard_schema(df, strict=False)
if not is_valid:
    print("Validation errors:")
    for error in errors:
        print(f"  - {error}")
```

---

## Error Handling

### Missing Column

```python
# This will silently skip if 'gender' doesn't exist
('gender', 'drop', None)
```

### Invalid Operation

```python
# This will raise ValueError
('amount', 'operate', ('divide', 0))  # Cannot divide by zero
```

### Invalid Type

```python
# This will raise ValueError
('amount', 'cast', 'invalid_type')  # Must be 'int', 'float', or 'str'
```

---

## Integration with Churn V2

### Step 1: Preprocess Dataset

```python
from app.helpers.csv_processor import preprocess_to_standard

mapping = [...]  # Your mapping
df = preprocess_to_standard('raw_data.csv', mapping)
df.to_csv('normalized_data.csv', index=False)
```

### Step 2: Upload to API

```bash
curl -X POST "http://localhost:8000/api/v1/churn/v2/upload-dataset" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@normalized_data.csv" \
  -F "has_churn_label=true"
```

### Step 3: Process Features

```bash
curl -X POST "http://localhost:8000/api/v1/churn/v2/datasets/{dataset_id}/process-features" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4: Train Model

```bash
curl -X POST "http://localhost:8000/api/v1/churn/v2/train" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Best Practices

1. **Always drop conflicting columns first** before renaming
2. **Apply transformations before renaming** (use source column names)
3. **Test with small sample first** (df.head(100))
4. **Validate output** after preprocessing
5. **Document your mappings** for future reference

---

## Troubleshooting

**Problem:** KeyError: column not in index
**Solution:** Check operation order - ensure you're not renaming before operating

**Problem:** Missing required columns
**Solution:** Verify all 5 standard columns are created

**Problem:** Invalid dates
**Solution:** Use `days_to_date` or `months_to_date` operations

**Problem:** Duplicate customer IDs after cleaning
**Solution:** Check source data for duplicates

---

## API Reference

### Main Function

```python
preprocess_to_standard(
    input_csv: Union[pd.DataFrame, str],
    mapping: List[Tuple[str, str, Any]],
    base_date: Optional[datetime] = None,
    validate: bool = True
) -> pd.DataFrame
```

### Helper Functions

- `rename_column(df, old_col, new_col)`
- `drop_column(df, col_name, ignore_missing=False)`
- `operate_column(df, col_name, operation, value)`
- `days_to_date_operation(df, col_name, base_date=None)`
- `months_to_date_operation(df, col_name, base_date=None)`
- `cast_type_operation(df, col_name, target_type)`
- `add_constant_column(df, col_name, value)`
- `validate_standard_schema(df, strict=True)`
- `standardize_and_clean(df)`

---

Ready to preprocess any dataset! 🚀
