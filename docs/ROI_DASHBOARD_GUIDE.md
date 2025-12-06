# ROI Dashboard Implementation Guide

## Overview

The ROI Dashboard is a business intelligence feature that displays key financial metrics, profit analysis, and cost-benefit calculations for the Pulse Retention AI platform. It provides actionable insights into the return on investment of retention campaigns and customer engagement strategies.

---

## Architecture

### Frontend Structure

```
frontend/src/
├── pages/
│   └── ROIDashboard.jsx          # Main dashboard component
├── api/
│   └── roi.js                    # API service layer
└── App.jsx                        # Route configuration
```

### Backend Structure

```
backend/app/
└── api/
    └── v1/
        ├── api.py                # Router registration
        └── endpoints/
            └── roi.py            # ROI endpoints
```

---

## Features

### 1. Key Metrics Cards
Displays four primary KPIs with trend indicators:
- **Total Revenue** - Sum of all campaign revenue
- **Total Costs** - Operating expenses breakdown
- **Net Profit** - Revenue minus costs
- **ROI %** - Return on investment percentage

Each card includes:
- Trend indicator (↑↓) showing percentage change from previous period
- Colored left border for quick visual identification
- Icon representation
- Subtitle or additional context

### 2. Timeframe Selection
Toggle between three analysis periods:
- **Monthly** - Detailed monthly breakdown
- **Quarterly** - Q1, Q2, Q3, Q4 analysis
- **Yearly** - Year-over-year comparison

Dynamic UI updates when timeframe changes.

### 3. Financial Charts

#### Profit Trend Chart
- Line chart showing profit progression
- Displays: period, profit, revenue, costs
- Identifies growth patterns and seasonality

#### Cost Breakdown Chart
- Pie chart showing cost distribution
- Categories: Email Campaigns, Staff Salaries, Infrastructure, Tools, Marketing
- Color-coded for easy identification

#### Campaign ROI Chart
- Bar chart comparing individual campaign performance
- Metrics: Campaign name, ROI %, Revenue, Costs
- Helps identify most effective campaigns

#### Retention Savings Chart
- Bar chart showing savings by customer segment
- Segments: High-Value, Enterprise, Growth, Churn-Risk, New
- Demonstrates value of retention efforts

### 4. Financial Summary Table
Detailed metrics including:
- Average Customer Lifetime Value (LTV)
- Cost Per Acquisition (CPA)
- Cost Per Retention (CPR)
- Payback Period (months)
- Break-even Date

---

## Data Flow

### Frontend Flow

```
ROIDashboard Component
    ↓
useEffect Hook (triggered on mount & timeframe change)
    ↓
roiAPI Service Functions
    ↓
HTTP Requests to Backend
    ↓
Mock/Real Data Returned
    ↓
State Updates (setMetrics, setProfitTrend, etc.)
    ↓
Component Re-render with Data
    ↓
Charts & Cards Display
```

### Backend Flow

```
API Request (GET /api/v1/roi/*)
    ↓
FastAPI Route Handler
    ↓
TODO: Database Query (to be implemented)
    ↓
Data Transformation
    ↓
JSON Response
    ↓
Frontend Receives & Displays
```

---

## API Endpoints

### Base URL
```
http://127.0.0.1:8000/api/v1/roi
```

### Endpoints

#### 1. GET /metrics
**Query Parameters:**
- `timeframe` (string): "monthly" | "quarterly" | "yearly"

**Response:**
```json
{
  "totalRevenue": 1250000,
  "totalCosts": 450000,
  "netProfit": 800000,
  "roiPercentage": 177.78,
  "avgCustomerLTV": 5200,
  "costPerAcquisition": 850,
  "costPerRetention": 450,
  "paybackPeriod": 3,
  "breakEvenDate": "2025-03-15",
  "revenueTrend": 12.5,
  "costTrend": -5.2,
  "profitTrend": 15.3,
  "roiTrend": 18.7
}
```

#### 2. GET /profit-trend
**Query Parameters:**
- `timeframe` (string): "monthly" | "quarterly" | "yearly"

**Response:**
```json
[
  {
    "period": "January",
    "profit": 65000,
    "revenue": 150000,
    "costs": 85000
  }
]
```

#### 3. GET /cost-breakdown
**Query Parameters:**
- `timeframe` (string): "monthly" | "quarterly" | "yearly"

**Response:**
```json
[
  {
    "name": "Email Campaigns",
    "value": 125000,
    "color": "#3b82f6"
  }
]
```

#### 4. GET /campaign-roi
**Query Parameters:**
- `timeframe` (string): "monthly" | "quarterly" | "yearly"
- `limit` (integer, 1-50): Max campaigns to return (default: 10)

**Response:**
```json
[
  {
    "campaign": "Retention Email Series",
    "roi": 250.5,
    "revenue": 450000,
    "costs": 135000
  }
]
```

#### 5. GET /retention-savings
**Query Parameters:**
- `timeframe` (string): "monthly" | "quarterly" | "yearly"

**Response:**
```json
[
  {
    "segment": "High-Value",
    "savings": 350000,
    "customersRetained": 245,
    "label": "High-Value Customers"
  }
]
```

#### 6. GET /summary
**Query Parameters:**
- `timeframe` (string): "monthly" | "quarterly" | "yearly"

**Response:**
```json
{
  "metrics": { /* metrics object */ },
  "profitTrend": [ /* profit trend array */ ],
  "costBreakdown": [ /* cost breakdown array */ ],
  "campaignROI": [ /* campaign ROI array */ ],
  "retentionSavings": [ /* retention savings array */ ]
}
```

---

## Component API

### ROIDashboard Props
None (standalone page component)

### State Variables

```javascript
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
const [timeframe, setTimeframe] = useState('monthly')
const [metrics, setMetrics] = useState(null)
const [profitTrend, setProfitTrend] = useState(null)
const [costBreakdown, setCostBreakdown] = useState(null)
const [campaignROI, setCampaignROI] = useState(null)
const [retentionSavings, setRetentionSavings] = useState(null)
```

### Sub-Components

#### MetricCard
Displays a single KPI metric with icon and trend.

**Props:**
```javascript
{
  title: string,
  value: string | number,
  subtitle?: string,
  icon: ReactNode,
  color: string (hex color),
  trend?: number (percentage)
}
```

#### SimpleLineChart
Displays line/area chart for trend data.

**Props:**
```javascript
{
  data: Array<{period: string, [key]: number}>,
  title: string,
  dataKey: string,
  color: string (hex color)
}
```

#### BarChart
Displays horizontal bar chart for comparison data.

**Props:**
```javascript
{
  data: Array<{name|campaign|label: string, [key]: number}>,
  title: string,
  dataKey: string,
  color: string (hex color)
}
```

#### PieChart
Displays pie chart for distribution data.

**Props:**
```javascript
{
  data: Array<{name: string, value: number, color: string}>,
  title: string
}
```

---

## Implementation Details

### Current State (Mock Data)
- All endpoints return hardcoded mock data
- Timeframe parameter changes mock data returned
- Frontend is fully functional with mock data

### Data Integration Steps

#### Step 1: Create Analytics Service (Backend)
**File:** `backend/app/services/roi_service.py`

```python
from typing import Dict, List, Any
from datetime import datetime, timedelta

class ROIService:
    @staticmethod
    async def calculate_metrics(org_id: int, timeframe: str) -> Dict[str, Any]:
        """Calculate ROI metrics from database"""
        # TODO: Query customer, campaign, and cost data
        # TODO: Calculate profit, revenue, costs
        # TODO: Calculate ROI percentage
        pass
    
    @staticmethod
    async def get_profit_trend(org_id: int, timeframe: str) -> List[Dict[str, Any]]:
        """Get profit trend data"""
        # TODO: Query profit data from multiple periods
        pass
    
    @staticmethod
    async def get_cost_breakdown(org_id: int, timeframe: str) -> List[Dict[str, Any]]:
        """Get cost distribution by category"""
        # TODO: Query costs by category
        pass
    
    # Additional methods...
```

#### Step 2: Update Backend Endpoints
**File:** `backend/app/api/v1/endpoints/roi.py`

Replace mock data with service calls:

```python
from app.services.roi_service import ROIService

@router.get("/metrics")
async def get_roi_metrics(
    org_id: int = Depends(get_current_org_id),
    timeframe: str = Query("monthly")
):
    try:
        metrics = await ROIService.calculate_metrics(org_id, timeframe)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch metrics: {str(e)}"
        )
```

#### Step 3: Database Schema (Required)
Ensure database has tables for:
- `campaigns` - Campaign data with revenue
- `campaign_costs` - Cost breakdown per campaign
- `customers` - Customer data
- `orders` / `transactions` - Revenue transactions
- `organization_costs` - Fixed costs by category

Required columns:
```sql
-- campaigns table
campaign_id, org_id, name, start_date, end_date, revenue, status

-- campaign_costs table
cost_id, campaign_id, cost_type, amount, date

-- customers table
customer_id, org_id, lifetime_value, acquisition_cost, retention_cost

-- transactions table
transaction_id, customer_id, amount, date, campaign_id
```

#### Step 4: Test Integration
```bash
# Test individual endpoints
curl http://127.0.0.1:8000/api/v1/roi/metrics?timeframe=monthly

# Check frontend displays real data
# Navigate to /roi-dashboard and verify data loads
```

---

## Styling & Color Scheme

### Brand Colors
- **Green** (#10b981) - Revenue, Profit, Positive metrics
- **Red** (#ef4444) - Costs, Losses, Negative metrics
- **Blue** (#3b82f6) - Campaign ROI, Retention
- **Purple** (#8b5cf6) - Secondary metrics, Savings
- **Amber** (#f59e0b) - Warnings, Infrastructure costs

### Component Classes
- **Metric Cards:** `bg-white rounded-lg shadow p-6 border-l-4`
- **Charts:** `bg-white rounded-lg shadow p-6`
- **Timeframe Buttons:** Active = `bg-green-600 text-white`
- **Background:** `bg-gray-50` (light gray)

---

## Error Handling

### Frontend Error States

```javascript
if (error) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
        <h2 className="text-lg font-semibold text-red-600">Error</h2>
        <p className="text-gray-600">{error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    </div>
  )
}
```

### Backend Error Handling

All endpoints wrap logic in try-catch:
```python
try:
    # Fetch/calculate data
    data = await service.get_data()
    return data
except Exception as e:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Failed to fetch data: {str(e)}"
    )
```

---

## Performance Optimization

### Current Implementation
- Parallel data fetching using `Promise.all()`
- All 5 API calls made simultaneously
- Loading state during data fetch

### Future Optimizations
- **Caching:** Cache frequently accessed metrics
- **Pagination:** For campaigns with 50+ items
- **Incremental Loading:** Load metrics first, then charts
- **WebSocket Updates:** Real-time profit updates
- **Database Indexing:** Index org_id, date fields

---

## Testing

### Frontend Testing Checklist
- [ ] Page loads with loading spinner
- [ ] Data appears after API response
- [ ] Timeframe selection updates all charts
- [ ] Charts render correctly with data
- [ ] Error message shows on API failure
- [ ] Retry button works on error
- [ ] Navigation back to dashboard works
- [ ] Responsive design on mobile/tablet

### Backend Testing Checklist
- [ ] All endpoints return 200 status
- [ ] Response format matches schema
- [ ] Timeframe parameter filters correctly
- [ ] Error handling returns 500 on exception
- [ ] Authorization working (org_id isolation)

### API Testing Examples
```bash
# Get metrics
curl -X GET "http://127.0.0.1:8000/api/v1/roi/metrics?timeframe=monthly"

# Get profit trend
curl -X GET "http://127.0.0.1:8000/api/v1/roi/profit-trend?timeframe=quarterly"

# Get cost breakdown
curl -X GET "http://127.0.0.1:8000/api/v1/roi/cost-breakdown?timeframe=yearly"

# Get campaign ROI with limit
curl -X GET "http://127.0.0.1:8000/api/v1/roi/campaign-roi?timeframe=monthly&limit=5"
```

---

## File Locations

| File | Purpose |
|------|---------|
| `frontend/src/pages/ROIDashboard.jsx` | Main dashboard component |
| `frontend/src/api/roi.js` | API service layer |
| `frontend/src/App.jsx` | Routes configuration |
| `backend/app/api/v1/endpoints/roi.py` | API endpoints |
| `backend/app/api/v1/api.py` | Router registration |
| `backend/app/services/roi_service.py` | TODO: Business logic |

---

## Routing

### Frontend Routes
- `/roi-dashboard` - Main ROI Dashboard (Protected)
- Accessible from Home.jsx via "ROI Dashboard" button
- Requires authentication

### Navigation
```
Home Page (Dashboard)
    ↓
[ROI Dashboard Button]
    ↓
/roi-dashboard
    ↓
[Back Button]
    ↓
/dashboard (Home)
```

---

## Dependencies

### Frontend
- `react` - UI framework
- `react-router-dom` - Routing
- Custom `client.js` - HTTP client (Axios)

### Backend
- `fastapi` - Web framework
- `pydantic` - Data validation
- Database driver (PostgreSQL via Supabase)

---

## Environment Variables

### Backend (.env)
```
# Database
DATABASE_URL=postgresql://...

# Organization
ORG_ID=1
```

### Frontend (.env)
```
# API Base URL
VITE_API_URL=http://127.0.0.1:8000
```

---

## Future Enhancements

### Short Term
- [ ] Replace mock data with real database queries
- [ ] Add date range filters (custom periods)
- [ ] Add export functionality (CSV, PDF)
- [ ] Add segment filtering

### Medium Term
- [ ] Real-time updates via WebSocket
- [ ] Forecast/projection charts
- [ ] Benchmarking vs industry standards
- [ ] Custom KPI configuration

### Long Term
- [ ] Machine learning predictions
- [ ] Anomaly detection
- [ ] Automated insights & recommendations
- [ ] Mobile app support

---

## Troubleshooting

### Issue: Data not loading
**Solution:** Check backend is running (`http://127.0.0.1:8000/docs`)

### Issue: CORS errors
**Solution:** Verify frontend URL in backend CORS configuration

### Issue: Charts not rendering
**Solution:** Check browser console for errors, verify data format

### Issue: 401 Unauthorized
**Solution:** Ensure valid JWT token in Authorization header

### Issue: Timeout errors
**Solution:** Check database connection, query optimization needed

---

## Support & Documentation

For detailed information about:
- **API Integration:** See `API_INTEGRATION_GUIDE.md`
- **Analytics:** See `Analytics.jsx` implementation
- **Email Features:** See `EMAIL_FEATURE_INTEGRATION_GUIDE.md`
- **Architecture:** See `docs/architecture.md`

