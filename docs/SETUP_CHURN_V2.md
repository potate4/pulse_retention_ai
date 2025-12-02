# Churn Prediction V2 - Setup Guide

## Quick Start

Follow these steps to get the new churn prediction system up and running.

---

## 1. Prerequisites

- Python 3.8+
- PostgreSQL database
- Supabase account and project
- Required Python packages installed

---

## 2. Install Dependencies

```bash
cd backend
pip install fastapi uvicorn pandas numpy scikit-learn joblib sqlalchemy psycopg2-binary supabase
```

Or if you have a requirements.txt:
```bash
pip install -r requirements.txt
```

---

## 3. Environment Variables

Create or update your `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pulse_retention

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## 4. Setup Supabase Storage

### Option A: Via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Storage**
3. Create two new buckets:
   - **Name:** `datasets`
     - **Public:** Yes
     - **File size limit:** 50MB (or as needed)

   - **Name:** `utils`
     - **Public:** Yes
     - **File size limit:** 50MB (or as needed)

### Option B: Via Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Create buckets
supabase storage create datasets --public
supabase storage create utils --public
```

---

## 5. Database Migration

Generate and run migrations for the new tables:

```bash
# Auto-generate migration (from backend directory)
alembic revision --autogenerate -m "Add churn v2 tables - datasets and model_metadata updates"

# Review the generated migration file in alembic/versions/

# Apply migration
alembic upgrade head
```

Expected tables after migration:
- `datasets` - New table for dataset metadata
- `model_metadata` - Updated with new columns (status, model_type, f1_score, etc.)

---

## 6. Create Test Organization

If you don't have an organization yet, create one:

```python
# Python script or via psql
from app.db.session import SessionLocal
from app.db.models.organization import Organization
import uuid

db = SessionLocal()

org = Organization(
    id=uuid.uuid4(),
    name="Test Organization",
    churn_threshold_days=30
)

db.add(org)
db.commit()
db.refresh(org)

print(f"Organization created with ID: {org.id}")
db.close()
```

Or via SQL:

```sql
INSERT INTO organizations (id, name, churn_threshold_days, created_at)
VALUES (
    gen_random_uuid(),
    'Test Organization',
    30,
    NOW()
)
RETURNING id;
```

---

## 7. Start the Server

```bash
cd backend
uvicorn app.main:app --reload --port 5000
```

Server should start at `http://localhost:5000`

Check API docs at: `http://localhost:5000/docs`

---

## 8. Test the API

### Prepare Test Data

Create a sample CSV file `test_customers.csv`:

```csv
customer_id,event_date,amount,event_type
CUST-001,2024-01-15,150.50,purchase
CUST-001,2024-01-20,200.00,purchase
CUST-001,2024-02-01,100.00,purchase
CUST-002,2024-01-16,75.00,login
CUST-002,2024-01-25,50.00,purchase
CUST-003,2024-01-10,300.00,purchase
CUST-003,2024-01-12,250.00,purchase
CUST-003,2024-01-18,400.00,purchase
CUST-003,2024-02-05,350.00,purchase
```

### Test Workflow

Replace `{org_id}` with your organization ID from step 6.

#### Step 1: Upload Dataset

```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/upload-dataset" \
  -F "file=@test_customers.csv" \
  -F "has_churn_label=false"
```

Save the `dataset_id` from the response.

#### Step 2: Process Features

```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/datasets/{dataset_id}/process-features"
```

Wait a few seconds for processing to complete.

#### Step 3: Train Model

```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/train"
```

#### Step 4: Check Training Status

```bash
curl "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/training-status"
```

Wait until `status` is `"completed"`.

#### Step 5: Predict

```bash
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "TEST-001",
    "transactions": [
      {"event_date": "2024-11-01", "amount": 50.00, "event_type": "purchase"},
      {"event_date": "2024-11-15", "amount": 75.00, "event_type": "purchase"}
    ]
  }'
```

You should get a response with churn probability and risk segment!

---

## 9. Verify Supabase Storage

1. Go to Supabase Dashboard > Storage
2. Check `datasets` bucket:
   - Should see folders like `org_{org_id}/raw/`
   - Should have your uploaded CSV file

3. Check `utils` bucket:
   - Should see folders like `org_{org_id}/features/`
   - Should have the generated features CSV

---

## 10. Verify Local Model Storage

```bash
ls -la backend/models/{org_id}/

# Should see:
# churn_model.pkl
# model_metadata.json
```

---

## Troubleshooting

### Issue: "Dataset not found"
- Make sure you're using the correct `dataset_id` from Step 1
- Check that the organization ID is correct

### Issue: "No trained model found"
- Make sure training completed successfully
- Check training status endpoint
- Look for errors in server logs

### Issue: "Supabase upload failed"
- Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Check that buckets `datasets` and `utils` exist and are public
- Check Supabase dashboard for storage errors

### Issue: "Background task not running"
- Check server logs for errors
- Background tasks run in the same process as FastAPI
- For production, consider using Celery

### Issue: Database connection errors
- Verify DATABASE_URL is correct
- Make sure PostgreSQL is running
- Run migrations: `alembic upgrade head`

---

## Next Steps

1. **Integrate with Frontend**
   - Build UI for uploading CSVs
   - Show training progress
   - Display churn predictions

2. **Add Authentication**
   - Secure endpoints with JWT
   - Implement organization-level access control

3. **Improve Background Tasks**
   - Replace BackgroundTasks with Celery for production
   - Add progress tracking
   - Implement retry logic

4. **Model Improvements**
   - Experiment with different model types
   - Add hyperparameter tuning
   - Implement cross-validation

5. **Monitoring & Logging**
   - Add structured logging
   - Track model performance metrics
   - Set up alerts for failures

---

## Production Deployment

### Recommended Architecture

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   FastAPI   │─────▶│  PostgreSQL  │
│   Server    │      │   Database   │
└──────┬──────┘      └──────────────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   Celery    │─────▶│    Redis     │
│   Workers   │      │  (Queue)     │
└─────────────┘      └──────────────┘
       │
       ▼
┌─────────────┐
│  Supabase   │
│   Storage   │
└─────────────┘
```

### Deployment Checklist

- [ ] Set up PostgreSQL (RDS, Supabase DB, etc.)
- [ ] Configure Supabase storage buckets
- [ ] Deploy FastAPI with Uvicorn + Gunicorn
- [ ] Set up Redis for Celery (if using)
- [ ] Configure environment variables
- [ ] Set up HTTPS/SSL
- [ ] Configure CORS for frontend
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

---

## Support & Documentation

- Full API Documentation: See `CHURN_V2_DOCUMENTATION.md`
- API Interactive Docs: `http://localhost:5000/docs`
- GitHub Issues: Report bugs and request features

---

Happy predicting! 🚀
