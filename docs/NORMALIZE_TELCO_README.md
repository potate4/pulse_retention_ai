# Telco Churn Dataset Normalization

## Overview

This helper script converts the Telco Churn dataset (`telco_churn.csv`) to the standard schema format required by the churn prediction pipeline.

## Problem

The Telco Churn dataset is a **customer snapshot** dataset (one row per customer), but our system expects **transaction-based** data (multiple rows per customer with dates).

## Solution

We convert customer snapshots to transaction events by:
1. Using `customerID` → `customer_id`
2. Using `tenure` (months) to calculate `event_date` (last transaction date)
3. Using `MonthlyCharges` → `amount`
4. Setting `event_type` → `'monthly_charge'`

## Usage

### Simple Method (Recommended)

```bash
python test_normalize_telco.py
```

This will:
- Read `datasets/telco_churn.csv`
- Create normalized CSV at `datasets/telco_churn_normalized.csv`
- Generate one transaction per customer (based on tenure)

### Advanced Method

```bash
python app/helpers/normalize_telco_dataset.py \
    --input datasets/telco_churn.csv \
    --output datasets/telco_churn_normalized.csv \
    --mode simple
```

Options:
- `--mode simple`: One transaction per customer (faster)
- `--mode detailed`: Monthly transactions for each month of tenure (more realistic but larger file)
- `--base-date YYYY-MM-DD`: Set base date for calculations (defaults to today)

## Mapping Logic

### Input Schema (Telco Churn)
```csv
customerID,tenure,MonthlyCharges,TotalCharges,Churn,...
```

### Output Schema (Standard)
```csv
customer_id,event_date,amount,event_type
```

### Transformation

1. **customerID → customer_id**: Direct mapping
2. **event_date**: Calculated as `base_date - (tenure_months * 30 days)`
   - Example: If tenure = 34 months, last transaction = 34 months ago
3. **amount**: From `MonthlyCharges`
4. **event_type**: Set to `'monthly_charge'`

## Example

**Input (telco_churn.csv):**
```csv
customerID,tenure,MonthlyCharges,TotalCharges,Churn
7590-VHVEG,1,29.85,29.85,No
5575-GNVDE,34,56.95,1889.5,No
3668-QPYBK,2,53.85,108.15,Yes
```

**Output (telco_churn_normalized.csv):**
```csv
customer_id,event_date,amount,event_type
7590-VHVEG,2025-11-02,29.85,monthly_charge
5575-GNVDE,2023-02-16,56.95,monthly_charge
3668-QPYBK,2025-10-03,53.85,monthly_charge
```

## Date Calculation

The script calculates `event_date` as:
- **Base date**: Today (or specified `--base-date`)
- **Last transaction date**: `base_date - (tenure_months * 30 days)`

**Example:**
- Today: 2025-12-02
- Customer with tenure = 34 months
- Last transaction: 2025-12-02 - (34 * 30) = 2023-02-16

## Next Steps

After normalization:

1. **Review the normalized CSV**
   ```bash
   head datasets/telco_churn_normalized.csv
   ```

2. **Upload via API**
   ```bash
   curl -X POST "http://localhost:5000/api/v1/churn/organizations/{org_id}/upload-data" \
     -F "file=@datasets/telco_churn_normalized.csv"
   ```

3. **Train Model**
   ```bash
   curl -X POST "http://localhost:5000/api/v1/churn/organizations/{org_id}/train"
   ```

## Files

- **`test_normalize_telco.py`**: Simple test script (recommended)
- **`app/helpers/normalize_telco_dataset.py`**: Advanced helper with options
- **`datasets/telco_churn_normalized.csv`**: Output file (generated)

## Notes

- **Churn labels**: The original dataset has `Churn` and `churned` columns, but we **don't use them**. The system auto-generates churn labels based on inactivity threshold.
- **Tenure = 0**: Customers with 0 tenure get today's date as their transaction date
- **Date approximation**: Uses 30 days per month (approximate, not exact calendar months)

## Validation

The script validates:
- ✅ Required columns present: `customer_id`, `event_date`
- ✅ Date format: YYYY-MM-DD
- ✅ Amount is numeric
- ✅ All customers have at least one transaction

