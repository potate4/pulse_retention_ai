# Churn Prediction Engine - Implementation Summary

## Overview

This implementation provides a complete churn prediction pipeline that:
1. Accepts CSV uploads from organizations (must follow standard schema)
2. Normalizes and validates data
3. Calculates RFM (Recency, Frequency, Monetary) features
4. Trains churn prediction models (Logistic Regression)
5. Generates churn predictions for customers

## Database Schema

The following tables have been created:
- `organizations` - Multi-tenant organization data
- `customers` - Customer records per organization
- `transactions` - Normalized transaction/activity data
- `customer_features` - Pre-computed RFM and engagement features
- `churn_predictions` - Churn probability scores and risk segments
- `model_metadata` - Trained model information and metrics
- `data_processing_status` - Processing status tracking

## API Endpoints

### Data Ingestion

1. **POST `/api/v1/churn/organizations/{org_id}/upload-data`**
   - Upload CSV file (must follow standard schema)
   - Normalize and validate data
   - Store transactions in database
   - Calculate features automatically
   - Returns: success, records_stored, features_calculated, errors

2. **GET `/api/v1/churn/organizations/{org_id}/data/status`**
   - Get data processing status
   - Returns: status, records_processed, errors

### Model Training

3. **POST `/api/v1/churn/organizations/{org_id}/train`**
   - Trigger model training
   - Returns: model_path, metrics (accuracy, precision, recall, roc_auc)

4. **GET `/api/v1/churn/organizations/{org_id}/model/status`**
   - Get model training status
   - Returns: status, metrics, trained_at

### Predictions

5. **GET `/api/v1/churn/organizations/{org_id}/customers/{customer_id}/churn-risk`**
   - Get churn prediction for single customer
   - Returns: churn_probability, risk_segment

6. **POST `/api/v1/churn/organizations/{org_id}/customers/batch-score`**
   - Batch score all customers
   - Store predictions in database
   - Returns: predictions_stored count

## Usage Flow

1. **Create Organization** (manually in DB or via migration)
   ```python
   org = Organization(
       id=uuid.uuid4(),
       name="Acme Corp",
       churn_threshold_days=30
   )
   ```

2. **Upload Data** (CSV must follow standard schema)
   ```bash
   curl -X POST "http://localhost:5000/api/v1/churn/organizations/{org_id}/upload-data" \
     -F "file=@customer_data.csv"
   ```
   
   **CSV Format Example:**
   ```csv
   customer_id,event_date,amount,event_type
   CUST-001,2024-01-15,150.50,purchase
   CUST-002,2024-01-16,75.00,login
   CUST-001,2024-01-20,200.00,purchase
   ```

3. **Train Model**
   ```bash
   curl -X POST "http://localhost:5000/api/v1/churn/organizations/{org_id}/train"
   ```

4. **Get Predictions**
   ```bash
   curl "http://localhost:5000/api/v1/churn/organizations/{org_id}/customers/{customer_id}/churn-risk"
   ```

## Standard Schema

**IMPORTANT:** Uploaded CSV files must follow this exact schema. The system does not perform automatic column mapping.

### Required Columns:
- `customer_id` (string): Customer identifier
- `event_date` (date): Transaction/activity date in YYYY-MM-DD format

### Optional Columns:
- `amount` (float): Transaction value
- `event_type` (string): Type of event ('purchase', 'login', 'usage', etc.)

### Additional Columns:
Any other columns in the CSV will be stored in the `metadata` field as JSON.

### Churn Labels:
**No churn label required in CSV!** The system automatically labels customers as churned based on inactivity threshold (configurable per organization, default: 30 days). See `TRAINING_SCHEMA.md` for details.

### Example CSV:
```csv
customer_id,event_date,amount,event_type,region,product_category
CUST-001,2024-01-15,150.50,purchase,North,Electronics
CUST-002,2024-01-16,75.00,login,South,Clothing
CUST-001,2024-01-20,200.00,purchase,North,Electronics
```

In this example:
- `customer_id`, `event_date`, `amount`, `event_type` are mapped to standard fields
- `region` and `product_category` are stored in `metadata` JSON field

## Feature Engineering

The system calculates:
- **Recency Score** (0-100): Days since last activity
- **Frequency Score** (0-100): Number of transactions in last 90 days
- **Monetary Score** (0-100): Total value in last 90 days
- **Engagement Score** (0-100): Composite engagement metric
- **Tenure Days**: Days since first transaction
- **Activity Trend**: Slope of activity over last 30 days
- **Avg Transaction Value**: Average amount per transaction
- **Days Between Transactions**: Average gap between activities

## Churn Labeling

**Churn labels are automatically generated** - no label column needed in CSV!

- System uses organization's `churn_threshold_days` (default: 30 days)
- Customer is labeled as **churned (1)** if inactive for >= threshold days
- Customer is labeled as **active (0)** if inactive for < threshold days
- Labels are calculated at training time based on last transaction date

See `TRAINING_SCHEMA.md` for complete details.

## Model Details

- **Algorithm**: Logistic Regression (with class balancing)
- **Features**: 8 features (RFM + engagement metrics)
- **Output**: Churn probability (0.0 to 1.0)
- **Risk Segments**: Low (<0.3), Medium (0.3-0.5), High (0.5-0.7), Critical (>=0.7)

## Files Created

### Database Models
- `app/db/models/organization.py`
- `app/db/models/customer.py`
- `app/db/models/transaction.py`
- `app/db/models/customer_feature.py`
- `app/db/models/churn_prediction.py`
- `app/db/models/model_metadata.py`
- `app/db/models/data_processing_status.py`

### Services
- `app/services/data_ingestion.py` - CSV upload, data normalization (assumes standard schema)
- `app/services/feature_engineering.py` - RFM calculation, feature extraction
- `app/services/churn_labeling.py` - Churn labeling logic
- `app/services/ml_pipeline.py` - Model training and evaluation
- `app/services/churn_predictor.py` - Prediction service

### API
- `app/api/v1/endpoints/churn.py` - REST API endpoints
- `app/schemas/churn.py` - Pydantic schemas

## Next Steps

1. Run Alembic migration to create database tables:
   ```bash
   alembic revision --autogenerate -m "Add churn prediction tables"
   alembic upgrade head
   ```

2. Install dependencies:
   ```bash
   pip install pandas scikit-learn joblib
   ```

3. Test the API with sample CSV data

4. Create seed data script for demo organizations

