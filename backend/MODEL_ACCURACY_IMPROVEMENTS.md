# Model Accuracy Improvements - V2 Enhanced Training

## Overview

The V2 enhanced training system automatically improves model accuracy for all organizations using the Churn Prediction API. **No manual intervention required** - the improvements are applied automatically to all training jobs.

**Key Results:**
- Original accuracy: ~69%
- Target: 75-85% (expected improvement through multiple techniques)
- **100% automated** - works for any dataset, any organization

---

## What Changed?

### 1. Enhanced Feature Engineering (15 features instead of 8)

**New Features Added:**

| Feature | Description | Why It Helps |
|---------|-------------|--------------|
| **transaction_velocity** | Transactions per day | Identifies high-activity vs low-activity customers |
| **consistency_score** | Regularity of purchases | More consistent customers are less likely to churn |
| **activity_ratio** | Recent vs previous 30-day activity | Detects declining engagement early |
| **monetary_trend** | Recent vs historical spending | Spending decrease indicates churn risk |
| **lifecycle_stage** | Customer maturity level (0-4) | Different stages have different churn patterns |
| **rf_ratio** | Recency × Frequency interaction | Captures combined RFM effects |
| **avg_days_since_last** | Average recency per transaction | Smooth metric for sparse data |

**Improved Existing Features:**
- Better null handling (uses medians, not zeros)
- Edge case handling (single transaction customers, inactive customers)
- More robust normalization (uses 95th percentile to handle outliers)
- Improved engagement score formula

---

### 2. Advanced ML Training

**Auto Model Selection:**
- Tries 3 models: Logistic Regression, Random Forest, Gradient Boosting
- Automatically selects the best based on cross-validation ROC-AUC
- No need to guess which model works best for your data

**Hyperparameter Tuning:**
- Grid search for optimal parameters
- Different parameter grids per model type
- Automatically finds best configuration

**Feature Scaling:**
- StandardScaler applied automatically
- Improves Logistic Regression performance significantly
- Helps with feature importance interpretation

**Cross-Validation:**
- 5-fold stratified cross-validation
- Ensures model generalizes well
- Reports mean CV score ± std deviation

**Class Balancing:**
- Handles imbalanced datasets automatically
- Uses `class_weight='balanced'` for all models
- Prevents bias toward majority class

---

## How It Works (Automated)

### For Organizations

1. **Upload normalized CSV** (standard schema)
2. **Call `/process-features`** → System automatically:
   - Calculates 15 advanced features
   - Handles nulls and edge cases
   - Creates robust feature dataset

3. **Call `/train`** → System automatically:
   - Tries multiple models
   - Tunes hyperparameters
   - Selects best model
   - Returns improved accuracy

**That's it!** Everything is automatic.

---

## Technical Details

### Feature Engineering V2

```python
# Automatically used when USE_V2_ENHANCED = True (default)
from app.services.feature_engineering_v2 import engineer_features_from_csv_v2

features_df = engineer_features_from_csv_v2(
    df=transactions_df,
    lookback_days=90,
    has_churn_label=True
)
# Returns 15 features per customer
```

**Key Improvements:**
- Intelligent null handling (medians for continuous, defaults for categorical)
- Single-transaction customer handling
- Inactive customer handling (no recent activity)
- Outlier-robust normalization (95th percentile)
- Feature interactions (RF ratio, monetary trend)

### ML Training V2

```python
# Automatically used when USE_V2_ENHANCED = True (default)
from app.services.ml_training_v2 import train_churn_model_v2

pipeline, metrics = train_churn_model_v2(
    training_df=features_df,
    feature_columns=get_feature_columns_v2(),
    model_type="auto",  # Auto-select best model
    enable_tuning=True,  # Hyperparameter tuning
    enable_scaling=True  # Feature scaling
)
```

**Auto Model Selection Logic:**
1. Trains Logistic Regression, Random Forest, Gradient Boosting
2. Performs 5-fold cross-validation on each
3. Selects model with highest mean CV ROC-AUC
4. Tunes hyperparameters for selected model
5. Trains final model on full training data
6. Returns best model + comprehensive metrics

---

## Metrics Improvements

### New Metrics Tracked

```json
{
  "accuracy": 0.7845,
  "precision": 0.7234,
  "recall": 0.8012,
  "specificity": 0.7654,  // NEW: True negative rate
  "f1_score": 0.7601,
  "roc_auc": 0.8456,

  "confusion_matrix": {  // NEW: Detailed breakdown
    "true_negatives": 850,
    "false_positives": 120,
    "false_negatives": 95,
    "true_positives": 385
  },

  "cv_scores": {  // NEW: Cross-validation stats
    "mean": 0.8234,
    "std": 0.0156,
    "scores": [0.82, 0.84, 0.81, 0.83, 0.82]
  },

  "class_balance": {  // NEW: Dataset stats
    "non_churned": 970,
    "churned": 480
  },

  "model_type": "gradient_boosting",  // NEW: Auto-selected
  "feature_scaling": true,
  "hyperparameter_tuning": true
}
```

---

## Expected Accuracy Improvements

| Technique | Expected Gain |
|-----------|--------------|
| Enhanced features (15 vs 8) | +3-5% |
| Auto model selection | +2-4% |
| Hyperparameter tuning | +1-3% |
| Feature scaling | +1-2% |
| Better null handling | +1-2% |
| Cross-validation | +0-1% (stability) |
| **Total Expected** | **+8-17%** |

**Realistic Target:**
- From: 69% accuracy
- To: 75-85% accuracy
- Depends on dataset quality and size

---

## For Developers

### Enabling/Disabling V2

In `churn_v2.py`:

```python
# At the top of the file
USE_V2_ENHANCED = True  # Default: True (use V2)
```

Set to `False` to use original methods (8 features, no tuning).

### Testing V2 Locally

```python
from app.services.feature_engineering_v2 import engineer_features_from_csv_v2, get_feature_columns_v2
from app.services.ml_training_v2 import train_churn_model_v2
import pandas as pd

# Load your normalized dataset
df = pd.read_csv('datasets/my_normalized.csv')

# Engineer V2 features
features_df = engineer_features_from_csv_v2(df, has_churn_label=True)

# Train V2 model
pipeline, metrics = train_churn_model_v2(
    training_df=features_df,
    feature_columns=get_feature_columns_v2(),
    model_type="auto"
)

print(f"Accuracy: {metrics['accuracy']:.2%}")
print(f"ROC-AUC: {metrics['roc_auc']:.4f}")
print(f"Best model: {metrics['model_type']}")
```

---

## Model Comparison

### Original (V1)

```
Features: 8
Model: Fixed (Logistic Regression)
Tuning: None
Scaling: None
Accuracy: ~69%
Training time: 1-2 seconds
```

### Enhanced (V2)

```
Features: 15
Model: Auto-selected (LR, RF, or GB)
Tuning: Grid search
Scaling: StandardScaler
Accuracy: 75-85% (expected)
Training time: 30-60 seconds
```

**Trade-off:** V2 takes longer to train but produces significantly better models.

---

## Data Quality Tips

Even with V2, model accuracy depends on data quality:

### Good Data Characteristics

✅ At least 100+ customers
✅ Balanced classes (20-50% churn rate)
✅ Multiple transactions per customer
✅ Transaction dates span several months
✅ Variety in transaction amounts
✅ Clean, validated data

### Common Data Issues

❌ Too few samples (<50 customers)
❌ Extreme class imbalance (<5% or >95% churn)
❌ Most customers have only 1 transaction
❌ All transactions within 1 week
❌ All amounts are identical
❌ Many null/missing values

---

## API Usage (Same as Before!)

No changes to API calls - V2 is applied automatically:

```bash
# 1. Upload dataset
curl -X POST ".../upload-dataset" \
  -F "file=@my_data.csv" \
  -F "has_churn_label=true"

# 2. Process features (V2 automatically used)
curl -X POST ".../datasets/{id}/process-features"

# 3. Train model (V2 automatically used)
curl -X POST ".../train"

# 4. Check status
curl -X GET ".../training-status"
# Returns V2 metrics including cv_scores, confusion_matrix, etc.
```

---

## Monitoring Improvements

Track these metrics to verify V2 improvements:

1. **ROC-AUC** → Should be >0.75 (was ~0.70)
2. **F1-Score** → Should be >0.65 (was ~0.55)
3. **CV Std Dev** → Should be <0.05 (lower = more stable)
4. **Specificity** → Should be >0.70 (true negative rate)

---

## Troubleshooting

### Accuracy Still Low (<70%)

**Possible causes:**
1. **Insufficient data** → Need at least 100 customers
2. **Poor data quality** → Check for nulls, duplicates
3. **Extreme imbalance** → Churn rate too low/high
4. **Single transactions** → Most customers have only 1 event

**Solutions:**
- Collect more data
- Improve data quality (use csv_processor.py for preprocessing)
- Balance dataset if needed
- Extend lookback period if sparse

### Training Takes Too Long (>2 min)

**Causes:**
- Large dataset (>10,000 customers)
- Hyperparameter tuning with large grids

**Solutions:**
```python
# Reduce tuning time
pipeline, metrics = train_churn_model_v2(
    training_df=features_df,
    feature_columns=get_feature_columns_v2(),
    model_type="logistic_regression",  # Skip auto-selection
    enable_tuning=False  # Skip tuning
)
```

### Model Performance Varies

**Cause:** Small dataset with high variance

**Solution:**
- Increase dataset size
- Check CV std dev in metrics
- Use ensemble model:
```python
model_type="ensemble"  # Uses voting classifier
```

---

## Future Improvements

Potential enhancements (not yet implemented):

1. **SMOTE** for class balancing
2. **Feature selection** (remove low-importance features)
3. **Neural networks** for very large datasets
4. **Time-based validation** (train on past, test on future)
5. **Customer segments** (train separate models per segment)
6. **Online learning** (update model incrementally)

---

## Summary

✅ **V2 is enabled by default** for all organizations
✅ **No code changes needed** to use it
✅ **Automatic model selection** picks the best algorithm
✅ **Hyperparameter tuning** optimizes performance
✅ **15 advanced features** capture more patterns
✅ **Expected 8-17% accuracy improvement**
✅ **Works for any dataset** automatically

Just use the existing API - V2 handles everything! 🚀
