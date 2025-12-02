# Sheba Retention AI - MVP Plan

## Core Features (Must Have)

### 1. Churn Prediction Model
- **XGBoost** classifier predicting churn probability (0-1)
- Features: days_since_last_booking, num_bookings, avg_spent, complaints_count, searched_competitor
- Target accuracy: >75%
- Output: Churn probability + risk category (Low/Medium/High/Critical)

### 2. Customer Segmentation
- **K-Means** clustering into 3-5 segments
- Segments: Price-Sensitive, High-Value, Quality-Focused, Loyal, Occasional
- Features: avg_spent, num_bookings, price_sensitivity_score, complaints_count

### 3. Intervention Recommendations
- **Rules-based** engine (not ML for MVP)
- Personalized actions based on churn_risk + segment:
  - High-risk + Price-Sensitive → Tk 300 discount
  - High-risk + High-Value → Tk 500 discount
  - Medium-risk → Maintenance reminder
  - Low-risk → No action

### 4. Dashboard
- Single-page React dashboard:
  - KPI cards: Total customers, At-risk count, Critical risk, Retention rate
  - At-risk customer table with churn %, segment, suggested action
  - Segment distribution pie chart
  - Customer detail modal with SHAP explanations

### 5. SHAP Explainability
- Top 3 features driving churn prediction
- Human-readable: "52 days inactive (+0.34), competitor search (+0.21), price sensitivity (+0.13)"

## What We Skip

❌ LTV prediction model (use simple calculation: avg_spent × expected_bookings)
❌ Loyalty tier system (not critical for demo)
❌ Notification service (just show in dashboard)
❌ Payment integration (mock only)
❌ Multiple user roles (single admin dashboard)
❌ Approval workflow (auto-recommend)
❌ Complex analytics (basic stats only)
❌ Database (use CSV for MVP)
❌ Bengali UI (English only for MVP)

## Tech Stack

- **Backend:** FastAPI, XGBoost, scikit-learn, SHAP
- **Frontend:** React, Recharts, Axios, TailwindCSS
- **Data:** CSV files (10K customers)
- **Deployment:** Local development or Railway free tier

## MVP Structure

```
sheba-retention-ai/
├── backend/
│   ├── main.py              # FastAPI with 5 endpoints
│   ├── data/generator.py     # Synthetic data (10K customers)
│   ├── ml/
│   │   ├── churn_model.py    # XGBoost training
│   │   ├── segmentation.py   # K-Means training
│   │   └── explainability.py # SHAP integration
│   └── models/               # .pkl files
├── frontend/
│   └── src/
│       ├── App.jsx           # Main dashboard
│       └── components/       # KPICards, ChurnTable, SegmentChart, CustomerModal
└── data/
    └── customers.csv         # Generated dataset
```

## API Endpoints (5-6 only)

1. `POST /predict/churn` - Get churn prediction for customer
2. `GET /predictions/at-risk` - List high-risk customers
3. `GET /predictions/dashboard` - Dashboard summary stats
4. ~~`GET /customers/{id}`~~ - ⚠️ **OPTIONAL** - Can be removed, use `/predict/churn` instead
5. `GET /segments` - Segment distribution
6. `POST /interventions/recommend` - Get intervention suggestion

**Recommendation:** Start with 5 endpoints (skip #4). Frontend can call `/predict/churn` when user clicks a customer for details.

## API Structures (Simple Examples)

### 1. POST /predict/churn
**Description:** Predict churn probability for a specific customer

**Request:**
```json
{
  "customer_id": "CUST12345"
}
```

**Response:**
```json
{
  "customer_id": "CUST12345",
  "churn_probability": 0.78,
  "risk_category": "High",
  "top_factors": [
    {"feature": "days_since_last_booking", "value": 52, "impact": 0.34},
    {"feature": "searched_competitor", "value": true, "impact": 0.21},
    {"feature": "complaints_count", "value": 2, "impact": 0.13}
  ]
}
```

**Field Calculations:**
- `churn_probability`: XGBoost model output (trained on historical churn data)
- `risk_category`:
  - Low: 0-0.3
  - Medium: 0.3-0.6
  - High: 0.6-0.8
  - Critical: 0.8-1.0
- `top_factors`: SHAP values (top 3 by absolute impact on prediction)
  - `value`: Actual feature value from customer data
  - `impact`: SHAP value (contribution to churn probability)

---

### 2. GET /predictions/at-risk
**Description:** Retrieve list of high-risk customers (churn probability > 0.6)

**Request:** None (query params optional: `?limit=50`)

**Response:**
```json
{
  "count": 127,
  "customers": [
    {
      "customer_id": "CUST12345",
      "name": "Rahima Khan",
      "churn_probability": 0.78,
      "risk_category": "High",
      "segment": "Price-Sensitive",
      "last_booking_days": 52,
      "total_spent": 4500
    },
    {
      "customer_id": "CUST67890",
      "name": "Ahmed Ali",
      "churn_probability": 0.65,
      "risk_category": "High",
      "segment": "High-Value",
      "last_booking_days": 38,
      "total_spent": 12000
    }
  ]
}
```

**Field Calculations:**
- `count`: Number of customers with churn_probability > 0.6
- `churn_probability`: From churn prediction model
- `risk_category`: Same as endpoint 1
- `segment`: K-Means cluster assignment (from segmentation model)
- `last_booking_days`: `(current_date - last_booking_date).days`
- `total_spent`: `SUM(booking_amount)` across all bookings

---

### 3. GET /predictions/dashboard
**Description:** Get summary statistics for admin dashboard

**Request:** None

**Response:**
```json
{
  "total_customers": 10000,
  "at_risk_count": 127,
  "critical_risk_count": 45,
  "retention_rate": 0.68,
  "avg_churn_probability": 0.32,
  "risk_distribution": {
    "Low": 6500,
    "Medium": 3373,
    "High": 82,
    "Critical": 45
  },
  "segment_distribution": {
    "Price-Sensitive": 3200,
    "High-Value": 1500,
    "Quality-Focused": 2100,
    "Loyal": 2000,
    "Occasional": 1200
  }
}
```

**Field Calculations:**
- `total_customers`: Total count in customer dataset
- `at_risk_count`: Count where churn_probability > 0.6
- `critical_risk_count`: Count where churn_probability > 0.8
- `retention_rate`: `1 - (churned_customers_last_month / active_customers_last_month)`
- `avg_churn_probability`: `MEAN(churn_probability)` across all customers
- `risk_distribution`: Count of customers in each risk category
- `segment_distribution`: Count of customers in each K-Means cluster

---

### 4. GET /customers/{id} ⚠️ OPTIONAL - Consider removing
**Description:** Get detailed customer profile with predictions and history

> **Note:** This endpoint may be redundant for MVP. The at-risk list already shows key info, and we can show detail in a frontend modal by combining data from `/predict/churn`. Consider removing to simplify.

**Request:** Path param: `customer_id` (e.g., `/customers/CUST12345`)

**Response:**
```json
{
  "customer_id": "CUST12345",
  "name": "Rahima Khan",
  "email": "rahima.khan@example.com",
  "phone": "+8801712345678",
  "segment": "Price-Sensitive",
  "churn_prediction": {
    "probability": 0.78,
    "risk_category": "High",
    "predicted_at": "2025-11-02T10:30:00Z"
  },
  "stats": {
    "total_bookings": 8,
    "total_spent": 4500,
    "avg_booking_value": 562.5,
    "days_since_last_booking": 52,
    "complaints_count": 2,
    "searched_competitor": true
  },
  "recent_bookings": [
    {
      "booking_id": "BK001",
      "service": "AC Repair",
      "date": "2025-09-10",
      "amount": 800
    }
  ]
}
```

**Field Calculations (if kept):**
- `total_bookings`: `COUNT(bookings)` for customer
- `total_spent`: `SUM(booking_amount)` for customer
- `avg_booking_value`: `total_spent / total_bookings`
- `days_since_last_booking`: `(current_date - MAX(booking_date)).days`
- `complaints_count`: Count from complaints table/field
- `searched_competitor`: Boolean flag from tracking data
- `recent_bookings`: Last 5 bookings ordered by date DESC

---

### 5. GET /segments
**Description:** Get customer segment distribution and characteristics

**Request:** None

**Response:**
```json
{
  "segments": [
    {
      "name": "Price-Sensitive",
      "count": 3200,
      "avg_spent": 3200,
      "avg_bookings": 5,
      "churn_rate": 0.42,
      "characteristics": "Low spend, high discount usage"
    },
    {
      "name": "High-Value",
      "count": 1500,
      "avg_spent": 15000,
      "avg_bookings": 12,
      "churn_rate": 0.18,
      "characteristics": "High spend, premium services"
    },
    {
      "name": "Quality-Focused",
      "count": 2100,
      "avg_spent": 8500,
      "avg_bookings": 8,
      "churn_rate": 0.25,
      "characteristics": "High ratings focus"
    },
    {
      "name": "Loyal",
      "count": 2000,
      "avg_spent": 6000,
      "avg_bookings": 15,
      "churn_rate": 0.12,
      "characteristics": "Regular bookings"
    },
    {
      "name": "Occasional",
      "count": 1200,
      "avg_spent": 1800,
      "avg_bookings": 2,
      "churn_rate": 0.65,
      "characteristics": "Infrequent users"
    }
  ]
}
```

**Field Calculations:**
- `name`: Manually labeled based on K-Means cluster characteristics
- `count`: Number of customers assigned to this cluster
- `avg_spent`: `MEAN(total_spent)` for customers in segment
- `avg_bookings`: `MEAN(total_bookings)` for customers in segment
- `churn_rate`: `(churned_customers_in_segment / total_customers_in_segment)`
- `characteristics`: Manual description based on segment analysis

---

### 6. POST /interventions/recommend
**Description:** Get personalized intervention recommendation based on churn risk and segment

**Request:**
```json
{
  "customer_id": "CUST12345"
}
```

**Response:**
```json
{
  "customer_id": "CUST12345",
  "churn_probability": 0.78,
  "segment": "Price-Sensitive",
  "recommendation": {
    "action": "discount_offer",
    "discount_amount": 300,
    "message_template": "Hi Rahima! We miss you. Get Tk 300 off your next booking. Use code: WELCOME300",
    "discount_code": "WELCOME300",
    "expected_retention_rate": 0.45,
    "intervention_cost": 300,
    "estimated_ltv": 6000,
    "expected_roi": 18.0
  }
}
```

**Field Calculations:**
- `action`: Rule-based logic:
  - Critical risk (>0.8) + High-Value → "premium_discount"
  - High risk (>0.6) + Price-Sensitive → "discount_offer"
  - High risk (>0.6) + Quality-Focused → "quality_guarantee"
  - Medium risk (0.3-0.6) → "service_reminder"
  - Low risk (<0.3) → "no_action"
- `discount_amount`: Rule-based:
  - High-Value segment: 500 Tk
  - Price-Sensitive: 300 Tk
  - Quality-Focused: 400 Tk + premium provider
  - Others: 200 Tk
- `message_template`: Template string with customer name + offer
- `discount_code`: Auto-generated (e.g., "WELCOME300")
- `expected_retention_rate`: Historical retention rate for similar interventions (from past data or default 0.45)
- `intervention_cost`: Same as discount_amount
- `estimated_ltv`: Simple calculation: `avg_booking_value × expected_future_bookings × retention_probability`
  - `expected_future_bookings = 12` (assume 1 year, 1 booking/month for retained customers)
  - Example: `500 × 12 × 1.0 = 6000 Tk`
- `expected_roi`: `((estimated_ltv × expected_retention_rate) - intervention_cost) / intervention_cost × 100`
  - Example: `((6000 × 0.45) - 300) / 300 × 100 = 18.0` (or 1800%)

## Implementation Flow

1. **Data** (2 hours): Generate 10K realistic customers with booking patterns
2. **Models** (4 hours): Train churn + segmentation models, save .pkl files
3. **API** (3 hours): FastAPI with 5 endpoints, load models, serve predictions
4. **Dashboard** (4 hours): React UI with KPI cards, table, charts, modal
5. **Integration** (4 hours): Connect frontend to backend, add SHAP explanations
6. **Polish** (6 hours): UI styling, demo preparation, testing, deployment



