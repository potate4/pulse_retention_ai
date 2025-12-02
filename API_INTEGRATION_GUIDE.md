# API Integration Guide

This document explains how to integrate real APIs into the Pulse Retention AI analytics dashboard and other features.

## Current Architecture

The application uses a **three-layer API structure**:

1. **Frontend API Services** (`frontend/src/api/`) - Wrapper functions for making HTTP requests
2. **Backend API Endpoints** (`backend/app/api/v1/endpoints/`) - FastAPI route handlers
3. **Backend Services** (`backend/app/services/`) - Business logic and data processing

---

## Analytics API Integration

### Current Implementation

The Analytics page currently uses **mock data** with backend API endpoints ready for integration.

#### Frontend Layer
**File:** `frontend/src/api/analytics.js`

This file contains API wrapper functions:

```javascript
export const analyticsAPI = {
  getMetrics: async () => { /* calls /api/v1/analytics/metrics */ },
  getChurnTrend: async (months = 6) => { /* calls /api/v1/analytics/churn-trend */ },
  getSegmentsDistribution: async () => { /* calls /api/v1/analytics/segments-distribution */ },
  getChurnReasons: async (limit = 5) => { /* calls /api/v1/analytics/churn-reasons */ },
  getRiskDistribution: async () => { /* calls /api/v1/analytics/risk-distribution */ },
  getSummary: async () => { /* calls /api/v1/analytics/summary */ }
}
```

**Usage in Components:**
```javascript
import { analyticsAPI } from '../api/analytics'

const metricsData = await analyticsAPI.getMetrics()
```

#### Backend Layer
**File:** `backend/app/api/v1/endpoints/analytics.py`

Contains 6 API endpoints:
- `GET /api/v1/analytics/metrics` - Returns KPI metrics
- `GET /api/v1/analytics/churn-trend` - Returns monthly churn data
- `GET /api/v1/analytics/segments-distribution` - Returns customer segments
- `GET /api/v1/analytics/churn-reasons` - Returns top churn reasons
- `GET /api/v1/analytics/risk-distribution` - Returns risk levels
- `GET /api/v1/analytics/summary` - Returns all data combined

---

## How to Connect Real Data to Analytics

### Step 1: Update Backend Services

**File:** `backend/app/services/churn_predictor.py` or create new service files

Replace the mock data in `backend/app/api/v1/endpoints/analytics.py` with actual database queries:

```python
# BEFORE (Mock Data)
@router.get("/metrics")
async def get_analytics_metrics(org_id: int = Depends(get_current_org_id)):
    metrics = {
        "totalCustomers": 5430,
        "churnRate": 12.5,
        # ... mock data
    }
    return metrics

# AFTER (Real Data)
@router.get("/metrics")
async def get_analytics_metrics(org_id: int = Depends(get_current_org_id)):
    # Query database for actual metrics
    total_customers = await db.customers.count(org_id=org_id)
    churn_rate = await AnalyticsService.calculate_churn_rate(org_id)
    at_risk_count = await AnalyticsService.get_at_risk_customers_count(org_id)
    
    metrics = {
        "totalCustomers": total_customers,
        "churnRate": churn_rate,
        "atRiskCount": at_risk_count,
        # ... other metrics
    }
    return metrics
```

### Step 2: Create Analytics Service

**File:** `backend/app/services/analytics_service.py` (new)

```python
from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.db.session import SessionLocal

class AnalyticsService:
    @staticmethod
    async def get_metrics(org_id: int) -> Dict[str, Any]:
        """Fetch real metrics from database"""
        # Query implementation
        pass
    
    @staticmethod
    async def get_churn_trend(org_id: int, months: int = 6) -> List[Dict[str, Any]]:
        """Fetch monthly churn trend data"""
        # Query implementation
        pass
    
    @staticmethod
    async def calculate_churn_rate(org_id: int) -> float:
        """Calculate current churn rate"""
        # Calculation logic
        pass
```

### Step 3: Update Endpoint to Use Service

**File:** `backend/app/api/v1/endpoints/analytics.py`

```python
from app.services.analytics_service import AnalyticsService

@router.get("/metrics")
async def get_analytics_metrics(org_id: int = Depends(get_current_org_id)):
    try:
        metrics = await AnalyticsService.get_metrics(org_id)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch metrics: {str(e)}"
        )
```

### Step 4: Frontend Data Fetching

**File:** `frontend/src/pages/Analytics.jsx`

The frontend already has the correct implementation:

```javascript
useEffect(() => {
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // This will now fetch from real API once backend is updated
      const [metricsData, churnTrendData, ...] = await Promise.all([
        analyticsAPI.getMetrics(),
        analyticsAPI.getChurnTrend(),
        // ... other API calls
      ])
      
      setMetrics(metricsData)
      setChurnData(churnTrendData)
      // ... set other state
      
    } catch (err) {
      setError('Failed to load analytics data')
    }
  }
  
  fetchAnalytics()
}, [])
```

---

## Adding New API Features

### Example: Adding Customer Health Score API

#### 1. Backend Endpoint

**File:** `backend/app/api/v1/endpoints/analytics.py`

```python
@router.get("/health-scores")
async def get_customer_health_scores(
    org_id: int = Depends(get_current_org_id),
    segment: str = Query(None)
) -> List[Dict[str, Any]]:
    """
    Get health scores for customers.
    
    Args:
        segment: Filter by customer segment (optional)
    
    Returns:
        List of customers with health scores
    """
    try:
        scores = await AnalyticsService.get_health_scores(org_id, segment)
        return scores
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch health scores: {str(e)}"
        )
```

#### 2. Frontend API Service

**File:** `frontend/src/api/analytics.js`

```javascript
export const analyticsAPI = {
  // ... existing methods
  
  getHealthScores: async (segment = null) => {
    const params = segment ? { segment } : {}
    const response = await client.get('/analytics/health-scores', { params })
    return response.data
  }
}
```

#### 3. Use in Component

```javascript
import { analyticsAPI } from '../api/analytics'

const [healthScores, setHealthScores] = useState(null)

useEffect(() => {
  const fetchScores = async () => {
    const data = await analyticsAPI.getHealthScores('High-Value')
    setHealthScores(data)
  }
  fetchScores()
}, [])
```

---

## Directory Structure Reference

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── api.py              # Route registration
│   │       └── endpoints/
│   │           ├── analytics.py    # Analytics endpoints (TODO: replace mock data)
│   │           ├── emails.py       # Email endpoints
│   │           ├── auth.py         # Authentication endpoints
│   │           └── churn.py        # Churn prediction endpoints
│   ├── services/
│   │   ├── analytics_service.py    # TODO: Create for real analytics logic
│   │   ├── churn_predictor.py      # Churn prediction service
│   │   ├── email_sender.py         # Email service
│   │   └── customer_service.py     # Customer data service
│   └── db/
│       ├── models/                 # SQLAlchemy models
│       └── session.py              # Database connection

frontend/
├── src/
│   ├── api/
│   │   ├── analytics.js            # Analytics API wrappers (ready to use)
│   │   ├── client.js               # HTTP client configuration
│   │   ├── auth.js                 # Auth API wrappers
│   │   └── emails.js               # Email API wrappers
│   ├── pages/
│   │   └── Analytics.jsx           # Analytics dashboard (fetches from API)
│   └── stores/
│       └── authStore.js            # Authentication state
```

---

## TODO: Tasks for Real API Integration

### Backend Tasks
- [ ] Create `backend/app/services/analytics_service.py`
- [ ] Implement database queries for each metric
- [ ] Replace mock data in `backend/app/api/v1/endpoints/analytics.py`
- [ ] Add error handling and logging
- [ ] Add caching for expensive queries
- [ ] Add pagination for large datasets
- [ ] Add role-based access control

### Frontend Tasks
- [ ] Verify API calls in `frontend/src/pages/Analytics.jsx`
- [ ] Test error handling and loading states
- [ ] Add data refresh/reload functionality
- [ ] Add date range filters
- [ ] Add export functionality (CSV, PDF)
- [ ] Add real-time updates (WebSocket)

---

## Testing the Integration

### 1. Test Backend Endpoint

```bash
curl http://127.0.0.1:8000/api/v1/analytics/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Check Frontend Network Requests

- Open browser DevTools (F12)
- Go to Network tab
- Navigate to Analytics page
- Verify API calls are made to `/api/v1/analytics/*`
- Check response data matches expected format

### 3. Verify Data Flow

```javascript
// Add console logs in Analytics.jsx
useEffect(() => {
  fetchAnalytics()
}, [])

async function fetchAnalytics() {
  const data = await analyticsAPI.getMetrics()
  console.log('Metrics:', data)  // Should show real data
}
```

---

## Common Issues & Solutions

### Issue: CORS Errors
**Solution:** Backend is configured with CORS. Ensure frontend URL is in allowed origins in `backend/app/main.py`

### Issue: 401 Unauthorized
**Solution:** Ensure valid JWT token is sent in Authorization header. Frontend auth store should handle this automatically.

### Issue: Slow API Response
**Solution:** Add caching or pagination. Implement database indexes for frequently queried fields.

### Issue: Data Format Mismatch
**Solution:** Ensure backend response format matches what frontend expects (check mock data structure in comments).

---

## API Response Format Reference

All analytics endpoints should return data in this format:

### Metrics Endpoint
```json
{
  "totalCustomers": 5430,
  "churnRate": 12.5,
  "atRiskCount": 678,
  "retentionRate": 87.5,
  "avgLifetimeValue": 2450,
  "emailsSent": 15230
}
```

### Churn Trend Endpoint
```json
[
  {
    "month": "January",
    "churnRate": 8.5,
    "retentionRate": 91.5
  }
]
```

### Segments Distribution Endpoint
```json
[
  {
    "name": "High-Value",
    "value": 2150
  }
]
```

### Churn Reasons Endpoint
```json
[
  {
    "reason": "High Pricing",
    "count": 234
  }
]
```

### Risk Distribution Endpoint
```json
[
  {
    "name": "Low Risk",
    "value": 3245,
    "retentionRate": 98
  }
]
```

---

## Next Steps

1. **Create Analytics Service** - Build business logic for metrics calculation
2. **Database Queries** - Write SQL queries or ORM calls to fetch real data
3. **Integration Testing** - Test end-to-end data flow
4. **Performance Optimization** - Add caching, indexing, pagination
5. **Real-time Updates** - Consider WebSocket for live updates

