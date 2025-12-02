# Data Flow - Simplified Schema Processing

## Overview

The churn prediction engine assumes uploaded CSV files follow a **standard schema**. There is no automatic schema detection or column mapping. Organizations must format their data according to the standard schema before uploading.

## Standard Schema Requirements

### Required Columns

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `customer_id` | string | Customer identifier | `"CUST-001"` |
| `event_date` | date | Transaction/activity date | `"2024-01-15"` (YYYY-MM-DD) |

### Optional Columns

| Column Name | Type | Description | Example |
|------------|------|-------------|---------|
| `amount` | float | Transaction value | `150.50` |
| `event_type` | string | Type of event | `"purchase"`, `"login"`, `"usage"` |

### Additional Columns

Any columns beyond the standard schema are stored in the `metadata` JSON field.

## Data Flow Process

```
┌─────────────────┐
│  CSV Upload     │  (Must follow standard schema)
│  customer_id,    │
│  event_date,    │
│  amount, ...    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Read CSV       │  pandas.read_csv()
│  Validate       │  Check required columns exist
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Normalize      │  Convert data types:
│  Data Types     │  - customer_id → string
│                 │  - event_date → datetime
│                 │  - amount → float
│                 │  - Other cols → metadata JSON
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validate       │  - Required fields present
│  Data           │  - Valid dates
│                 │  - No empty dataset
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store in DB    │  - Create/update customers
│                 │  - Insert transactions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Calculate      │  - RFM features
│  Features       │  - Engagement metrics
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ready for      │  Status: "ready"
│  Model Training │
└─────────────────┘
```

## Example: Complete Flow

### 1. Organization Prepares CSV

**File: `customer_data.csv`**
```csv
customer_id,event_date,amount,event_type,region,product_category
CUST-001,2024-01-15,150.50,purchase,North,Electronics
CUST-002,2024-01-16,75.00,login,South,Clothing
CUST-001,2024-01-20,200.00,purchase,North,Electronics
CUST-003,2024-01-22,50.00,purchase,East,Books
```

### 2. Upload via API

```bash
POST /api/v1/churn/organizations/{org_id}/upload-data
Content-Type: multipart/form-data

file: customer_data.csv
```

### 3. System Processing

**Step 1: Read CSV**
```python
df = pd.read_csv(file)
# Columns: ['customer_id', 'event_date', 'amount', 'event_type', 'region', 'product_category']
```

**Step 2: Validate Required Columns**
```python
# Check: customer_id ✓, event_date ✓
# Both required columns present
```

**Step 3: Normalize Data Types**
```python
normalized = {
    "customer_id": ["CUST-001", "CUST-002", "CUST-001", "CUST-003"],  # string
    "event_date": [2024-01-15, 2024-01-16, 2024-01-20, 2024-01-22],  # datetime
    "amount": [150.50, 75.00, 200.00, 50.00],                         # float
    "event_type": ["purchase", "login", "purchase", "purchase"],      # string
    "metadata": [
        {"region": "North", "product_category": "Electronics"},
        {"region": "South", "product_category": "Clothing"},
        {"region": "North", "product_category": "Electronics"},
        {"region": "East", "product_category": "Books"}
    ]
}
```

**Step 4: Store in Database**

**`customers` table:**
```
id: uuid-1, organization_id: org-123, external_customer_id: "CUST-001"
id: uuid-2, organization_id: org-123, external_customer_id: "CUST-002"
id: uuid-3, organization_id: org-123, external_customer_id: "CUST-003"
```

**`transactions` table:**
```
id: uuid-101, customer_id: uuid-1, event_date: 2024-01-15, amount: 150.50, 
    event_type: "purchase", metadata: {"region": "North", "product_category": "Electronics"}

id: uuid-102, customer_id: uuid-2, event_date: 2024-01-16, amount: 75.00,
    event_type: "login", metadata: {"region": "South", "product_category": "Clothing"}

id: uuid-103, customer_id: uuid-1, event_date: 2024-01-20, amount: 200.00,
    event_type: "purchase", metadata: {"region": "North", "product_category": "Electronics"}

id: uuid-104, customer_id: uuid-3, event_date: 2024-01-22, amount: 50.00,
    event_type: "purchase", metadata: {"region": "East", "product_category": "Books"}
```

**Step 5: Calculate Features**

For each customer, calculate:
- **Recency**: Days since last transaction
- **Frequency**: Number of transactions in last 90 days
- **Monetary**: Total amount in last 90 days
- **Engagement**: Composite score
- **Tenure**: Days since first transaction
- etc.

**Step 6: Status Update**

```
Status: "ready"
Records processed: 4
Features calculated: 3 customers
```

## Error Handling

### Missing Required Column

**CSV:**
```csv
customer_id,amount,event_type
CUST-001,150.50,purchase
```

**Error:**
```json
{
  "detail": "Required column 'event_date' not found in CSV. CSV must follow standard schema."
}
```

### Invalid Date Format

**CSV:**
```csv
customer_id,event_date
CUST-001,01/15/2024
```

**Result:** Date parsing fails, row is dropped (with warning)

### Invalid Amount

**CSV:**
```csv
customer_id,event_date,amount
CUST-001,2024-01-15,invalid
```

**Result:** Amount set to `NULL` (with warning)

## Benefits of This Approach

1. **Simplicity**: No complex schema detection logic
2. **Performance**: Faster processing (no mapping overhead)
3. **Clarity**: Organizations know exactly what format to use
4. **Reliability**: Fewer edge cases and errors
5. **Maintainability**: Easier to debug and test

## Pre-Upload Data Preparation

Organizations should:
1. Export their data to CSV
2. Rename columns to match standard schema:
   - Their "User ID" → `customer_id`
   - Their "Order Date" → `event_date`
   - Their "Total Price" → `amount`
   - Their "Category" → `event_type`
3. Ensure date format is YYYY-MM-DD
4. Upload the CSV

## API Response Example

**Success:**
```json
{
  "success": true,
  "records_stored": 4,
  "features_calculated": 3,
  "errors": []
}
```

**Error:**
```json
{
  "detail": "Required column 'customer_id' not found in CSV. CSV must follow standard schema."
}
```

