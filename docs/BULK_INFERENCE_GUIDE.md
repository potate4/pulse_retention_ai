# Bulk Inference Guide - Churn Prediction V2

## Overview

The bulk inference endpoint allows organizations to upload a CSV with multiple customers and get churn predictions for all of them. Results are stored in the database for future reference.

---

## New Database Tables

### `prediction_batches`
Tracks each bulk prediction job.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Batch ID |
| organization_id | UUID | Organization |
| batch_name | VARCHAR | Optional name |
| total_customers | INTEGER | Number of customers |
| input_file_url | VARCHAR | Uploaded CSV URL (Supabase) |
| output_file_url | VARCHAR | Predictions CSV URL (Supabase) |
| status | VARCHAR | processing, completed, failed |
| avg_churn_probability | VARCHAR | Average probability |
| risk_distribution | JSONB | {"Low": 100, "Medium": 50, ...} |
| created_at | TIMESTAMP | When batch was created |
| completed_at | TIMESTAMP | When processing finished |

### `customer_predictions`
Individual predictions within a batch.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Prediction ID |
| batch_id | UUID | Parent batch |
| organization_id | UUID | Organization |
| external_customer_id | VARCHAR | Customer ID from CSV |
| churn_probability | VARCHAR | Probability (0.0 to 1.0) |
| risk_segment | VARCHAR | Low, Medium, High, Critical |
| features | JSONB | 8 RFM features |
| predicted_at | TIMESTAMP | Prediction timestamp |

---

## API Endpoints

### 1. Upload CSV for Bulk Prediction

**POST** `/api/v1/churn/v2/organizations/{org_id}/predict-bulk`

Upload a CSV and get predictions for all customers.

**Request:**
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/predict-bulk" \
  -F "file=@customers.csv" \
  -F "batch_name=December 2024 Predictions"
```

**CSV Format:**
```csv
customer_id,event_date,amount,event_type
CUST-001,2024-01-15,150.50,purchase
CUST-001,2024-01-20,200.00,purchase
CUST-002,2024-01-16,75.00,login
CUST-002,2024-01-25,50.00,purchase
```

**Response:**
```json
{
  "success": true,
  "batch_id": "abc-123-def",
  "batch_name": "December 2024 Predictions",
  "total_customers": 100,
  "status": "processing",
  "message": "Predictions are being generated in background..."
}
```

---

### 2. Check Batch Status

**GET** `/api/v1/churn/v2/organizations/{org_id}/prediction-batches/{batch_id}`

Check the status of a prediction batch.

**Request:**
```bash
curl "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/prediction-batches/{batch_id}"
```

**Response:**
```json
{
  "batch_id": "abc-123-def",
  "batch_name": "December 2024 Predictions",
  "status": "completed",
  "total_customers": 100,
  "predictions_generated": 100,
  "input_file_url": "https://supabase.co/.../input.csv",
  "output_file_url": "https://supabase.co/.../predictions.csv",
  "avg_churn_probability": "0.3245",
  "risk_distribution": {
    "Low": 45,
    "Medium": 30,
    "High": 15,
    "Critical": 10
  },
  "created_at": "2024-12-02T10:00:00",
  "completed_at": "2024-12-02T10:05:00",
  "error_message": null
}
```

---

### 3. Get Individual Predictions

**GET** `/api/v1/churn/v2/organizations/{org_id}/prediction-batches/{batch_id}/predictions`

Get individual customer predictions from a batch (paginated).

**Request:**
```bash
curl "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/prediction-batches/{batch_id}/predictions?limit=100&offset=0"
```

**Response:**
```json
{
  "batch_id": "abc-123-def",
  "total": 100,
  "limit": 100,
  "offset": 0,
  "predictions": [
    {
      "customer_id": "CUST-001",
      "churn_probability": "0.2345",
      "risk_segment": "Low",
      "features": {
        "recency_score": 85.5,
        "frequency_score": 65.2,
        "monetary_score": 70.1,
        "engagement_score": 75.3,
        "tenure_days": 180,
        "activity_trend": 0.5,
        "avg_transaction_value": 125.50,
        "days_between_transactions": 15.2
      },
      "predicted_at": "2024-12-02T10:05:00"
    },
    {
      "customer_id": "CUST-002",
      "churn_probability": "0.7821",
      "risk_segment": "Critical",
      "features": {...},
      "predicted_at": "2024-12-02T10:05:00"
    }
  ]
}
```

---

### 4. List All Batches

**GET** `/api/v1/churn/v2/organizations/{org_id}/prediction-batches`

List all prediction batches for an organization.

**Request:**
```bash
curl "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/prediction-batches?limit=20&offset=0"
```

**Response:**
```json
{
  "total": 5,
  "limit": 20,
  "offset": 0,
  "batches": [
    {
      "batch_id": "abc-123",
      "batch_name": "December 2024",
      "status": "completed",
      "total_customers": 100,
      "avg_churn_probability": "0.3245",
      "risk_distribution": {...},
      "created_at": "2024-12-02T10:00:00",
      "completed_at": "2024-12-02T10:05:00",
      "output_file_url": "https://..."
    }
  ]
}
```

---

## Complete Workflow Example

### Step 1: Upload CSV for Predictions

```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/my-org-id/predict-bulk" \
  -F "file=@december_customers.csv" \
  -F "batch_name=December 2024 Predictions"
```

**Response:**
```json
{
  "batch_id": "abc-123-def",
  "status": "processing"
}
```

### Step 2: Check Status (wait a few seconds)

```bash
curl "http://localhost:5000/api/v1/churn/v2/organizations/my-org-id/prediction-batches/abc-123-def"
```

**Response:**
```json
{
  "status": "completed",
  "output_file_url": "https://supabase.co/.../predictions.csv",
  "risk_distribution": {
    "Low": 45,
    "Medium": 30,
    "High": 15,
    "Critical": 10
  }
}
```

### Step 3: Download Results CSV

The `output_file_url` contains a CSV with all predictions:

```csv
customer_id,churn_probability,risk_segment
CUST-001,0.2345,Low
CUST-002,0.7821,Critical
CUST-003,0.4521,Medium
...
```

### Step 4: Query Individual Predictions from Database

```bash
curl "http://localhost:5000/api/v1/churn/v2/organizations/my-org-id/prediction-batches/abc-123-def/predictions"
```

Get paginated results with full feature details.

---

## What Happens in the Background?

When you upload a CSV:

1. **Upload to Supabase** - Input CSV stored in `utils` bucket
2. **Create Batch Record** - Entry created in `prediction_batches` table
3. **Feature Engineering** - Calculate 8 RFM features for each customer
4. **Run Inference** - Load trained model and predict churn probability
5. **Store in Database** - Save predictions to `customer_predictions` table
6. **Upload Results** - Generate predictions CSV and upload to Supabase
7. **Update Batch** - Mark as completed with summary statistics

---

## Use Cases

### 1. Monthly Churn Reports
Upload all active customers once per month to track churn risk over time.

### 2. Campaign Targeting
Upload customer list, filter by risk segment, export high-risk customers for retention campaigns.

### 3. Cohort Analysis
Upload different customer cohorts (new vs. old, premium vs. free) to compare churn rates.

### 4. A/B Testing
Compare predictions before and after product changes or interventions.

---

## Database Migration

Run migrations to create the new tables:

```bash
alembic revision --autogenerate -m "Add prediction batches for bulk inference"
alembic upgrade head
```

Expected tables:
- `prediction_batches`
- `customer_predictions`

---

## Benefits

✅ **Bulk Processing** - Handle thousands of customers at once
✅ **Database Storage** - All predictions saved for historical tracking
✅ **CSV Export** - Easy to download and share results
✅ **Summary Statistics** - Risk distribution and averages
✅ **Pagination** - Query large result sets efficiently
✅ **Background Processing** - Non-blocking API

---

## Performance

- **Feature Engineering**: ~0.5 seconds per 1000 customers
- **Inference**: ~0.2 seconds per 1000 customers
- **Database Storage**: ~1 second per 1000 customers
- **Total**: ~2-3 seconds per 1000 customers

For 10,000 customers: ~20-30 seconds total processing time.

---

## Limitations

- Maximum file size: 50MB (configurable in Supabase)
- Recommended batch size: <100,000 customers per upload
- Predictions expire: None (stored permanently unless deleted)

---

## Error Handling

If batch status is `"failed"`, check the `error_message` field:

```json
{
  "status": "failed",
  "error_message": "No trained model found for organization"
}
```

Common errors:
- **No trained model**: Train a model first using `/train` endpoint
- **Invalid CSV format**: Ensure CSV has `customer_id` and `event_date` columns
- **Insufficient data**: Each customer needs at least one transaction

---

## Next Steps

1. **Run Migration**: Create the new database tables
2. **Train Model**: Ensure you have a trained model
3. **Upload CSV**: Test with a small dataset first
4. **Check Results**: Query predictions from database
5. **Integrate**: Use predictions in your application

---

Happy predicting! 🎯
