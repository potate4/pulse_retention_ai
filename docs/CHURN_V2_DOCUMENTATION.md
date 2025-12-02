# Churn Prediction V2 - Complete Documentation

## Overview

This is a complete rewrite of the churn prediction system with a simplified, storage-first approach. The new system:

1. **Uploads CSV files to Supabase storage** (not database)
2. **Engineers features from CSV** and stores feature dataset in Supabase
3. **Trains models in background** using stored datasets
4. **Provides real-time predictions** for individual customers

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Upload CSV                                             │
│  ┌──────────────┐                                               │
│  │  User uploads│──────► Supabase Storage (datasets bucket)     │
│  │  CSV file    │         └── org_<org_id>/raw/<uuid>.csv       │
│  └──────────────┘         Database stores URL only              │
│                                                                  │
│  Step 2: Feature Engineering (Background Task)                  │
│  ┌──────────────┐                                               │
│  │  Download CSV│──────► Calculate RFM features                 │
│  │  from Supabase        ├── Recency Score                      │
│  └──────────────┘         ├── Frequency Score                   │
│         │                 ├── Monetary Score                    │
│         │                 ├── Engagement Score                  │
│         │                 ├── Tenure Days                       │
│         │                 ├── Activity Trend                    │
│         │                 ├── Avg Transaction Value             │
│         │                 └── Days Between Transactions         │
│         │                                                        │
│         └────────► Upload features CSV to Supabase              │
│                    (utils bucket: org_<org_id>/features/)       │
│                                                                  │
│  Step 3: Train Model (Background Task)                          │
│  ┌──────────────┐                                               │
│  │ Download     │──────► Train ML Model                         │
│  │ features CSV │         ├── Logistic Regression (default)     │
│  └──────────────┘         ├── Random Forest                     │
│         │                 └── Gradient Boosting                 │
│         │                                                        │
│         └────────► Save model locally (models/<org_id>/)        │
│                    Store metadata in database                   │
│                                                                  │
│  Step 4: Predict                                                │
│  ┌──────────────┐                                               │
│  │  Send        │──────► Load trained model                     │
│  │  customer    │──────► Engineer features                      │
│  │  data        │──────► Return churn probability               │
│  └──────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Table: `datasets`

Stores metadata about uploaded CSV files.

```sql
CREATE TABLE datasets (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    dataset_type VARCHAR,  -- 'raw' or 'features'
    file_url VARCHAR,      -- Supabase public URL
    bucket_name VARCHAR,   -- Supabase bucket name
    file_path VARCHAR,     -- Path within bucket
    filename VARCHAR,      -- Original filename
    file_size INTEGER,     -- File size in bytes
    row_count INTEGER,     -- Number of rows
    has_churn_label VARCHAR, -- 'True' or 'False'
    status VARCHAR,        -- 'uploaded', 'processing', 'ready', 'error'
    uploaded_at TIMESTAMP
);
```

### Updated Table: `model_metadata`

Enhanced with new fields for better tracking.

```sql
ALTER TABLE model_metadata ADD COLUMN model_type VARCHAR;
ALTER TABLE model_metadata ADD COLUMN status VARCHAR;
ALTER TABLE model_metadata ADD COLUMN error_message VARCHAR;
ALTER TABLE model_metadata ADD COLUMN f1_score NUMERIC(5,4);
ALTER TABLE model_metadata ADD COLUMN training_samples INTEGER;
ALTER TABLE model_metadata ADD COLUMN churn_rate NUMERIC(5,4);
```

## API Endpoints

All endpoints are prefixed with `/api/v1/churn/v2`

### 1. Upload Dataset

**POST** `/organizations/{org_id}/upload-dataset`

Upload a CSV file with customer transaction data.

**Request:**
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data:**
  - `file`: CSV file (required)
  - `has_churn_label`: boolean (optional, default: false)

**CSV Format (without churn labels):**
```csv
customer_id,event_date,amount,event_type
CUST-001,2024-01-15,150.50,purchase
CUST-002,2024-01-16,75.00,login
CUST-001,2024-01-20,200.00,purchase
```

**CSV Format (with churn labels):**
```csv
customer_id,event_date,amount,event_type,churn_label
CUST-001,2024-01-15,150.50,purchase,0
CUST-002,2024-01-16,75.00,login,1
CUST-001,2024-01-20,200.00,purchase,0
```

**Response:**
```json
{
    "success": true,
    "dataset_id": "123e4567-e89b-12d3-a456-426614174000",
    "file_url": "https://supabase.co/storage/v1/object/public/datasets/...",
    "row_count": 1000,
    "status": "uploaded",
    "message": "Dataset uploaded successfully to Supabase storage"
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/upload-dataset" \
  -F "file=@customer_data.csv" \
  -F "has_churn_label=false"
```

---

### 2. Process Features

**POST** `/organizations/{org_id}/datasets/{dataset_id}/process-features`

Download CSV, calculate RFM features, and upload features CSV to Supabase.

This is a **background task** - it returns immediately and processes asynchronously.

**Request:**
- **Path Parameters:**
  - `org_id`: Organization UUID
  - `dataset_id`: Dataset UUID from Step 1

**Response:**
```json
{
    "success": true,
    "message": "Feature engineering started in background",
    "dataset_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Features Calculated:**
1. **recency_score** (0-100): Days since last activity (higher = more recent)
2. **frequency_score** (0-100): Number of transactions in last 90 days
3. **monetary_score** (0-100): Total value in last 90 days
4. **engagement_score** (0-100): Composite engagement metric
5. **tenure_days**: Days since first transaction
6. **activity_trend**: Slope of activity over last 30 days
7. **avg_transaction_value**: Average amount per transaction
8. **days_between_transactions**: Average gap between activities

**Example:**
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/datasets/{dataset_id}/process-features"
```

---

### 3. Train Model

**POST** `/organizations/{org_id}/train`

Train a churn prediction model using the latest features dataset.

This is a **background task** - it returns immediately and trains asynchronously.

**Request:**
- **Query Parameters:**
  - `model_type` (optional): `logistic_regression` (default), `random_forest`, or `gradient_boosting`

**Response:**
```json
{
    "success": true,
    "message": "Model training started in background",
    "model_type": "logistic_regression"
}
```

**Model Types:**
- **logistic_regression**: Fast, interpretable (recommended for most cases)
- **random_forest**: More accurate, slower training
- **gradient_boosting**: Highest accuracy, slowest training

**Example:**
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/train?model_type=logistic_regression"
```

---

### 4. Get Training Status

**GET** `/organizations/{org_id}/training-status`

Get the status and metrics of the latest model training job.

**Response:**
```json
{
    "status": "completed",
    "model_type": "logistic_regression",
    "accuracy": 0.8542,
    "precision": 0.7821,
    "recall": 0.6543,
    "f1_score": 0.7132,
    "roc_auc": 0.8912,
    "training_samples": 1000,
    "churn_rate": 0.2500,
    "trained_at": "2024-12-02T10:30:00",
    "error_message": null
}
```

**Status Values:**
- `not_started`: No training job exists
- `training`: Model is currently training
- `completed`: Training completed successfully
- `failed`: Training failed (see error_message)

**Example:**
```bash
curl "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/training-status"
```

---

### 5. Predict Churn

**POST** `/organizations/{org_id}/predict`

Get churn prediction for a customer based on their transaction history.

**Request Body:**
```json
{
    "customer_id": "CUST-001",
    "transactions": [
        {
            "event_date": "2024-01-15",
            "amount": 150.50,
            "event_type": "purchase"
        },
        {
            "event_date": "2024-01-20",
            "amount": 200.00,
            "event_type": "purchase"
        }
    ]
}
```

**Response:**
```json
{
    "customer_id": "CUST-001",
    "churn_probability": 0.2345,
    "risk_segment": "Low"
}
```

**Risk Segments:**
- **Low**: Churn probability < 0.3
- **Medium**: Churn probability 0.3 - 0.5
- **High**: Churn probability 0.5 - 0.7
- **Critical**: Churn probability ≥ 0.7

**Example:**
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST-001",
    "transactions": [
      {"event_date": "2024-01-15", "amount": 150.50, "event_type": "purchase"},
      {"event_date": "2024-01-20", "amount": 200.00, "event_type": "purchase"}
    ]
  }'
```

---

## Complete Workflow Example

### Step 1: Upload Dataset
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/abc-123/upload-dataset" \
  -F "file=@customer_transactions.csv" \
  -F "has_churn_label=false"
```

**Response:**
```json
{
    "success": true,
    "dataset_id": "dataset-456",
    "file_url": "https://...",
    "row_count": 5000
}
```

### Step 2: Process Features
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/abc-123/datasets/dataset-456/process-features"
```

**Response:**
```json
{
    "success": true,
    "message": "Feature engineering started in background"
}
```

### Step 3: Train Model
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/abc-123/train?model_type=random_forest"
```

**Response:**
```json
{
    "success": true,
    "message": "Model training started in background"
}
```

### Step 4: Check Training Status
```bash
curl "http://localhost:5000/api/v1/churn/v2/organizations/abc-123/training-status"
```

**Response:**
```json
{
    "status": "completed",
    "accuracy": 0.8912,
    "roc_auc": 0.9234,
    ...
}
```

### Step 5: Predict
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/abc-123/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST-789",
    "transactions": [
      {"event_date": "2024-11-01", "amount": 50.00},
      {"event_date": "2024-11-15", "amount": 75.00},
      {"event_date": "2024-11-28", "amount": 100.00}
    ]
  }'
```

**Response:**
```json
{
    "customer_id": "CUST-789",
    "churn_probability": 0.15,
    "risk_segment": "Low"
}
```

---

## Supabase Storage Setup

### Required Buckets

1. **datasets** - For raw customer transaction CSVs
   - Path structure: `org_<org_id>/raw/<uuid>.csv`
   - Public access: Yes

2. **utils** - For engineered features CSVs
   - Path structure: `org_<org_id>/features/features_<dataset_id>.csv`
   - Public access: Yes

### Create Buckets

```sql
-- In Supabase Dashboard > Storage
1. Create bucket 'datasets' (public)
2. Create bucket 'utils' (public)
```

Or via Supabase CLI:
```bash
supabase storage create datasets --public
supabase storage create utils --public
```

---

## Environment Variables

Ensure these are set in your `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

---

## Database Migration

Run this migration to add the new `datasets` table and update `model_metadata`:

```bash
# Auto-generate migration
alembic revision --autogenerate -m "Add datasets table and update model_metadata"

# Apply migration
alembic upgrade head
```

---

## Key Differences from V1

| Feature | V1 (Old) | V2 (New) |
|---------|----------|----------|
| **Data Storage** | PostgreSQL database | Supabase Storage |
| **CSV Upload** | Stored in transactions table | Uploaded to Supabase bucket |
| **Feature Engineering** | Calculated from DB | Calculated from CSV, stored in Supabase |
| **Training** | Synchronous | Asynchronous (background task) |
| **Model Storage** | Local disk only | Local disk + metadata in DB |
| **Scalability** | Limited by DB size | Highly scalable (object storage) |
| **Cost** | High (DB storage expensive) | Low (object storage cheap) |

---

## Benefits of V2

1. **No Database Bloat**: CSV data stays in object storage, not in database
2. **Cost Effective**: Supabase storage is much cheaper than database storage
3. **Scalability**: Can handle massive datasets without DB performance issues
4. **Background Processing**: Long-running tasks don't block API responses
5. **Flexibility**: Easy to retrain models with different datasets
6. **Future-Ready**: Prepared for advanced features like model versioning

---

## Files Created/Modified

### New Files
- `app/db/models/dataset.py` - Dataset storage model
- `app/services/storage.py` - Supabase storage helpers
- `app/services/feature_engineering_csv.py` - CSV-based feature engineering
- `app/services/ml_training.py` - ML training from DataFrames
- `app/api/v1/endpoints/churn_v2.py` - New API endpoints

### Modified Files
- `app/db/models/model_metadata.py` - Added new fields (status, model_type, etc.)
- `app/api/v1/api.py` - Registered new endpoints

---

## Next Steps

1. **Run Database Migration**
   ```bash
   alembic revision --autogenerate -m "Add churn v2 tables"
   alembic upgrade head
   ```

2. **Create Supabase Buckets**
   - Create `datasets` bucket (public)
   - Create `utils` bucket (public)

3. **Test the API**
   - Upload a sample CSV
   - Process features
   - Train a model
   - Test predictions

4. **Monitor Background Tasks**
   - Check logs for feature engineering progress
   - Check training status endpoint for model training

5. **Optional: Add Job Queue**
   - For production, consider using Celery or similar
   - Replace FastAPI BackgroundTasks with proper job queue

---

## Troubleshooting

### Model Training Fails

Check training status:
```bash
curl "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/training-status"
```

Look for `error_message` in response.

### Features Not Processing

- Check that Supabase credentials are correct
- Verify buckets `datasets` and `utils` exist
- Check FastAPI logs for errors

### Prediction Returns 404

Means no trained model exists. Train a model first:
```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/train"
```

---

## Production Considerations

1. **Background Tasks**: Replace FastAPI's BackgroundTasks with Celery for better reliability
2. **Model Versioning**: Implement version tracking for models
3. **A/B Testing**: Support multiple models per organization
4. **Monitoring**: Add logging and metrics for model performance
5. **Caching**: Cache model loading for faster predictions
6. **Rate Limiting**: Add rate limits to prevent API abuse
7. **Authentication**: Ensure proper org-level authentication

---

## Support

For issues or questions, contact the development team or create an issue in the repository.
