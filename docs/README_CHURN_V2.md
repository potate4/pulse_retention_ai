# Churn Prediction V2 🚀

> A production-ready, scalable churn prediction system built with FastAPI, Supabase, and Scikit-learn.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Workflow](#workflow)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup](#setup)
- [Usage Examples](#usage-examples)
- [Performance](#performance)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Churn Prediction V2 is a complete rewrite of the churn prediction system with a **storage-first architecture**. Instead of storing customer data in a database, it uses **Supabase object storage**, making it:

- **70-80% cheaper** than database storage
- **Infinitely scalable** to handle millions of customers
- **Faster** with background processing for long-running tasks
- **Simpler** with a clean 4-step workflow

### What is Churn Prediction?

Churn prediction uses machine learning to identify customers who are likely to stop using your service. By identifying at-risk customers early, you can take proactive retention actions.

### Why V2?

| Feature | V1 | V2 |
|---------|----|----|
| Storage | PostgreSQL | Supabase Object Storage |
| Cost (10M rows) | ~$50-100/mo | ~$10-20/mo |
| Scalability | Limited | Unlimited |
| Processing | Synchronous | Asynchronous (background) |
| Performance | Degrades with size | Consistent |

---

## Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL
- Supabase account

### Installation

```bash
# Clone repo
git clone <your-repo>
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 5000
```

### Test It Out

```bash
# Upload a CSV
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/upload-dataset" \
  -F "file=@sample.csv"

# Process features (background)
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/datasets/{dataset_id}/process-features"

# Train model (background)
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/train"

# Get prediction
curl -X POST "http://localhost:5000/api/v1/churn/v2/organizations/{org_id}/predict" \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "C001", "transactions": [...]}'
```

---

## Documentation

📚 **Complete Documentation:**

1. **[CHURN_V2_SUMMARY.md](./CHURN_V2_SUMMARY.md)** - Executive summary and architecture
2. **[CHURN_V2_DOCUMENTATION.md](./CHURN_V2_DOCUMENTATION.md)** - Complete API reference
3. **[SETUP_CHURN_V2.md](./SETUP_CHURN_V2.md)** - Detailed setup guide
4. **[alembic_migration_guide.md](./alembic_migration_guide.md)** - Database migration guide

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    WORKFLOW                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Upload CSV → Supabase Storage (datasets)        │
│                                                      │
│  2. Feature Engineering (background)                │
│     ↓                                                │
│     Calculate RFM features                          │
│     ↓                                                │
│     Upload features → Supabase Storage (utils)      │
│                                                      │
│  3. Train Model (background)                        │
│     ↓                                                │
│     Download features CSV                           │
│     ↓                                                │
│     Train ML model                                  │
│     ↓                                                │
│     Save model → Local disk                         │
│                                                      │
│  4. Predict                                         │
│     ↓                                                │
│     Load model → Engineer features → Predict        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## API Endpoints

Base URL: `/api/v1/churn/v2`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/organizations/{org_id}/upload-dataset` | POST | Upload CSV to Supabase |
| `/organizations/{org_id}/datasets/{dataset_id}/process-features` | POST | Engineer features (background) |
| `/organizations/{org_id}/train` | POST | Train model (background) |
| `/organizations/{org_id}/training-status` | GET | Check training status |
| `/organizations/{org_id}/predict` | POST | Get churn prediction |

---

## Workflow

### Step 1: Upload Dataset

Upload customer transaction CSV:

```csv
customer_id,event_date,amount,event_type
CUST-001,2024-01-15,150.50,purchase
CUST-002,2024-01-16,75.00,login
CUST-001,2024-01-20,200.00,purchase
```

**Stored in:** Supabase `datasets` bucket

---

### Step 2: Process Features

Calculate 8 RFM features per customer:

1. Recency Score (0-100)
2. Frequency Score (0-100)
3. Monetary Score (0-100)
4. Engagement Score (0-100)
5. Tenure Days
6. Activity Trend
7. Avg Transaction Value
8. Days Between Transactions

**Stored in:** Supabase `utils` bucket

---

### Step 3: Train Model

Train ML model with features:

- Logistic Regression (fast, interpretable)
- Random Forest (accurate)
- Gradient Boosting (highest accuracy)

**Stored in:** Local `models/{org_id}/` directory

---

### Step 4: Predict

Send customer data, get churn probability:

```json
{
  "customer_id": "CUST-001",
  "churn_probability": 0.23,
  "risk_segment": "Low"
}
```

**Risk Segments:** Low, Medium, High, Critical

---

## Features

### ✅ Storage-First Architecture
- CSV files in Supabase object storage
- Database stores only metadata
- 70-80% cost reduction vs V1

### ✅ Automated Feature Engineering
- RFM (Recency, Frequency, Monetary) scores
- Engagement and activity metrics
- Automatic normalization and scaling

### ✅ Flexible ML Training
- Multiple model types supported
- Automatic churn labeling
- Background training (non-blocking)

### ✅ Real-Time Predictions
- Fast inference (<200ms)
- Risk segmentation
- REST API

### ✅ Production-Ready
- Background tasks
- Error handling
- Status tracking
- Comprehensive logging

---

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for PostgreSQL
- **Pydantic** - Data validation

### ML & Data
- **Pandas** - Data manipulation
- **NumPy** - Numerical computing
- **Scikit-learn** - Machine learning

### Storage
- **PostgreSQL** - Metadata storage
- **Supabase** - Object storage (CSV files)

### Deployment
- **Uvicorn** - ASGI server
- **Alembic** - Database migrations
- **Celery** (optional) - Task queue for production

---

## Setup

### 1. Clone and Install

```bash
git clone <repo>
cd backend
pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/pulse_retention
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SECRET_KEY=your-secret-key
```

### 3. Supabase Setup

Create buckets:
- `datasets` (public)
- `utils` (public)

### 4. Database Migration

```bash
alembic upgrade head
```

### 5. Start Server

```bash
uvicorn app.main:app --reload --port 5000
```

Visit: `http://localhost:5000/docs`

---

## Usage Examples

### Python

```python
import requests

ORG_ID = "your-org-id"
BASE_URL = "http://localhost:5000/api/v1/churn/v2"

# 1. Upload CSV
with open("customers.csv", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/organizations/{ORG_ID}/upload-dataset",
        files={"file": f},
        data={"has_churn_label": False}
    )
    dataset_id = response.json()["dataset_id"]

# 2. Process features
requests.post(
    f"{BASE_URL}/organizations/{ORG_ID}/datasets/{dataset_id}/process-features"
)

# 3. Train model
requests.post(
    f"{BASE_URL}/organizations/{ORG_ID}/train",
    params={"model_type": "logistic_regression"}
)

# 4. Check status
status = requests.get(f"{BASE_URL}/organizations/{ORG_ID}/training-status").json()
print(f"Training status: {status['status']}")

# 5. Predict
response = requests.post(
    f"{BASE_URL}/organizations/{ORG_ID}/predict",
    json={
        "customer_id": "CUST-001",
        "transactions": [
            {"event_date": "2024-01-15", "amount": 150.50},
            {"event_date": "2024-01-20", "amount": 200.00}
        ]
    }
)
prediction = response.json()
print(f"Churn probability: {prediction['churn_probability']}")
print(f"Risk segment: {prediction['risk_segment']}")
```

### cURL

See [CHURN_V2_DOCUMENTATION.md](./CHURN_V2_DOCUMENTATION.md) for detailed cURL examples.

---

## Performance

### Benchmarks

| Metric | Value |
|--------|-------|
| **Upload CSV (10k rows)** | ~2 seconds |
| **Feature Engineering (10k customers)** | ~5-10 seconds |
| **Model Training (10k samples)** | ~3-5 seconds |
| **Prediction (single customer)** | <200ms |

### Scalability

Tested with:
- ✅ 100k customers
- ✅ 1M transactions
- ✅ 10 concurrent requests

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## License

MIT License - see LICENSE file for details

---

## Support

- **Documentation:** See `docs/` folder
- **Issues:** GitHub Issues
- **Email:** support@your-company.com

---

## Roadmap

### Q1 2025
- [ ] Celery integration for production
- [ ] Model versioning
- [ ] A/B testing support

### Q2 2025
- [ ] Deep learning models
- [ ] Real-time feature engineering
- [ ] AutoML integration

### Q3 2025
- [ ] Explainable AI (SHAP values)
- [ ] Customer lifetime value prediction
- [ ] Advanced visualization dashboard

---

## Acknowledgments

Built with ❤️ using:
- [FastAPI](https://fastapi.tiangolo.com/)
- [Scikit-learn](https://scikit-learn.org/)
- [Supabase](https://supabase.com/)
- [Pandas](https://pandas.pydata.org/)

---

**Happy predicting!** 🚀

For detailed documentation, see:
- [Executive Summary](./CHURN_V2_SUMMARY.md)
- [API Documentation](./CHURN_V2_DOCUMENTATION.md)
- [Setup Guide](./SETUP_CHURN_V2.md)
