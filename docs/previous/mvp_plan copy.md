# Sheba Retention AI - MVP Plan

## Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React.js
- **Database**: PostgreSQL
- **ML**: XGBoost, Scikit-learn, SHAP
- **Deployment**: Heroku/Railway (free tier)

## Core MVP Features

### 1. Data Layer
- **Synthetic Data Generator** (`backend/data/synthetic_generator.py`)
  - Generate 100K+ booking records (1 year history minimum)
  - Customer profiles with basic demographics and behavior patterns
  - Service categories (AC, electrician, plumber)
  - Churn indicators (complaints, competitor searches, ratings)

- **Mock API Endpoints** (`backend/api/mock_sheba_api.py`)
  - `/api/bookings` - Historical booking data
  - `/api/customers` - Customer profiles

### 2. ML Engine (Core Models Only)

- **Churn Prediction Model** (`backend/ml/churn_model.py`)
  - Features: days_since_last_booking, num_bookings, avg_spent, complaints_count, searched_competitor
  - Algorithm: XGBoostClassifier
  - Output: Churn probability (0-1), risk category (Low/Medium/High/Critical)
  - Target: 75%+ accuracy for MVP

- **Basic Customer Segmentation** (`backend/ml/segmentation_model.py`)
  - K-Means clustering: High-Value, Price-Sensitive, At-Risk
  - Simple 3-segment model

- **Intervention Recommendation Engine** (`backend/ml/intervention_engine.py`)
  - Rule-based recommendations combining churn risk + segment
  - Output: Discount amount, message template, expected retention rate

- **SHAP Explainability** (`backend/ml/explainability.py`)
  - Top 3 churn drivers per customer
  - Simple feature importance visualization

### 3. Core Backend Services

- **Prediction Service** (`backend/services/prediction_service.py`)
  - Batch prediction for all customers
  - Real-time prediction API
  - Store predictions in PostgreSQL

- **Intervention Service** (`backend/services/intervention_service.py`)
  - Queue system for pending interventions
  - Approval workflow (AI suggests → approve → execute)
  - Track intervention outcomes

- **Analytics Service** (`backend/services/analytics_service.py`)
  - Retention rate calculations
  - Basic ROI tracking
  - Revenue recovery metrics

### 4. Essential API Endpoints

**Prediction:**
- `POST /api/predict/churn` - Get churn prediction for customer
- `GET /api/predictions/at-risk` - List high-risk customers

**Intervention:**
- `GET /api/interventions/pending` - Pending approval queue
- `POST /api/interventions/approve` - Approve intervention
- `GET /api/interventions/history` - Past interventions

**Customer:**
- `GET /api/customers/:id` - Customer profile with predictions
- `GET /api/customers/:id/offers` - Personalized offers

**Analytics:**
- `GET /api/analytics/retention` - Retention metrics
- `GET /api/analytics/roi` - ROI dashboard data

### 5. Frontend (Simplified)

**Admin Dashboard** (`frontend/src/pages/admin/`)
- Real-time churn alerts with customer details
- Intervention approval queue with AI recommendations
- Basic model performance monitoring

**Shared Components** (`frontend/src/components/`)
- `ChurnRiskCard` - Visual risk indicator with top 3 drivers
- `InterventionCard` - Intervention details with ROI projection
- `CustomerProfile` - Basic customer view with predictions

### 6. Database Schema

**Essential Tables:**
- `customers` - Customer profiles
- `bookings` - Booking history
- `predictions` - Churn predictions with timestamps
- `interventions` - Intervention queue and history

### 7. Deployment

- `docker-compose.yml` - Backend + PostgreSQL
- `.env.example` - Environment variables template
- `requirements.txt` - Python dependencies
- `frontend/package.json` - Node.js dependencies

## MVP Development Timeline (8-12 Hours)

### Phase 1: Data & ML (3-4 hours)
- Generate synthetic dataset (50K records minimum)
- Train churn prediction model
- Build basic segmentation
- Create intervention recommendation logic

### Phase 2: Backend (2-3 hours)
- FastAPI application structure
- Implement prediction service
- Create intervention service
- Set up database schema and basic endpoints

### Phase 3: Frontend (2-3 hours)
- Admin dashboard with churn alerts
- Intervention approval interface
- Customer detail view with predictions
- Basic styling

### Phase 4: Integration & Testing (1-2 hours)
- Connect frontend to backend
- End-to-end testing of churn → intervention flow
- Deploy to free hosting platform

## Success Metrics (MVP)

**Technical:**
- Churn model accuracy: >75%
- API response time: <500ms
- System demonstrates full workflow

**Business:**
- Show 10+ high-risk customers with explanations
- Generate personalized interventions for different segments
- Calculate and display ROI projections
- Track intervention outcomes (mock data acceptable)

## Key Demonstration Flow

1. Dashboard loads showing at-risk customers
2. Click customer to see churn probability + top 3 risk factors
3. View AI-recommended intervention (personalized offer)
4. Approve intervention
5. View analytics showing potential retention impact and ROI

## Features Deferred to Post-MVP

- LTV prediction model
- Loyalty tier system
- Customer portal
- Notification service (SMS/Email)
- Payment integration
- Advanced analytics (cohort analysis, A/B testing)
- Bengali language support
- Model drift detection
- Comprehensive monitoring dashboard
