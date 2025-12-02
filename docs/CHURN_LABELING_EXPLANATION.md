# Churn Labeling Strategy

## Current Implementation: Auto-Labeling Based on Inactivity

**The system does NOT require a churn label in the CSV.** Instead, it automatically labels customers as churned based on inactivity threshold.

## How It Works

### 1. Upload CSV (No Churn Label Required)

**Standard CSV Schema:**
```csv
customer_id,event_date,amount,event_type
CUST-001,2024-01-15,150.50,purchase
CUST-002,2024-01-16,75.00,login
CUST-001,2024-01-20,200.00,purchase
```

### 2. Churn Labeling Logic

When training the model, the system:

1. **Gets organization's churn threshold** (default: 30 days, configurable per organization)
2. **For each customer:**
   - Finds last transaction date
   - Calculates days since last activity
   - Labels as:
     - **Churned (1)**: If `days_since_last >= churn_threshold_days`
     - **Active (0)**: If `days_since_last < churn_threshold_days`

**Example:**
- Current date: 2024-02-15
- Churn threshold: 30 days
- Customer CUST-001: Last transaction 2024-01-20 → 26 days ago → **Active (0)**
- Customer CUST-002: Last transaction 2024-01-10 → 36 days ago → **Churned (1)**

### 3. Training Dataset Schema

The final training dataset has this structure:

```python
{
    "customer_id": str,                    # UUID string
    "recency_score": float,                 # 0-100
    "frequency_score": float,               # 0-100
    "monetary_score": float,                # 0-100
    "engagement_score": float,              # 0-100
    "tenure_days": int,                     # Days since first transaction
    "activity_trend": float,                # Slope of activity
    "avg_transaction_value": float,         # Average amount
    "days_between_transactions": float,     # Average gap
    "churn_label": int                      # 0 (active) or 1 (churned) - AUTO-GENERATED
}
```

**Features (X):**
- 8 feature columns (RFM + engagement metrics)

**Target (y):**
- `churn_label`: Binary (0 or 1)

## Configuration

### Organization-Level Churn Threshold

Each organization can set their own churn threshold:

```python
org = Organization(
    id=uuid.uuid4(),
    name="Acme Corp",
    churn_threshold_days=30  # Customers inactive for 30+ days = churned
)
```

**Common Thresholds:**
- **SaaS/Subscription**: 30-60 days
- **E-commerce**: 90-180 days
- **High-frequency services**: 7-14 days

## Advantages of Auto-Labeling

1. **No manual labeling required** - Organizations don't need to pre-label data
2. **Consistent definition** - Churn is defined uniformly across all customers
3. **Time-based** - Reflects actual customer behavior patterns
4. **Flexible** - Each organization can set their own threshold

## Limitations

1. **Assumes inactivity = churn** - May not capture all churn scenarios
2. **Requires historical data** - Need transaction history to calculate
3. **Time-sensitive** - Labels change as time passes

## Alternative: Using CSV-Provided Labels (Future Enhancement)

If an organization wants to provide their own churn labels, we could support:

**Extended CSV Schema:**
```csv
customer_id,event_date,amount,event_type,churn_label
CUST-001,2024-01-15,150.50,purchase,0
CUST-002,2024-01-16,75.00,login,1
```

**Implementation would:**
1. Check if `churn_label` column exists in CSV
2. If yes, use provided labels
3. If no, use auto-labeling (current behavior)

## Training Flow Summary

```
1. Upload CSV (customer_id, event_date, amount, event_type)
   ↓
2. Store transactions in database
   ↓
3. Calculate RFM features for each customer
   ↓
4. Auto-label churn based on inactivity threshold
   ↓
5. Create training dataset (features + labels)
   ↓
6. Train model (Logistic Regression)
   ↓
7. Evaluate and save model
```

## Example: Complete Training Process

```python
# 1. Organization uploads CSV
POST /api/v1/churn/organizations/{org_id}/upload-data
# CSV: customer_id, event_date, amount

# 2. System processes:
# - Stores transactions
# - Calculates features (RFM scores)
# - Status: "ready"

# 3. Train model
POST /api/v1/churn/organizations/{org_id}/train
# System:
# - Gets all customers with features
# - For each customer:
#   - Finds last transaction date
#   - Calculates days since last activity
#   - Labels: 1 if days >= threshold, else 0
# - Creates training dataset
# - Trains Logistic Regression
# - Returns: accuracy, precision, recall, roc_auc
```

## Final Training Schema

**Input to Model (X):**
```python
[
    [recency_score, frequency_score, monetary_score, engagement_score, 
     tenure_days, activity_trend, avg_transaction_value, days_between_transactions],
    ...
]
# Shape: (n_samples, 8_features)
```

**Target (y):**
```python
[0, 1, 0, 1, 0, ...]  # Binary churn labels
# Shape: (n_samples,)
```

**Model Output:**
```python
churn_probability = model.predict_proba(customer_features)[0, 1]
# Returns: 0.0 to 1.0 (probability of churn)
```

