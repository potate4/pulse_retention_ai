# CSV Processor Helper Functions

## Overview

Modular helper functions for processing CSV files with column renaming, dropping, and mathematical operations.

## Functions

### 1. `rename_column(df, old_col_name, new_col_name)`

Renames a column in the DataFrame.

**Parameters:**
- `df`: pandas DataFrame
- `old_col_name`: Current column name (string)
- `new_col_name`: New column name (string)

**Returns:** DataFrame with renamed column

**Example:**
```python
df = pd.DataFrame({'old_name': [1, 2, 3]})
df = rename_column(df, 'old_name', 'new_name')
# Result: DataFrame with column 'new_name'
```

---

### 2. `drop_column(df, col_name)`

Drops a column from the DataFrame.

**Parameters:**
- `df`: pandas DataFrame
- `col_name`: Column name to drop (string)

**Returns:** DataFrame with column removed

**Example:**
```python
df = pd.DataFrame({'keep': [1, 2], 'remove': [3, 4]})
df = drop_column(df, 'remove')
# Result: DataFrame with only 'keep' column
```

---

### 3. `operate_column(df, col_name, operation, value)`

Applies mathematical operation to column values.

**Parameters:**
- `df`: pandas DataFrame
- `col_name`: Column name to operate on (string)
- `operation`: Operation type - 'add', 'subtract', 'multiply', or 'divide' (string)
- `value`: Numeric value to use in operation (int or float)

**Returns:** DataFrame with modified column values

**Example:**
```python
df = pd.DataFrame({'price': [100, 200, 150]})
df = operate_column(df, 'price', 'multiply', 1.1)  # Increase by 10%
# Result: price column becomes [110.0, 220.0, 165.0]
```

**Supported Operations:**
- `'add'`: Adds value to each cell
- `'subtract'`: Subtracts value from each cell
- `'multiply'`: Multiplies each cell by value
- `'divide'`: Divides each cell by value (value cannot be 0)

---

### 4. `process_standardized_csv(input_csv, mapping)`

Main function that processes CSV according to mapping specifications.

**Parameters:**
- `input_csv`: pandas DataFrame or file path (string)
- `mapping`: List of tuples with format `(column_name, operation, operation_args)`

**Mapping Format:**
- **Rename**: `(old_col_name, 'rename', new_col_name)`
- **Drop**: `(col_name, 'drop', None)`
- **Operate**: `(col_name, 'operate', (operation_type, value))`

**Returns:** Processed DataFrame

**Example:**
```python
df = pd.DataFrame({
    'old_id': ['CUST-001', 'CUST-002'],
    'old_date': ['2024-01-15', '2024-01-16'],
    'price': [100.0, 200.0],
    'unwanted': ['A', 'B']
})

mapping = [
    ('old_id', 'rename', 'customer_id'),
    ('old_date', 'rename', 'event_date'),
    ('unwanted', 'drop', None),
    ('price', 'operate', ('multiply', 1.1))  # 10% increase
]

result = process_standardized_csv(df, mapping)
```

**Result:**
```
  customer_id   event_date    price
0    CUST-001  2024-01-15    110.0
1    CUST-002  2024-01-16    220.0
```

## Usage Examples

### Example 1: Basic Column Renaming

```python
from app.helpers.csv_processor import process_standardized_csv
import pandas as pd

df = pd.DataFrame({
    'User ID': ['U001', 'U002'],
    'Order Date': ['2024-01-15', '2024-01-16']
})

mapping = [
    ('User ID', 'rename', 'customer_id'),
    ('Order Date', 'rename', 'event_date')
]

result = process_standardized_csv(df, mapping)
```

### Example 2: Drop Unwanted Columns

```python
df = pd.DataFrame({
    'customer_id': ['C001', 'C002'],
    'amount': [100, 200],
    'internal_notes': ['Note1', 'Note2']
})

mapping = [
    ('internal_notes', 'drop', None)
]

result = process_standardized_csv(df, mapping)
```

### Example 3: Mathematical Operations

```python
df = pd.DataFrame({
    'revenue': [1000, 2000, 1500],
    'discount_pct': [0.1, 0.2, 0.15]
})

mapping = [
    ('revenue', 'operate', ('multiply', 0.9)),      # Apply 10% discount
    ('discount_pct', 'operate', ('multiply', 100))   # Convert to percentage
]

result = process_standardized_csv(df, mapping)
# revenue: [900.0, 1800.0, 1350.0]
# discount_pct: [10.0, 20.0, 15.0]
```

### Example 4: Complex Transformation

```python
df = pd.DataFrame({
    'old_customer_id': ['CUST-001', 'CUST-002'],
    'purchase_date': ['2024-01-15', '2024-01-16'],
    'total_price': [100.0, 200.0],
    'tax_rate': [0.08, 0.08],
    'temp_col': ['X', 'Y']
})

mapping = [
    ('old_customer_id', 'rename', 'customer_id'),
    ('purchase_date', 'rename', 'event_date'),
    ('total_price', 'operate', ('add', 10)),        # Add $10 handling fee
    ('tax_rate', 'operate', ('multiply', 100)),      # Convert to percentage
    ('temp_col', 'drop', None)
]

result = process_standardized_csv(df, mapping)
```

### Example 5: Using with File Path

```python
# Process CSV file directly
mapping = [
    ('User ID', 'rename', 'customer_id'),
    ('Date', 'rename', 'event_date'),
    ('Amount', 'operate', ('multiply', 1.05))  # Add 5% tax
]

result = process_standardized_csv('input.csv', mapping)
result.to_csv('output.csv', index=False)
```

## Error Handling

All functions raise `ValueError` for invalid inputs:

- Column not found in DataFrame
- Invalid operation type
- Division by zero
- Missing required arguments

**Example:**
```python
try:
    df = drop_column(df, 'nonexistent_column')
except ValueError as e:
    print(f"Error: {e}")
    # Output: Error: Column 'nonexistent_column' not found in DataFrame
```

## Important Notes

1. **Non-destructive**: All functions return a copy of the DataFrame, original is not modified
2. **Order matters**: Operations in mapping are applied sequentially
3. **Type conversion**: `operate_column` automatically converts columns to numeric (non-numeric values become NaN)
4. **Multiple operations**: You can apply multiple operations to the same column

## Integration with Churn Prediction Pipeline

This helper can be used to preprocess CSV files before uploading to the churn prediction system:

```python
from app.helpers.csv_processor import process_standardized_csv

# Organization's raw CSV
raw_df = pd.read_csv('organization_data.csv')

# Transform to standard schema
mapping = [
    ('User ID', 'rename', 'customer_id'),
    ('Order Date', 'rename', 'event_date'),
    ('Total Price', 'rename', 'amount'),
    ('Category', 'rename', 'event_type'),
    ('Internal ID', 'drop', None)
]

standardized_df = process_standardized_csv(raw_df, mapping)
standardized_df.to_csv('standardized_data.csv', index=False)

# Now upload standardized_data.csv to the system
```

## LLM-Assisted Mapping Generation

For new organizations with unfamiliar schemas, you can use the Gemini-powered helper in `app.helpers.auto_mapping_generator` to propose mappings automatically as a list of Pydantic objects and then convert them into the tuple format expected by `csv_processor`.

```python
from app.helpers.auto_mapping_generator import (
    auto_preprocess_dataset,
    get_preprocessing_plan_only,
)

# Option 1: One-shot normalize and save
df_normalized = auto_preprocess_dataset("raw_org_data.csv", "normalized.csv")

# Option 2: Just inspect the AI-generated plan and mappings
plan, mappings = get_preprocessing_plan_only("raw_org_data.csv")
# `mappings` is ready to pass into `preprocess_to_standard` / `process_standardized_csv`
```

