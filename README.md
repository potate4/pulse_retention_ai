# Pulse - Customer Identity Intelligence and Retention Platform

<p align="center">
  <img src="logo main.png" alt="Pulse Logo" width="250"/>
</p>

<p align="center">
  <strong>AI-Powered Customer Retention Platform</strong>
  <br>
  Predict churn, personalize campaigns, and maximize ROI with intelligent customer analytics
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Core Features](#core-features)
- [API Documentation](#api-documentation)
- [Widget Integration](#widget-integration)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

---

## 🎯 Overview

**Pulse** is an enterprise-grade customer retention platform that leverages machine learning to predict customer churn, intelligently segment customers, and deliver personalized retention campaigns. Built for businesses in e-commerce, telecom, and banking sectors, Pulse helps you retain high-value customers and maximize lifetime value.

### Why Pulse?

- **Predict**: AI-powered churn prediction with >85% accuracy
- **Segment**: RFM analysis and behavioral clustering across 11 business segments
- **Personalize**: AI-generated retention emails with tailored offers
- **Measure**: Real-time ROI tracking and profitability analytics
- **Embed**: Drop-in widget for customer websites

[Screenshot Placeholder: Dashboard Overview]

---

## ✨ Key Features

### 1. 🤖 AI Churn Prediction

Train machine learning models to predict which customers are likely to churn.

[Screenshot Placeholder: Churn Prediction Dashboard]

**Key Capabilities:**
- **RFM Feature Engineering**: Recency, Frequency, Monetary, and Engagement scores
- **Batch Predictions**: Process thousands of customers simultaneously
- **Risk Scoring**: 0-100% churn probability for each customer
- **Model Versioning**: Track model performance over time
- **Multi-Industry Support**: E-commerce, Telecom, Banking

**How It Works:**
1. Upload customer transaction data (CSV)
2. System automatically calculates RFM features
3. Train ML model with one click
4. Run batch predictions on your entire customer base
5. View churn scores and risk segments

---

### 2. 🎯 Customer Segmentation

Intelligently segment customers into 11 actionable business categories.

[Screenshot Placeholder: Customer Segments]

**11 Business Segments:**

| Segment | Description | Action |
|---------|-------------|--------|
| **Champions** | Best customers, high value, low churn | Reward & upsell |
| **Loyal Customers** | Regular engagement, consistent value | Nurture relationships |
| **Potential Loyalists** | Showing promise, growing engagement | Engage with offers |
| **New Customers** | Recent first-time buyers | Onboarding campaigns |
| **Promising** | Recent but low activity | Build awareness |
| **Need Attention** | Average, showing disengagement | Re-engagement campaigns |
| **About to Sleep** | Declining activity | Win-back offers |
| **At Risk** | Were good, now inactive | Urgent retention |
| **Cannot Lose Them** | High-value, critical risk | VIP treatment |
| **Hibernating** | Long inactive | Last-chance campaigns |
| **Lost** | Churned or near-churned | Aggressive win-back |

**Segmentation Logic:**
- Combines RFM scores with churn probability
- Assigns composite segment score (0-100)
- Updates dynamically as customer behavior changes

---

### 3. 📊 Behavioral Analysis

Industry-specific behavioral pattern detection and risk signal identification.

[Screenshot Placeholder: Behavioral Insights]

**Industry-Specific Analysis:**

**E-commerce:**
- Cart abandonment tracking
- Purchase frequency changes
- Discount dependency patterns
- Return rate monitoring
- Browse-to-buy ratio analysis

**Telecom:**
- Data usage trends
- Communication pattern shifts
- Plan utilization monitoring
- Billing complaint tracking
- Payment delay detection

**Banking:**
- Login frequency analysis
- Transaction volume tracking
- Feature adoption monitoring
- Product usage patterns
- Support contact trends

**Risk Signals:**
Each customer receives:
- Behavior score (0-100)
- Activity trend (increasing/stable/declining)
- Risk signals (specific issues identified)
- AI-generated recommendations

---

### 4. 📧 Personalized Retention Campaigns

AI-powered email campaigns with personalized offers based on customer segments and churn risk.

[Screenshot Placeholder: Campaign Creation]

**Campaign Features:**
- **AI Content Generation**: Google Gemini-powered email copy
- **Smart Offers**: Dynamic discount recommendations (5-30%)
- **Segment Targeting**: Target specific customer groups
- **Performance Tracking**: Open rates, click-through rates, conversions
- **Automated Triggers**: Set rules to auto-send campaigns

**Campaign Workflow:**
1. Select target segment (e.g., "At Risk - High Value")
2. Configure offer parameters (discount, validity, products)
3. Generate email content with AI
4. Preview and customize
5. Send or schedule
6. Track performance in real-time

---

### 5. 💰 ROI Analytics Dashboard

Real-time financial metrics and profitability tracking for retention efforts.

[Screenshot Placeholder: ROI Dashboard]

**Key Metrics:**
- **Total Revenue**: Revenue from retained customers
- **Total Costs**: Campaign and retention expenses
- **Net Profit**: Revenue minus costs
- **ROI Percentage**: Return on investment
- **Customer LTV**: Average lifetime value
- **Cost Per Retention**: Average cost to retain a customer

**Advanced Analytics:**
- **Profit Trends**: Historical performance (monthly/quarterly/yearly)
- **Cost Breakdown**: Detailed expense analysis by category
- **Campaign Comparison**: ROI by campaign
- **Segment Performance**: Savings by customer segment
- **Predictive Forecasting**: Future revenue projections

**ROI Calculation:**
Focuses on **high-risk, high-value customers** (top 10% by monetary score with churn > 80%):
```
Total Value = Σ (monetary_score × 100)
Retention Cost = 10% of total value
Net Profit = Total Value - Retention Cost
ROI % = (Net Profit / Retention Cost) × 100
```

---

### 6. 🔌 Embeddable Widget

Drop-in JavaScript widget that displays personalized offers on your customer websites.

[Screenshot Placeholder: Widget on Customer Site]

**Widget Features:**
- **Zero Dependencies**: Pure JavaScript, <5KB
- **Personalized Offers**: Tailored to customer segment and churn risk
- **One-Line Installation**: Single script tag
- **Event Tracking**: Monitors views, closes, and conversions
- **Responsive Design**: Works on all devices

**Installation:**
```html
<script 
  src="https://your-cdn.com/pulse-retention-widget.js"
  data-business-id="YOUR_BUSINESS_UUID"
  data-email="customer@example.com"
  data-api-url="https://api.yourcompany.com"
></script>
```

**Widget Behavior:**
1. Loads silently on page load
2. Fetches customer's churn risk and segment
3. Shows personalized offer if customer is at risk (>70%)
4. Tracks engagement automatically
5. Closes on user interaction or timeout

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Storage**: Supabase (file storage & authentication)
- **ML Framework**: scikit-learn, pandas, numpy
- **AI Integration**: Google Gemini API (email generation)
- **Authentication**: JWT tokens with passlib/bcrypt

### Frontend
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v7
- **HTTP Client**: Axios

### Widget
- **Language**: Vanilla JavaScript (ES6+)
- **Size**: <5KB gzipped
- **Dependencies**: None

### Infrastructure
- **Database Migrations**: Alembic
- **API Documentation**: OpenAPI (Swagger)
- **Background Jobs**: Python asyncio

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Supabase account (for storage)
- Google Gemini API key (optional, for AI emails)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/pulse_retention_ai.git
cd pulse_retention_ai
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: **http://localhost:5173**

### 4. Access the Application

1. Open **http://localhost:5173** in your browser
2. Click "Get Started" to create an account
3. Log in to access the dashboard

---

## 📦 Installation

### Environment Variables

**Backend (.env):**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pulse_db

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google Gemini (Optional)
GEMINI_API_KEY=your_gemini_api_key

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:8000
```

### Database Setup

```bash
# Create PostgreSQL database
createdb pulse_db

# Run migrations
cd backend
alembic upgrade head
```

---

## 🎓 Core Features

### Uploading Customer Data

**CSV Format (E-commerce):**
```csv
CustomerID,TransactionDate,TransactionAmount,ProductCategory,Quantity
CUST_001,2024-01-15,150.00,Electronics,1
CUST_002,2024-01-16,75.50,Clothing,2
```

**CSV Format (Telecom):**
```csv
CustomerID,EventDate,EventType,RevenueImpact
CUST_001,2024-01-15,data_usage,25.00
CUST_002,2024-01-16,call,10.50
```

**Upload Methods:**
1. **Dashboard**: Navigate to Data → Upload CSV
2. **API**: `POST /api/v1/customers/bulk` with CSV file

### Training Churn Model

**Via Dashboard:**
1. Go to Analytics → Churn Prediction
2. Click "Train New Model"
3. Select dataset type (ecommerce/telco/banking)
4. Monitor training progress
5. Review model accuracy

**Via API:**
```bash
curl -X POST http://localhost:8000/api/v1/ml/train \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_type": "ecommerce"
  }'
```

### Running Predictions

```bash
curl -X POST http://localhost:8000/api/v1/ml/predict/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_ids": ["all"]
  }'
```

### Segmentation

**Upload Churn Scores:**
```bash
curl -X POST http://localhost:8000/api/v1/segmentation/organizations/{org_id}/segment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@churn_predictions.csv"
```

**CSV Format:**
```csv
customer_id,churn_score
CUST_001,0.85
CUST_002,0.23
```

### Creating Campaigns

1. Navigate to Campaigns → Create
2. Select target segment
3. Configure offer (discount %, validity days)
4. Generate email with AI
5. Preview and send

---

## 📖 API Documentation

### Authentication

All endpoints require JWT authentication:

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123"

# Response
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}

# Use token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/customers
```

### Core Endpoints

**Customers:**
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers` - List customers
- `POST /api/v1/customers/bulk` - Bulk upload (CSV)

**ML & Predictions:**
- `POST /api/v1/ml/train` - Train churn model
- `GET /api/v1/ml/models` - List models
- `POST /api/v1/ml/predict/batch` - Batch prediction
- `GET /api/v1/ml/predictions` - Get results

**Segmentation:**
- `POST /api/v1/segmentation/organizations/{org_id}/segment` - Segment customers
- `GET /api/v1/segmentation/organizations/{org_id}/segments` - Get distribution
- `GET /api/v1/segmentation/customers/{customer_id}/segment` - Get customer segment

**Behavioral Analysis:**
- `POST /api/v1/behavior/organizations/{org_id}/analyze-behaviors` - Analyze behaviors
- `GET /api/v1/behavior/customers/{customer_id}/behavior` - Get customer behavior
- `GET /api/v1/behavior/organizations/{org_id}/behavior-insights` - Get insights

**Campaigns:**
- `POST /api/v1/campaigns` - Create campaign
- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns/{id}/send` - Send emails

**ROI Analytics:**
- `GET /api/v1/roi/metrics?timeframe=monthly` - Key metrics
- `GET /api/v1/roi/profit-trend?timeframe=quarterly` - Profit trends
- `GET /api/v1/roi/cost-breakdown` - Cost analysis
- `GET /api/v1/roi/campaign-roi` - Campaign comparison

**Widget (Public):**
- `GET /api/v1/widget/offers?business_id={id}&customer_email={email}` - Get offers
- `POST /api/v1/widget/events` - Log events

### Interactive API Docs

Visit **http://localhost:8000/docs** for full Swagger documentation.

---

## 🔌 Widget Integration

### Installation

Add to your website before `</body>`:

```html
<script 
  src="https://your-cdn.com/pulse-retention-widget.js"
  data-business-id="YOUR_BUSINESS_UUID"
  data-email="customer@example.com"
  data-api-url="https://api.yourcompany.com"
></script>
```

### Platform-Specific Examples

**PHP:**
```php
<?php if (isset($_SESSION['user_email'])): ?>
  <script
    src="https://your-cdn.com/pulse-retention-widget.js"
    data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"
    data-email="<?php echo htmlspecialchars($_SESSION['user_email']); ?>"
  ></script>
<?php endif; ?>
```

**React:**
```jsx
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://your-cdn.com/pulse-retention-widget.js';
  script.setAttribute('data-business-id', businessId);
  script.setAttribute('data-email', userEmail);
  document.body.appendChild(script);
}, [userEmail]);
```

**Django:**
```html
{% if user.is_authenticated %}
  <script
    src="https://your-cdn.com/pulse-retention-widget.js"
    data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"
    data-email="{{ user.email }}"
  ></script>
{% endif %}
```

### Widget Customization

Edit `popup-widget/popup.css` to match your brand:

```css
.pulse-popup {
  --primary-color: #8b5cf6;
  --background: #ffffff;
  --text-color: #1f2937;
}
```

---

## 📁 Project Structure

```
pulse_retention_ai/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/  # API routes
│   │   │       └── api.py      # Router registration
│   │   ├── core/              # Config & security
│   │   ├── db/
│   │   │   └── models/        # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # Business logic
│   │       ├── segmentation/
│   │       ├── behavior_analysis/
│   │       └── roi_calculator.py
│   ├── datasets/              # Sample data
│   ├── models/                # Trained ML models
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── ROIDashboard.jsx
│   │   │   ├── PricingBilling.jsx
│   │   │   └── Landing.jsx
│   │   ├── stores/           # Zustand stores
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── popup-widget/
│   ├── pulse-retention-widget.js
│   └── popup.css
│
├── dummy-client-website/    # Test website
├── docs/                     # Documentation
└── README.md
```

---

## 📚 Documentation

### Detailed Guides

- **[API Integration Guide](API_INTEGRATION_GUIDE.md)** - Complete API reference
- **[Widget Installation Guide](WIDGET_INSTALLATION_GUIDE.md)** - Widget setup
- **[ROI Dashboard Guide](ROI_DASHBOARD_GUIDE.md)** - ROI analytics documentation
- **[CSV Processor Guide](backend/CSV_PROCESSOR_GUIDE.md)** - Data upload formats
- **[Email Setup Guide](backend/EMAIL_SETUP_GUIDE.md)** - Email configuration
- **[Segmentation Guide](backend/SEGMENTATION_AND_BEHAVIOR_ANALYSIS.md)** - Segmentation & behavior analysis

### Architecture Docs

- **[System Architecture](docs/architecture.md)** - Overall system design
- **[Data Flow](docs/DATA_FLOW.md)** - Data pipeline documentation
- **[Product Requirements](docs/prd.md)** - Product vision & requirements

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
pytest --cov=app --cov-report=html
```

### Test Widget

1. Start backend: `uvicorn app.main:app --port 8000 --reload`
2. Open `test-widget.html` in browser
3. Check console for widget logs

### Test Customer Journey

See [QUICK_TEST_STEPS.md](QUICK_TEST_STEPS.md) for complete testing workflow.

---

##  Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pytest` (backend) and `npm test` (frontend)
5. Commit: `git commit -m 'feat: Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

**Python:**
- Follow PEP 8
- Use type hints
- Max line length: 100 characters

**JavaScript/React:**
- Use ES6+ syntax
- Functional components with hooks
- Follow Airbnb style guide

### Commit Convention

```
feat: Add new feature
fix: Bug fix
docs: Documentation updates
refactor: Code refactoring
test: Add tests
```

---






## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI library
- [scikit-learn](https://scikit-learn.org/) - Machine learning
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Supabase](https://supabase.com/) - Backend services
- [Google Gemini](https://ai.google.dev/) - AI content generation

---

<p align="center">
 
  <br>
  
</p>
