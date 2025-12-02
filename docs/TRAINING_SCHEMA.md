# Training Schema & Churn Labeling

## Answer: We Auto-Label Churn (No Label Required in CSV)

**The system does NOT require a churn label in the uploaded CSV.** Churn labels are automatically generated based on customer inactivity.

## Complete Flow

### 1. CSV Upload Schema (What Organizations Provide)

**Required:**
```csv
customer_id,event_date
CUST-001,2024-01-15
CUST-002,2024-01-16
```

**Optional:**
```csv
customer_id,event_date,amount,event_type
CUST-001,2024-01-15,150.50,purchase
CUST-002,2024-01-16,75.00,login
```

**Note:** No `churn_label` column needed!

### 2. Churn Labeling (Automatic)

When you call `POST /train`, the system:

1. **Gets organization's churn threshold** (default: 30 days)
   ```python
   org.churn_threshold_days = 30  # Configurable per organization
   ```

2. **For each customer:**
   - Finds last transaction date from database
   - Calculates: `days_since_last = current_date - last_transaction_date`
   - Labels:
     - **Churned (1)**: If `days_since_last >= churn_threshold_days`
     - **Active (0)**: If `days_since_last < churn_threshold_days`

**Example:**
```
Current Date: 2024-02-15
Churn Threshold: 30 days

Customer CUST-001:
  Last Transaction: 2024-01-20
  Days Since Last: 26 days
  Label: 0 (Active) ✓

Customer CUST-002:
  Last Transaction: 2024-01-10
  Days Since Last: 36 days
  Label: 1 (Churned) ✓
```

### 3. Final Training Dataset Schema

After feature engineering and churn labeling, the training dataset has:

```python
{
    # Customer identifier
    "customer_id": str,                    # UUID string
    
    # RFM Features (0-100 scale)
    "recency_score": float,                # Days since last activity (normalized)
    "frequency_score": float,              # Transactions in last 90 days (normalized)
    "monetary_score": float,               # Total value in last 90 days (normalized)
    
    # Engagement Features
    "engagement_score": float,              # Composite engagement metric (0-100)
    "tenure_days": int,                    # Days since first transaction
    "activity_trend": float,                # Slope of activity over last 30 days
    "avg_transaction_value": float,        # Average amount per transaction
    "days_between_transactions": float,    # Average gap between activities
    
    # Target Variable (AUTO-GENERATED)
    "churn_label": int                     # 0 (active) or 1 (churned)
}
```

### 4. Model Training Input/Output

**Features (X) - 8 columns:**
```python
X = [
    [recency_score, frequency_score, monetary_score, engagement_score,
     tenure_days, activity_trend, avg_transaction_value, days_between_transactions],
    ...
]
# Shape: (n_samples, 8)
```

**Target (y) - 1 column:**
```python
y = [0, 1, 0, 1, 0, ...]  # Binary churn labels
# Shape: (n_samples,)
```

**Model Output:**
```python
churn_probability = model.predict_proba(customer_features)[0, 1]
# Returns: 0.0 to 1.0 (probability of churn)
```

## Complete Example

### Step 1: Upload CSV
```csv
customer_id,event_date,amount,event_type
CUST-001,2024-01-15,150.50,purchase
CUST-001,2024-01-20,200.00,purchase
CUST-002,2024-01-10,75.00,login
CUST-003,2024-01-05,50.00,purchase
```

### Step 2: System Processes
- Stores transactions
- Calculates RFM features
- Status: "ready"

### Step 3: Train Model (Auto-Labeling Happens Here)
```python
# System automatically:
# 1. Gets all customers
# 2. For each customer, finds last transaction
# 3. Calculates days since last activity
# 4. Labels based on threshold (30 days)

# Training dataset created:
customer_id | recency_score | frequency_score | ... | churn_label
CUST-001    | 85.0          | 90.0            | ... | 0  (26 days ago - Active)
CUST-002    | 20.0          | 10.0            | ... | 1  (36 days ago - Churned)
CUST-003    | 5.0           | 5.0             | ... | 1  (41 days ago - Churned)
```

### Step 4: Model Trains
- Input: 8 features
- Target: churn_label (0 or 1)
- Algorithm: Logistic Regression
- Output: Churn probability (0.0 to 1.0)

## Configuration

### Setting Churn Threshold Per Organization

```python
# When creating organization
org = Organization(
    id=uuid.uuid4(),
    name="Acme Corp",
    churn_threshold_days=30  # Customers inactive 30+ days = churned
)

# Or update existing
org.churn_threshold_days = 60  # Change to 60 days
```

**Common Thresholds:**
- **SaaS/Subscription**: 30-60 days
- **E-commerce**: 90-180 days  
- **High-frequency (food delivery)**: 7-14 days
- **Low-frequency (B2B)**: 90-365 days

## Advantages of This Approach

1. ✅ **No manual labeling** - Organizations don't need to pre-label data
2. ✅ **Consistent definition** - Churn defined uniformly
3. ✅ **Time-based** - Reflects actual behavior patterns
4. ✅ **Flexible** - Each organization sets their own threshold
5. ✅ **Automatic** - Works with any transaction data

## Limitations & Considerations

1. ⚠️ **Assumes inactivity = churn** - May miss other churn signals
2. ⚠️ **Requires historical data** - Need transaction history
3. ⚠️ **Time-sensitive** - Labels change as time passes
4. ⚠️ **May not capture all scenarios** - Some customers might be "on hold" not churned

## Future Enhancement: Optional CSV Labels

If needed, we could support optional churn labels in CSV:

```csv
customer_id,event_date,amount,churn_label
CUST-001,2024-01-15,150.50,0
CUST-002,2024-01-16,75.00,1
```

**Logic:**
- If `churn_label` column exists → use provided labels
- If not → use auto-labeling (current behavior)

## Summary

| Aspect | Details |
|--------|---------|
| **CSV Schema** | `customer_id`, `event_date`, `amount` (optional), `event_type` (optional) |
| **Churn Label in CSV?** | ❌ No - Auto-generated |
| **Labeling Method** | Days since last transaction >= threshold |
| **Training Features** | 8 features (RFM + engagement metrics) |
| **Training Target** | Binary churn label (0 or 1) |
| **Model Output** | Churn probability (0.0 to 1.0) |

