# Sheba Retention AI - MVP Plan (Simplified)

## MVP Goal

**Working demo** showing: Churn prediction → Customer segmentation → Intervention recommendations → Dashboard visualization

## Core Components (Minimal Viable)

### 1. Data Generation (`backend/data/generator.py`)

**Purpose:** Create 10K realistic customers with booking history

- Customer profiles: ID, name, location, last_booking_date, num_bookings, avg_spent, complaints_count, searched_competitor
- Churn label: 1 if >60 days inactive
- Bangladesh patterns: Seasonal spikes (AC summer, Eid cleaning), bKash payments (65%)
- Export to CSV/PostgreSQL

### 2. ML Models (`backend/ml/`)

**Only 2 models needed:**

- **Churn Model** (`churn_model.py`): XGBoost predicting churn probability (0-1)
- **Segmentation** (`segmentation.py`): K-Means clustering (3-5 segments: Price-Sensitive, High-Value, Quality-Focused)

**Skip for MVP:** LTV model (use simple calculation), Loyalty tier engine, Intervention engine (use rules)

### 3. Backend API (`backend/main.py` - Single FastAPI file)

**Essential endpoints only:**

- `POST /predict/churn` - Get churn prediction for customer
- `GET /predictions/at-risk` - List high-risk customers
- `GET /predictions/dashboard` - Summary stats
- `GET /customers/{id}` - Customer profile with predictions
- `GET /segments` - Customer segment distribution
- `POST /interventions/recommend` - Get intervention suggestion for customer

**Skip:** Admin endpoints, model retraining, complex analytics

### 4. Database (SQLite for MVP)

**Simple schema:**

- `customers` table: All customer data + predictions
- `interventions` table: Intervention history (optional for MVP)

**Skip:** Separate tables for loyalty, segments (store in customers table as JSON columns)

### 5. Frontend Dashboard (`frontend/src/App.jsx`)

**Single page dashboard with:**

- **Top section:** KPI cards (Total customers, At-risk count, Retention rate)
- **Middle section:** Table of at-risk customers with churn %, segment, suggested action
- **Bottom section:** Segment distribution pie chart
- **Click customer:** Modal showing customer details + SHAP explanations

**Skip:** Separate admin/analyst/customer portals, complex analytics pages

### 6. Intervention Engine (Rules-based, not ML)

**Simple rules:**

```python
if churn_risk > 0.7 and segment == "Price-Sensitive":
    action = "Tk 300 discount"
elif churn_risk > 0.7 and segment == "High-Value":
    action = "Tk 500 discount"
elif churn_risk > 0.5:
    action = "Maintenance reminder"
else:
    action = "No action needed"
```

**Skip:** Collaborative filtering, complex ROI calculations, approval workflow (auto-approve for demo)

### 7. SHAP Explainability (`backend/ml/explainability.py`)

**Simple integration:**

- Generate SHAP values for top 3 features
- Human-readable explanations: "High churn risk due to: 52 days inactive (+0.34), competitor search (+0.21), price sensitivity (+0.13)"

## MVP File Structure

```
sheba-retention-ai/
├── backend/
│   ├── main.py              # Single FastAPI app
│   ├── data/
│   │   └── generator.py      # Data generation
│   ├── ml/
│   │   ├── churn_model.py   # Churn prediction
│   │   ├── segmentation.py  # Customer clustering
│   │   └── explainability.py # SHAP integration
│   ├── models.pkl            # Trained model files
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Single dashboard page
│   │   ├── components/
│   │   │   ├── ChurnTable.jsx
│   │   │   ├── KPICards.jsx
│   │   │   └── SegmentChart.jsx
│   │   └── index.js
│   └── package.json
├── data/
│   └── customers.csv        # Generated data
└── README.md
```

## Tech Stack (Minimal)

- **Backend:** FastAPI, XGBoost, scikit-learn, SHAP, SQLite
- **Frontend:** React, Recharts (charts), Axios, TailwindCSS
- **Deployment:** Single command (uvicorn + npm serve), or Railway free tier

## MVP Workflow

1. Generate 10K customers → Save to CSV/DB
2. Train churn + segmentation models → Save .pkl files
3. Load models in FastAPI → Serve predictions
4. React dashboard fetches data → Visualizes at-risk customers
5. Click customer → Show intervention recommendation + SHAP explanation

## Demo Features (What judges see)

✅ **Predict churn** for 10K customers with 80%+ accuracy

✅ **Segment customers** into 3-5 groups

✅ **Personalized interventions** based on risk + segment

✅ **Live dashboard** showing at-risk customers

✅ **Explainable AI** - Why each customer is at risk

✅ **Bangladesh-specific** patterns (seasonal, payment methods)

## What's NOT in MVP (Save for later)

❌ LTV prediction model

❌ Loyalty tier system

❌ Notification service

❌ Payment integration

❌ Multiple dashboards

❌ Approval workflow

❌ Complex analytics

❌ Docker deployment

❌ Comprehensive testing

❌ Bengali language UI

## Success Criteria

- **Churn model accuracy:** >75% (MVP acceptable)
- **Dashboard loads:** <3 seconds
- **API response time:** <500ms
- **Demo works end-to-end:** From data → prediction → dashboard → intervention

## Timeline (24 Hours)

**Hours 0-4:** Data generation + ML model training

**Hours 4-8:** FastAPI backend with core endpoints

**Hours 8-12:** React dashboard

**Hours 12-16:** Integration + SHAP explainability

**Hours 16-20:** Polish UI + demo preparation

**Hours 20-24:** Testing + deployment