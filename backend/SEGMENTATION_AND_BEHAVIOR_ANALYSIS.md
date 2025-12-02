# Customer Segmentation & Behavior Analysis Implementation

## Overview

This document describes the implementation of two core retention features:
1. **Customer Segmentation**: RFM-based segmentation with 11 business-focused segments
2. **Behavior Analysis**: Industry-specific behavior pattern detection and risk signals

## Table of Contents
- [Features Implemented](#features-implemented)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Usage Guide](#usage-guide)
- [Architecture](#architecture)
- [Testing](#testing)

---

## Features Implemented

### 1. Customer Segmentation

**Purpose**: Assign customers to actionable business segments for targeted retention strategies.

**11 Segments Defined**:
1. **Champions**: Best customers, low churn risk → Reward, upsell
2. **Loyal Customers**: Regular engagement → Nurture, cross-sell
3. **Potential Loyalists**: Showing promise → Engage with offers
4. **New Customers**: Recent first-time → Onboarding campaigns
5. **Promising**: Recent low activity → Build awareness
6. **Need Attention**: Average, showing disengagement → Re-engage
7. **About to Sleep**: Declining activity → Win-back campaigns
8. **At Risk**: Were good, now inactive → Urgent retention
9. **Cannot Lose Them**: High-value, critical risk → VIP treatment
10. **Hibernating**: Long inactive → Last-chance campaigns
11. **Lost**: Churned/near-churned → Aggressive win-back

**Data Sources**:
- RFM scores from `customer_feature` table (8 metrics)
- Churn probability from uploaded CSV or `churn_prediction` table
- Categorization: High (>70), Medium (30-70), Low (<30)

**Segment Assignment Logic**:
- Decision tree combining RFM categories (R, F, M, E) and churn risk
- Composite segment score (0-100): 70% RFM + 30% churn penalty

### 2. Behavior Analysis

**Purpose**: Detect industry-specific risk signals and generate actionable recommendations.

**Industry-Specific Analyses**:

#### Banking
- **Risk Signals**: Login frequency decline, transaction volume drop, feature abandonment, balance checking without action, single product usage, support contact spike
- **Metrics**: Logins/transactions/features used (last 30 vs prev 30 days), cross-product usage, support contacts

#### Telecom
- **Risk Signals**: Data usage decline, communication pattern change, plan underutilization, billing complaints, frequent roaming, payment delays
- **Metrics**: Data usage (MB/GB), call/SMS counts, plan utilization %, roaming events, late payment days

#### Ecommerce
- **Risk Signals**: High cart abandonment, category shift, discount dependency, basket size decline, low browse-to-buy, high return rate
- **Metrics**: Cart abandonment rate, average order value, browse-to-buy ratio, return rate, discount usage %

**Behavior Score**: Composite 0-100 score based on activity trend, value trend, and engagement level.

---

## Database Schema

### New Tables

#### 1. `customer_segments`
```sql
id                  UUID PRIMARY KEY
customer_id         UUID FOREIGN KEY → customers.id
organization_id     UUID FOREIGN KEY → organizations.id
segment             VARCHAR (e.g., 'Champions', 'At Risk')
segment_score       NUMERIC(5,2) (0.00 to 100.00)
rfm_category        JSONB {'R': 'High', 'F': 'Medium', 'M': 'High', 'E': 'High'}
churn_risk_level    VARCHAR ('Low', 'Medium', 'High', 'Critical')
assigned_at         TIMESTAMP
metadata            JSONB (segment description, recommended actions)
```

#### 2. `behavior_analysis`
```sql
id                  UUID PRIMARY KEY
customer_id         UUID FOREIGN KEY → customers.id
organization_id     UUID FOREIGN KEY → organizations.id
org_type            ENUM ('banking', 'telecom', 'ecommerce')
behavior_score      NUMERIC(5,2) (0.00 to 100.00)
activity_trend      VARCHAR ('increasing', 'stable', 'declining')
value_trend         VARCHAR
engagement_trend    VARCHAR
risk_signals        JSONB (array of detected signals)
recommendations     JSONB (array of actionable recommendations)
analyzed_at         TIMESTAMP
metadata            JSONB (industry-specific metrics)
```

### Modified Tables

#### `organizations`
- **Added**: `org_type ENUM ('banking', 'telecom', 'ecommerce') DEFAULT 'telecom'`
- **Migration**: Existing orgs set to 'telecom'

---

## API Endpoints

### Segmentation Endpoints

#### 1. Upload CSV and Segment Customers
```http
POST /api/v1/segmentation/organizations/{org_id}/segment
Content-Type: multipart/form-data

Parameters:
- file: CSV file (customer_id, churn_score)

Response:
{
  "success": true,
  "total_customers": 10000,
  "segmented": 9987,
  "errors": ["Customer CUST_00123 not found in organization"]
}
```

#### 2. Get Segment Distribution
```http
GET /api/v1/segmentation/organizations/{org_id}/segments

Response:
{
  "total_customers": 10000,
  "segments": {
    "Champions": {
      "count": 1250,
      "percentage": 12.5,
      "metadata": {
        "description": "Best customers: frequent buyers...",
        "action": "Reward with loyalty programs..."
      }
    },
    "At Risk": {
      "count": 890,
      "percentage": 8.9,
      "metadata": {...}
    },
    ...
  }
}
```

#### 3. Get Customer Segment
```http
GET /api/v1/segmentation/customers/{customer_id}/segment

Response:
{
  "customer_id": "uuid",
  "organization_id": "uuid",
  "segment": "Champions",
  "segment_score": 87.45,
  "rfm_category": {"R": "High", "F": "High", "M": "High", "E": "High"},
  "churn_risk_level": "Low",
  "assigned_at": "2025-12-02T14:30:00Z",
  "metadata": {...}
}
```

#### 4. Get Segment Definitions
```http
GET /api/v1/segmentation/segment-definitions

Response:
{
  "segments": {
    "Champions": {
      "description": "Best customers...",
      "action": "Reward with loyalty..."
    },
    ...
  }
}
```

### Behavior Analysis Endpoints

#### 1. Run Batch Behavior Analysis
```http
POST /api/v1/behavior/organizations/{org_id}/analyze-behaviors

Response:
{
  "success": true,
  "total_customers": 10000,
  "analyzed": 9998,
  "errors": ["Error analyzing customer uuid: no transactions"]
}
```

#### 2. Get Customer Behavior Analysis
```http
GET /api/v1/behavior/customers/{customer_id}/behavior

Response:
{
  "customer_id": "uuid",
  "organization_id": "uuid",
  "org_type": "banking",
  "behavior_score": 42.35,
  "activity_trend": "declining",
  "value_trend": "declining",
  "engagement_trend": "declining",
  "risk_signals": [
    "login_frequency_decline",
    "transaction_volume_drop",
    "feature_abandonment"
  ],
  "recommendations": [
    "Send re-engagement email highlighting new mobile app features",
    "Reach out to understand if customer needs have changed",
    "Provide tutorials or webinars on abandoned features"
  ],
  "analyzed_at": "2025-12-02T14:45:00Z",
  "metadata": {
    "logins_last_7_days": 1,
    "logins_prev_7_days": 5,
    "transactions_last_30_days": 3,
    "transactions_prev_30_days": 12
  }
}
```

#### 3. Get Organization Behavior Insights
```http
GET /api/v1/behavior/organizations/{org_id}/behavior-insights

Response:
{
  "organization_id": "uuid",
  "org_type": "ecommerce",
  "total_customers": 10000,
  "top_risk_signals": {
    "high_cart_abandonment": 3245,
    "discount_dependency": 2156,
    "basket_size_decline": 1890,
    "low_browse_to_buy": 1234,
    "high_return_rate": 876
  },
  "avg_behavior_score": 58.67,
  "customers_by_trend": {
    "increasing": 1234,
    "stable": 4567,
    "declining": 3890,
    "unknown": 309
  },
  "priority_actions": [
    {
      "risk_signal": "high_cart_abandonment",
      "affected_customers": 3245,
      "urgency": "high",
      "percentage": 32.45
    },
    ...
  ]
}
```

---

## Usage Guide

### Step 1: Run Database Migration

```bash
cd backend
# Using alembic directly (if available)
alembic upgrade head

# Or via Python
python -c "from alembic.config import Config; from alembic import command; cfg = Config('alembic.ini'); command.upgrade(cfg, 'head')"
```

This will:
- Add `org_type` column to `organizations` (default: 'telecom')
- Create `customer_segments` table
- Create `behavior_analysis` table

### Step 2: Set Organization Type

Update existing organizations to correct org_type:

```python
from app.db.session import SessionLocal
from app.db.models.organization import Organization, OrgType

db = SessionLocal()

# Update specific organization
org = db.query(Organization).filter(Organization.id == your_org_id).first()
org.org_type = OrgType.BANKING  # or TELECOM, ECOMMERCE
db.commit()
```

Or via SQL:
```sql
UPDATE organizations SET org_type = 'banking' WHERE id = 'your-org-uuid';
```

### Step 3: Upload Customer Data & Calculate Features

*This step uses your existing pipeline - no changes needed.*

```http
POST /api/v1/churn/organizations/{org_id}/upload-data
(Upload standardized customer transaction CSV)
```

This automatically calculates RFM features.

### Step 4: Train Model

*This step uses your existing pipeline - no changes needed.*

```http
POST /api/v1/churn/organizations/{org_id}/train
```

### Step 5: Run Segmentation

Use the synthetic data or your model's output:

```http
POST /api/v1/segmentation/organizations/{org_id}/segment
Content-Type: multipart/form-data

file: backend/data/synthetic_churn_predictions.csv
```

**CSV Format**:
```csv
customer_id,churn_score
CUST_00001,0.0542
CUST_00002,0.7891
CUST_00003,0.3245
```

### Step 6: Run Behavior Analysis

```http
POST /api/v1/behavior/organizations/{org_id}/analyze-behaviors
```

This analyzes all customers based on transaction history and org_type.

### Step 7: View Results

**Segment Distribution**:
```http
GET /api/v1/segmentation/organizations/{org_id}/segments
```

**Behavior Insights**:
```http
GET /api/v1/behavior/organizations/{org_id}/behavior-insights
```

**Individual Customer**:
```http
GET /api/v1/segmentation/customers/{customer_id}/segment
GET /api/v1/behavior/customers/{customer_id}/behavior
```

---

## Architecture

### File Structure

```
backend/
├── alembic/versions/
│   └── 89d63a900646_add_org_type_and_new_tables.py
│
├── app/
│   ├── api/v1/endpoints/
│   │   ├── segmentation.py (NEW)
│   │   └── behavior.py (NEW)
│   │
│   ├── db/models/
│   │   ├── organization.py (MODIFIED - added org_type)
│   │   ├── customer_segment.py (NEW)
│   │   └── behavior_analysis.py (NEW)
│   │
│   ├── schemas/
│   │   ├── segmentation.py (NEW)
│   │   └── behavior.py (NEW)
│   │
│   └── services/
│       ├── segmentation/
│       │   ├── __init__.py
│       │   ├── segment_engine.py
│       │   ├── rules.py
│       │   └── utils.py
│       │
│       └── behavior_analysis/
│           ├── __init__.py
│           ├── analyzer.py
│           ├── banking_analyzer.py
│           ├── telecom_analyzer.py
│           ├── ecommerce_analyzer.py
│           └── insights_generator.py
│
├── data/
│   └── synthetic_churn_predictions.csv (10,000 rows)
│
└── scripts/
    └── generate_synthetic_data.py
```

### Data Flow

**Segmentation Flow**:
```
CSV (customer_id, churn_score)
  ↓
segment_engine.py: fetch RFM from customer_feature
  ↓
rules.py: apply decision tree (RFM + churn → segment)
  ↓
customer_segment table: store results
  ↓
API: return distribution/individual segments
```

**Behavior Analysis Flow**:
```
transaction table (existing data)
  ↓
analyzer.py: route to org-specific analyzer
  ↓
{banking|telecom|ecommerce}_analyzer.py: calculate metrics, detect signals
  ↓
insights_generator.py: map signals → recommendations
  ↓
behavior_analysis table: store results
  ↓
API: return analysis/insights
```

---

## Testing

### Generate Synthetic Data

```bash
cd backend
python scripts/generate_synthetic_data.py
```

Output: `backend/data/synthetic_churn_predictions.csv` (10,000 rows)

Distribution:
- Low risk (0.0-0.3): 45%
- Medium risk (0.3-0.5): 30%
- High risk (0.5-0.7): 18%
- Critical risk (0.7-1.0): 7%

### Test Segmentation

1. Ensure you have customers with RFM features calculated
2. Upload synthetic CSV via API
3. Verify segment distribution makes sense
4. Check individual customer segments

### Test Behavior Analysis

1. Ensure you have transaction data for customers
2. Set organization org_type
3. Run batch analysis via API
4. Verify risk signals match transaction patterns
5. Check recommendations are relevant

### Expected Results

**Segmentation**:
- Champions: ~10-15% (high RFM, low churn)
- At Risk: ~8-12% (was good, now high churn)
- Lost: ~5-7% (low everything, critical churn)

**Behavior Analysis** (varies by org_type and data):
- Banking: Login/transaction patterns
- Telecom: Usage trends
- Ecommerce: Purchase velocity

---

## Integration with Existing Pipeline

**No Breaking Changes**:
- Existing churn prediction pipeline unchanged
- `churn_prediction.risk_segment` still exists (simple Low/Med/High/Critical)
- New `customer_segment.segment` provides detailed business segments (11 types)
- Both work together: risk_segment = probability-based, segment = action-based

**Relationship**:
```
Customer
  ├── customer_feature (RFM scores) ← existing
  ├── churn_prediction (risk_segment) ← existing
  ├── customer_segment (detailed segment) ← NEW
  └── behavior_analysis (risk signals) ← NEW
```

---

## Production Considerations

### Performance
- Batch operations process 100 customers per commit
- Expected: ~30 seconds for 10k segmentation, ~2 minutes for behavior analysis
- Add indexes on frequently queried fields (already included in migration)

### Error Handling
- All API endpoints have try-catch with meaningful error messages
- Batch operations collect errors and continue processing
- Failed operations rolled back to prevent partial state

### Monitoring
- Track segmentation success rate
- Monitor behavior analysis processing time
- Alert on high error counts

### Scalability
- Current implementation: synchronous batch processing
- Future: Consider async/Celery for large organizations (>100k customers)
- Database: Add partitioning if table grows >10M rows

---

## Next Steps

1. **Run Migration**: Apply database schema changes
2. **Test with Synthetic Data**: Validate both features work end-to-end
3. **Configure Org Types**: Set correct org_type for all organizations
4. **Run Segmentation**: Upload churn predictions CSV
5. **Run Behavior Analysis**: Analyze customer transactions
6. **Review Results**: Check segment distribution and risk signals
7. **Integrate with Frontend**: Display segments and recommendations in UI
8. **Schedule Batch Jobs**: Run segmentation/analysis daily/weekly

---

## Support

For questions or issues, refer to:
- Migration file: [89d63a900646_add_org_type_and_new_tables.py](alembic/versions/89d63a900646_add_org_type_and_new_tables.py)
- Segment rules: [rules.py](app/services/segmentation/rules.py)
- Risk signal definitions: [insights_generator.py](app/services/behavior_analysis/insights_generator.py)

---

**Implementation Complete** ✓

Generated: 2025-12-02
Version: 1.0
