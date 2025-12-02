# Architecture

## Executive Summary

Pulse is a two-sided Customer Identity Intelligence platform built on a brownfield React/FastAPI foundation. The architecture separates the Business Dashboard (enhanced existing React app) from the Customer Widget (new embeddable Vite bundle), both consuming a unified FastAPI backend with enhanced identity scoring and SHAP-based cause diagnostics.

## Project Initialization

**Widget Setup (New Component):**
```bash
# Create widget directory
npm create vite@latest widget -- --template react
cd widget
npm install
npm install -D tailwindcss postcss autoprefixer
npm install react react-dom
```

**Starter Template Foundation:**
- **Customer Widget:** Vite + React + UMD bundle (based on makerkit/react-embeddable-widget pattern)
- **Business Dashboard:** Existing React 19 + Create React App (enhance in place)
- **Backend:** FastAPI 0.121.3 + Python 3.12+ (upgrade from current)

**Key Architectural Decisions Made by Widget Starter:**
- Build tooling: Vite (fast, modern bundling)
- Output format: UMD (single .js file for embedding)
- Style isolation: Shadow DOM (prevents CSS conflicts)
- Module format: ES + UMD dual output
- TypeScript: Optional (can add)
- Hot reloading: Vite dev server

## Decision Summary

| Category | Decision | Version | Affects FRs | Rationale |
| -------- | -------- | ------- | ----------- | --------- |
| Identity Scoring | Enhanced Multi-Factor Scoring | Custom | FR1, FR2, FR3, FR4, FR9 | Reuses SHAP infrastructure, philosophically aligned with identity intelligence, achievable in hackathon timeline. Calculates 0-100 score from weighted positive signals (tenure, engagement, satisfaction, loyalty, value). |
| Real-time Communication | WebSockets (FastAPI/Starlette) | Starlette (built-in) | FR5, FR17, NFR1, NFR4 | Bi-directional real-time updates for widget ↔ dashboard sync. Meets NFR requirements (200ms context sharing, 2s identity updates). Demo impact: judges see instant customer context → business dashboard updates. Native FastAPI support via Starlette. |
| Widget Authentication | JWT Token Pass-through | python-jose 3.3.0 | FR27, NFR5, NFR7, NFR8 | Industry standard, stateless, cryptographically secure. Widget receives JWT from business app, backend validates signature. Claims include customer_id + business_id for multi-tenant isolation. HS256 for hackathon, RS256 post-MVP. |
| Database | PostgreSQL + SQLAlchemy 2.0 + asyncpg | PostgreSQL 18.1, SQLAlchemy 2.0.44, asyncpg 0.28.x | FR24, FR25, NFR6, NFR9, NFR10 | Production-ready from start. Multi-tenant via business_id foreign keys, ACID transactions, scales to 10K+ customers per tenant. Async ORM for FastAPI performance. Free tier available (Supabase, Neon, Railway). |
| Conversation Card AI | OpenAI GPT-4o-mini API | openai 2.8.1 | FR10, FR20, FR21, FR22 | Generative AI for personalized conversation starters. Context-aware prompts with identity signals + customer state. Cost: ~$0.0001/card (gpt-4o-mini). Async integration with FastAPI. Rule-based fallback if API unavailable. Demo differentiator: "AI prepares, humans deliver". |
| Dashboard State Management | Zustand | 5.0.8 | FR7, FR12, FR13 | Lightweight state management for Business Dashboard. Hook-based API, minimal boilerplate, TypeScript support, DevTools integration. Perfect for intermediate complexity without Redux overhead. |
| Caching | Python functools.lru_cache | stdlib (built-in) | NFR1, NFR2 | In-memory cache for identity score calculations. Zero infrastructure for hackathon. Meets 2-second NFR requirement. Post-MVP: Redis for multi-instance scaling. |
| Testing | Vitest (widget) + Jest (dashboard) + pytest | Vitest 4.0.12, pytest 8.x, pytest-asyncio 1.3.0 | Quality | Frontend: Vitest for Vite widget, Jest for existing CRA app. Backend: pytest with async support. Industry standard tooling. |
| File Upload | FastAPI UploadFile + pandas | pandas (latest) | FR25 | CSV upload → PostgreSQL. FastAPI UploadFile → pandas read_csv → SQLAlchemy bulk insert. Reuses existing CSV demo data format. |
| Logging | structlog + JSON format | structlog 25.5.0 | Observability | Structured logging with business_id in all logs. JSON output for searchability. Multi-tenant friendly. Production-ready observability. |
| Error Handling | FastAPI HTTPException + custom codes | FastAPI (built-in) | Consistency | Centralized error handling with user-friendly messages. JSON error responses for widget/dashboard. Consistent API contracts. |
| Deployment | Docker Compose | Docker latest | DevOps | 3 containers: frontend, widget, backend+PostgreSQL. Portable, judges can run locally. Post-MVP: Railway/Render/Fly.io free tiers. |

## Project Structure

```
sheba-dashboard/
├── frontend/                           # Business Dashboard (existing, enhanced)
│   ├── src/
│   │   ├── components/                 # UI Components
│   │   │   ├── ChurnTable.jsx          # ENHANCED: Show Identity Strength
│   │   │   ├── CustomerModal.jsx       # ENHANCED: Identity dashboard view
│   │   │   ├── ConversationCards.jsx   # NEW: AI-generated intervention cards
│   │   │   ├── IdentityScore.jsx       # NEW: Identity strength visualization
│   │   │   ├── CustomerContext.jsx     # NEW: View customer-shared context
│   │   │   ├── KPICards.jsx            # ENHANCED: Identity metrics
│   │   │   ├── SegmentChart.jsx        # ENHANCED: Identity-based segments
│   │   │   ├── ShapExplanation.jsx     # ENHANCED: Cause diagnostics
│   │   │   ├── ErrorBoundary.jsx       # (existing)
│   │   │   ├── LoadingSkeleton.jsx     # (existing)
│   │   │   └── InterventionHistory.jsx # ENHANCED: Conversation card tracking
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx           # ENHANCED: Identity-focused KPIs
│   │   │   ├── IdentityView.jsx        # NEW: Identity strength by customer
│   │   │   ├── ConversationQueue.jsx   # NEW: Pending conversation cards
│   │   │   ├── SegmentationPage.jsx    # ENHANCED: Identity-based segments
│   │   │   └── ChurnPrediction.jsx     # LEGACY: Keep for comparison demo
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                  # ENHANCED: REST + WebSocket client
│   │   │   ├── websocket.js            # NEW: WebSocket connection manager
│   │   │   ├── identityStore.js        # NEW: Zustand store for identity state
│   │   │   ├── mockData.js             # (existing)
│   │   │   └── interventionEngine.js   # ENHANCED: With AI conversation cards
│   │   │
│   │   ├── utils/
│   │   │   ├── helpers.js              # (existing)
│   │   │   └── formatters.js           # NEW: Identity score formatters
│   │   │
│   │   ├── App.js                      # ENHANCED: Add new routes
│   │   ├── index.js                    # (existing)
│   │   └── index.css                   # (existing)
│   │
│   ├── public/                         # Static assets
│   ├── package.json                    # ENHANCED: Add zustand
│   ├── tailwind.config.js              # (existing)
│   └── .env                            # ENHANCED: Add REACT_APP_WS_URL
│
├── widget/                             # Customer Widget (NEW)
│   ├── src/
│   │   ├── components/
│   │   │   ├── PulseWidget.jsx         # Main widget container
│   │   │   ├── IdentityDashboard.jsx   # Customer's identity view
│   │   │   ├── ContextButtons.jsx      # One-tap context sharing
│   │   │   ├── ProgressMilestones.jsx  # Journey visualization
│   │   │   ├── MicroCelebration.jsx    # Achievement notifications
│   │   │   └── WrappedReflection.jsx   # Basic wrapped view
│   │   │
│   │   ├── services/
│   │   │   ├── websocket.js            # Widget WebSocket client
│   │   │   ├── auth.js                 # JWT token handling
│   │   │   └── api.js                  # REST fallback
│   │   │
│   │   ├── main.jsx                    # Widget entry + Shadow DOM setup
│   │   ├── widget-init.js              # UMD initialization wrapper
│   │   └── styles.css                  # Shadow DOM isolated styles
│   │
│   ├── public/                         # Widget assets
│   ├── vite.config.js                  # UMD build configuration
│   ├── package.json                    # Widget dependencies
│   ├── tailwind.config.js              # Widget-specific Tailwind
│   └── .env                            # Widget config
│
├── backend/                            # API Backend (existing, enhanced)
│   ├── api_server.py                   # ENHANCED: Add WebSocket + new endpoints
│   ├── identity_engine.py              # NEW: Identity strength calculation
│   ├── conversation_cards.py           # NEW: AI conversation card generation
│   ├── websocket_manager.py            # NEW: WebSocket connection manager
│   ├── auth.py                         # NEW: JWT validation
│   ├── database.py                     # NEW: SQLAlchemy async setup
│   ├── churn_prediction.py             # (existing, keep for comparison)
│   ├── segment_customers.py            # ENHANCED: Identity-based segmentation
│   ├── train_model.py                  # (existing)
│   │
│   ├── models/                         # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── business.py                 # NEW: Business/tenant model
│   │   ├── customer.py                 # NEW: Customer with identity_strength
│   │   ├── customer_context.py         # NEW: Shared context ("I'm busy")
│   │   ├── conversation_card.py        # NEW: AI-generated cards
│   │   ├── intervention.py             # NEW: Intervention tracking
│   │   └── identity_snapshot.py        # NEW: Historical identity scores
│   │
│   ├── ml_models/                      # Trained ML artifacts
│   │   ├── churn_model.pkl             # (existing)
│   │   ├── shap_explainer.pkl          # (existing, reused for cause diagnostics)
│   │   ├── segmentation_model.pkl      # (existing)
│   │   ├── segment_scaler.pkl          # (existing)
│   │   ├── columns.json                # (existing)
│   │   └── segment_mapping.json        # ENHANCED: Identity-based names
│   │
│   ├── schemas/                        # Pydantic request/response models
│   │   ├── __init__.py
│   │   ├── identity.py                 # NEW: Identity score schemas
│   │   ├── customer.py                 # NEW: Customer schemas
│   │   ├── conversation_card.py        # NEW: Card schemas
│   │   ├── auth.py                     # NEW: JWT token schemas
│   │   └── churn.py                    # (existing churn schemas)
│   │
│   ├── utils/
│   │   ├── logger.py                   # NEW: Structlog configuration
│   │   ├── errors.py                   # NEW: Custom exception handlers
│   │   └── cache.py                    # NEW: LRU cache decorators
│   │
│   ├── migrations/                     # Alembic database migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   └── alembic.ini
│   │
│   ├── tests/                          # Backend tests
│   │   ├── test_identity_engine.py     # NEW
│   │   ├── test_conversation_cards.py  # NEW
│   │   ├── test_websocket.py           # NEW
│   │   ├── test_auth.py                # NEW
│   │   └── conftest.py                 # pytest fixtures
│   │
│   ├── requirements.txt                # ENHANCED: Add new dependencies
│   ├── .env                            # ENHANCED: Add secrets
│   ├── README.md                       # (existing)
│   └── QUICKSTART.md                   # (existing)
│
├── docs/                               # Project documentation
│   ├── index.md                        # (existing)
│   ├── prd.md                          # (existing)
│   ├── architecture.md                 # THIS FILE
│   ├── research-integrated-2025-11-21.md  # (existing)
│   ├── bmm-brainstorming-session-2025-11-21.md  # (existing)
│   ├── project-overview.md             # (existing)
│   ├── development-guide.md            # ENHANCED
│   ├── api-contracts.md                # ENHANCED: Add new endpoints
│   └── bmm-workflow-status.yaml        # (existing)
│
├── docker-compose.yml                  # NEW: Multi-container setup
├── .dockerignore                       # NEW
├── .gitignore                          # (existing)
├── README.md                           # ENHANCED: Pulse overview
└── .env.example                        # NEW: Template for all services
```

## FR Category to Architecture Mapping

| FR Category | Backend Modules | Frontend Components | Widget Components | Database Tables |
|-------------|-----------------|---------------------|-------------------|-----------------|
| **Identity Engine (FR1-FR6)** | `identity_engine.py`, `segment_customers.py` | `IdentityScore.jsx`, `KPICards.jsx` | `IdentityDashboard.jsx`, `ProgressMilestones.jsx` | `customers`, `identity_snapshot` |
| **Business Dashboard (FR7-FR13)** | `api_server.py` (REST endpoints) | `Dashboard.jsx`, `IdentityView.jsx`, `ConversationQueue.jsx`, `SegmentationPage.jsx` | N/A | `customers`, `conversation_card`, `businesses` |
| **Customer Widget (FR14-FR19)** | `websocket_manager.py`, `api_server.py` (WebSocket) | N/A | `PulseWidget.jsx`, `ContextButtons.jsx`, `MicroCelebration.jsx`, `WrappedReflection.jsx` | `customer_context`, `customers` |
| **Predictive Enablement (FR20-FR23)** | `conversation_cards.py`, `identity_engine.py` | `ConversationCards.jsx`, `CustomerContext.jsx` | N/A | `conversation_card`, `intervention` |
| **Integration & Data (FR24-FR27)** | `database.py`, `auth.py`, `api_server.py` | `api.js`, `websocket.js` | `widget-init.js`, `auth.js` | All tables (multi-tenant) |
| **Demo-Specific (FR28-FR30)** | Seed data scripts, mock data generators | `mockData.js` | Demo JWT generator | Seed SQL scripts |

## Technology Stack Details

### Core Technologies

**Frontend (Business Dashboard):**
- React 19.2.0 + React Router 7.9.5
- TailwindCSS 3.4.1
- Recharts 3.3.0
- Axios 1.13.2
- Zustand 5.0.8 (state management)
- Lucide React 0.552.0 (icons)

**Widget (Customer-Facing):**
- Vite (latest)
- React 19.x
- TailwindCSS 3.x
- Shadow DOM API
- UMD bundle output

**Backend:**
- FastAPI 0.121.3
- Python 3.12+
- PostgreSQL 18.1
- SQLAlchemy 2.0.44 + asyncpg 0.28.x
- python-jose 3.3.0 (JWT)
- openai 2.8.1 (Conversation Cards)
- SHAP (existing, for cause diagnostics)
- structlog 25.5.0 (logging)
- pytest + pytest-asyncio 1.3.0 (testing)

### Integration Points

**1. Widget → Backend WebSocket Connection**
```
Widget (browser)
  ↓ wss://api.pulse.com/ws?token={jwt}
Backend WebSocket Manager
  ↓ Validates JWT
  ↓ Registers connection by customer_id + business_id
  ↔ Bi-directional messages (context sharing, identity updates)
```

**2. Business Dashboard → Backend**
```
Frontend (React)
  ↓ REST API (https://api.pulse.com/api/*)
  ↓ WebSocket (wss://api.pulse.com/ws/dashboard?token={jwt})
Backend FastAPI
  ↔ CRUD operations + real-time updates
```

**3. Backend → PostgreSQL**
```
FastAPI
  ↓ SQLAlchemy async ORM
PostgreSQL 18.1
  ↔ Multi-tenant queries (business_id filter)
```

**4. Backend → OpenAI**
```
conversation_cards.py
  ↓ async API call
OpenAI GPT-4o-mini
  ↔ Generate conversation starters
```

**5. Widget Embedding (Customer's Site)**
```html
<!-- Host website includes -->
<script src="https://cdn.pulse.com/widget.js"></script>
<script>
  PulseWidget.init({
    token: 'jwt-from-host-app',  // Host generates JWT
    apiUrl: 'https://api.pulse.com',
    position: 'bottom-right'
  });
</script>
```

## Novel Pattern Designs

### Pattern 1: Transparent Customer Identity Dashboard

**Purpose:** Allow end-customers to view their own "health score" (Identity Strength) - a capability no competitor offers.

**Components:**
- **Widget:** `IdentityDashboard.jsx` displays customer's own score
- **Backend:** `identity_engine.py` calculates score + SHAP explanations
- **Database:** `customers.identity_strength` column, `identity_snapshot` table for history

**Data Flow:**
```
1. Customer opens host website → Widget loads
2. Widget sends JWT via WebSocket connection
3. Backend validates JWT, extracts customer_id + business_id
4. Backend queries identity_strength from database (cached)
5. Backend sends identity score + top 3 SHAP factors to widget
6. Widget renders dashboard with:
   - Identity Strength: 78/100
   - "Strong because: High engagement, Long tenure, Satisfied"
   - Progress milestones
```

**Implementation Guide:**
- **Security:** Widget only sees own customer_id's data (enforced by JWT validation)
- **Privacy:** Customer controls what they share via context buttons
- **Real-time:** WebSocket ensures instant updates when score changes

**Affects FR Categories:** Identity Engine (FR1-FR6), Customer Widget (FR14-FR19)

---

### Pattern 2: One-Tap Context Sharing

**Purpose:** Customers declare their state ("I'm busy", "I'm stuck") with one tap, replacing AI guesswork with explicit communication.

**Components:**
- **Widget:** `ContextButtons.jsx` - 4 fixed buttons + optional custom text
- **Backend:** `websocket_manager.py` broadcasts context to business dashboard
- **Database:** `customer_context` table stores history

**Data Flow:**
```
1. Customer clicks "I'm busy" button in widget
2. Widget sends WebSocket message: {type: 'context_share', context: 'busy'}
3. Backend saves to customer_context table with timestamp
4. Backend broadcasts to business dashboard WebSocket (same business_id)
5. Dashboard shows notification: "Customer X shared: I'm busy"
6. Identity engine adjusts intervention priority (lower urgency)
```

**Implementation Guide:**
- **Context Types:** `busy`, `stuck`, `exploring`, `frustrated`
- **Persistence:** Stored in DB, expires after 7 days
- **AI Integration:** Context fed into conversation card generation prompt

**Affects FR Categories:** Customer Widget (FR16-FR17), Predictive Enablement (FR21-FR22)

---

### Pattern 3: AI-Prepared Human Touchpoints (Conversation Cards)

**Purpose:** AI generates personalized conversation starters, but humans deliver them - avoiding "automated spam" feeling.

**Components:**
- **Backend:** `conversation_cards.py` uses GPT-4o-mini + identity context
- **Dashboard:** `ConversationQueue.jsx` shows pending cards
- **Database:** `conversation_card` table tracks status (pending/actioned/completed)

**Data Flow:**
```
1. Identity engine detects erosion: customer identity drops from 85 → 72
2. Triggers conversation card generation
3. Backend calls GPT-4o-mini with prompt:
   - Identity strength: 72/100 (down from 85)
   - Shared context: "I'm busy"
   - SHAP factors: Low engagement, Missed last order
   - Generate warm, empathetic opener
4. GPT returns: "Hey Sarah, noticed you've been swamped lately. We saved
   your favorites list - want us to simplify your next order?"
5. Card saved to DB with status: pending
6. Business dashboard shows card in queue
7. CSM reviews, edits if needed, marks "actioned"
8. Outcome tracked (responded/ignored/converted)
```

**Implementation Guide:**
- **Prompt Engineering:** Include identity context, SHAP factors, customer state
- **Fallback:** Rule-based templates if OpenAI API unavailable
- **Cost Control:** Generate cards only for identity drops > 10 points
- **Learning Loop:** Track outcomes → improve prompts (FR23)

**Affects FR Categories:** Business Dashboard (FR10-FR11), Predictive Enablement (FR20-FR23)

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### Naming Conventions

**Database Tables & Columns:**
- Tables: `snake_case`, plural (e.g., `customers`, `conversation_cards`)
- Columns: `snake_case` (e.g., `identity_strength`, `business_id`)
- Foreign keys: `{table_singular}_id` (e.g., `customer_id`, `business_id`)
- Timestamps: `created_at`, `updated_at` (always include both)

**Backend (Python):**
- Files: `snake_case.py` (e.g., `identity_engine.py`)
- Classes: `PascalCase` (e.g., `IdentityEngine`, `ConversationCard`)
- Functions: `snake_case` (e.g., `calculate_identity_strength()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_IDENTITY_SCORE = 100`)

**Frontend (React):**
- Components: `PascalCase.jsx` (e.g., `IdentityScore.jsx`)
- Files (non-components): `camelCase.js` (e.g., `websocket.js`)
- Functions: `camelCase` (e.g., `formatIdentityScore()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `WS_RECONNECT_DELAY`)

**API Endpoints:**
- REST: `/api/{resource}` plural (e.g., `/api/customers`, `/api/conversation-cards`)
- WebSocket: `/ws/{purpose}` (e.g., `/ws`, `/ws/dashboard`)
- Parameters: `kebab-case` in URLs, `snake_case` in JSON (e.g., `/api/customers/{customer-id}`)

**Environment Variables:**
- Format: `UPPER_SNAKE_CASE`
- Prefix by service: `REACT_APP_*` (frontend), `WIDGET_*` (widget), no prefix (backend)
- Examples: `REACT_APP_API_URL`, `DATABASE_URL`, `OPENAI_API_KEY`

### Code Organization

**Backend Module Structure:**
```python
# Each module follows this pattern:
# 1. Imports (stdlib → third-party → local)
# 2. Constants
# 3. Pydantic schemas (if applicable)
# 4. Main logic functions
# 5. Helper functions

# Example: identity_engine.py
from functools import lru_cache
from typing import Dict, List

import shap
from sqlalchemy.ext.asyncio import AsyncSession

from models.customer import Customer
from utils.logger import get_logger

logger = get_logger(__name__)

MAX_IDENTITY_SCORE = 100

async def calculate_identity_strength(
    customer: Customer,
    session: AsyncSession
) -> Dict:
    """Calculate identity strength score (0-100) with SHAP explanations."""
    # Implementation
```

**Frontend Component Structure:**
```jsx
// Each component follows this pattern:
// 1. Imports (React → libraries → local)
// 2. Component definition
// 3. Prop types (if using TypeScript/PropTypes)
// 4. Styled components (if using styled-components)
// 5. Export

// Example: IdentityScore.jsx
import React, { useEffect } from 'react';
import { useIdentityStore } from '../services/identityStore';
import { formatScore } from '../utils/formatters';

export function IdentityScore({ customerId }) {
  const { score, loading } = useIdentityStore();

  // Component logic

  return (
    <div className="identity-score">
      {/* JSX */}
    </div>
  );
}
```

**Test File Location:**
- Backend: `tests/test_{module}.py` (e.g., `tests/test_identity_engine.py`)
- Frontend: `{component}.test.jsx` co-located with component
- Widget: `__tests__/{component}.test.jsx`

### Error Handling

**Backend Pattern:**
```python
from fastapi import HTTPException, status
from utils.logger import get_logger
from utils.errors import IdentityCalculationError

logger = get_logger(__name__)

async def calculate_identity(customer_id: str):
    try:
        # Business logic
        pass
    except IdentityCalculationError as e:
        logger.error("identity_calculation_failed",
                    customer_id=customer_id,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "IDENTITY_CALC_FAILED",
                "message": "Unable to calculate identity strength",
                "customer_id": customer_id
            }
        )
```

**Frontend Pattern:**
```jsx
try {
  const data = await api.getIdentityScore(customerId);
  setScore(data);
} catch (error) {
  if (error.response?.data?.error_code === 'IDENTITY_CALC_FAILED') {
    showErrorToast('Unable to load identity score. Please try again.');
  } else {
    showErrorToast('An unexpected error occurred.');
  }
  logger.error('Failed to fetch identity score', { customerId, error });
}
```

**Widget Pattern (Graceful Degradation):**
```jsx
// Widget should never crash the host page
try {
  // Widget logic
} catch (error) {
  console.warn('[Pulse Widget] Error:', error);
  // Show minimal error state in widget, don't propagate
  setWidgetState('error');
}
```

### Logging Strategy

**Backend (structlog):**
```python
from utils.logger import get_logger

logger = get_logger(__name__)

# Always include business_id for multi-tenant filtering
logger.info("identity_score_calculated",
           business_id=business_id,
           customer_id=customer_id,
           score=identity_strength,
           duration_ms=duration)

logger.error("conversation_card_generation_failed",
            business_id=business_id,
            customer_id=customer_id,
            error=str(e),
            traceback=traceback.format_exc())
```

**Log Levels:**
- `DEBUG`: Detailed diagnostic info (disabled in production)
- `INFO`: Normal operations, identity calculations, card generation
- `WARNING`: Degraded functionality, fallback to templates
- `ERROR`: Failed operations, exceptions
- `CRITICAL`: System-wide failures

**Frontend Logging:**
```jsx
// Minimal logging, errors only
console.error('[Pulse] Failed to connect WebSocket', { error, customerId });
```

### API Response Format

**Success Response:**
```json
{
  "data": {
    "identity_strength": 78,
    "shap_factors": [
      {"feature": "tenure", "value": 365, "contribution": 15},
      {"feature": "engagement", "value": 8.5, "contribution": 12}
    ]
  }
}
```

**Error Response:**
```json
{
  "error_code": "IDENTITY_CALC_FAILED",
  "message": "Unable to calculate identity strength",
  "details": {
    "customer_id": "cust_123",
    "business_id": "biz_456"
  }
}
```

**WebSocket Message Format:**
```json
{
  "type": "identity_update",
  "payload": {
    "customer_id": "cust_123",
    "identity_strength": 78,
    "timestamp": "2025-11-22T10:30:00Z"
  }
}
```

### Database Access Patterns

**Multi-Tenant Query Pattern (ALWAYS filter by business_id):**
```python
# CORRECT - Includes business_id filter
async def get_customer(customer_id: str, business_id: str, session: AsyncSession):
    result = await session.execute(
        select(Customer)
        .where(Customer.id == customer_id)
        .where(Customer.business_id == business_id)  # MANDATORY
    )
    return result.scalar_one_or_none()

# INCORRECT - Missing business_id filter (security risk!)
async def get_customer_wrong(customer_id: str, session: AsyncSession):
    result = await session.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    return result.scalar_one_or_none()  # Can access other tenants' data!
```

**Async Context Manager for Sessions:**
```python
from database import get_db

async def some_endpoint(business_id: str):
    async with get_db() as session:
        customer = await get_customer(customer_id, business_id, session)
        # Session auto-commits on success, rolls back on exception
```

### WebSocket Message Handling

**Backend (websocket_manager.py):**
```python
class ConnectionManager:
    def __init__(self):
        # Key: (business_id, customer_id) → WebSocket
        self.active_connections: Dict[Tuple[str, str], WebSocket] = {}

    async def broadcast_to_business(self, business_id: str, message: dict):
        """Send message to all connections for a business."""
        for (bid, cid), ws in self.active_connections.items():
            if bid == business_id:
                await ws.send_json(message)
```

**Widget Client:**
```jsx
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'identity_update':
      updateIdentityScore(message.payload);
      break;
    case 'celebration':
      showMicroCelebration(message.payload);
      break;
    default:
      console.warn('[Pulse] Unknown message type:', message.type);
  }
};
```

### Testing Patterns

**Backend Test Pattern:**
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_calculate_identity_strength(async_client: AsyncClient, test_customer):
    response = await async_client.post(
        f"/api/customers/{test_customer.id}/identity",
        headers={"Authorization": f"Bearer {test_jwt}"}
    )
    assert response.status_code == 200
    assert 0 <= response.json()["data"]["identity_strength"] <= 100
```

**Frontend Test Pattern:**
```jsx
import { render, screen } from '@testing-library/react';
import { IdentityScore } from './IdentityScore';

test('renders identity score correctly', () => {
  render(<IdentityScore score={78} />);
  expect(screen.getByText(/78/)).toBeInTheDocument();
});
```

## Data Architecture

### PostgreSQL Schema

**Core Tables:**

```sql
-- Businesses (tenants)
CREATE TABLE businesses (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
    id VARCHAR PRIMARY KEY,
    business_id VARCHAR NOT NULL REFERENCES businesses(id),
    identity_strength FLOAT,  -- 0-100
    segment VARCHAR,
    email VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_business_identity (business_id, identity_strength)
);

-- Customer Context Sharing
CREATE TABLE customer_contexts (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR NOT NULL REFERENCES customers(id),
    business_id VARCHAR NOT NULL REFERENCES businesses(id),
    context_type VARCHAR NOT NULL,  -- busy, stuck, exploring, frustrated
    timestamp TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    INDEX idx_business_customer (business_id, customer_id)
);

-- Conversation Cards
CREATE TABLE conversation_cards (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR NOT NULL REFERENCES customers(id),
    business_id VARCHAR NOT NULL REFERENCES businesses(id),
    ai_generated_opener TEXT,
    status VARCHAR NOT NULL,  -- pending, actioned, completed
    outcome VARCHAR,  -- responded, ignored, converted
    created_at TIMESTAMP DEFAULT NOW(),
    actioned_at TIMESTAMP,
    INDEX idx_business_status (business_id, status)
);

-- Identity Snapshots (historical)
CREATE TABLE identity_snapshots (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR NOT NULL REFERENCES customers(id),
    business_id VARCHAR NOT NULL REFERENCES businesses(id),
    identity_strength FLOAT,
    snapshot_date DATE,
    INDEX idx_customer_date (customer_id, snapshot_date)
);
```

### Data Relationships

```
businesses (1) ──< (N) customers
customers (1) ──< (N) customer_contexts
customers (1) ──< (N) conversation_cards
customers (1) ──< (N) identity_snapshots
```

## API Contracts

### REST Endpoints

**Identity Engine:**
- `GET /api/customers/{customer_id}/identity` - Get identity score + SHAP factors
- `POST /api/customers/{customer_id}/identity/recalculate` - Trigger recalculation

**Conversation Cards:**
- `GET /api/conversation-cards?status=pending` - List cards (filtered by business_id from JWT)
- `POST /api/conversation-cards/{card_id}/action` - Mark card as actioned
- `PUT /api/conversation-cards/{card_id}/outcome` - Record outcome

**Customers:**
- `GET /api/customers?segment={segment}` - List customers by segment
- `GET /api/customers/{customer_id}` - Get customer details
- `POST /api/customers/upload` - Bulk upload CSV

### WebSocket Messages

**Client → Server:**
```json
{
  "type": "context_share",
  "payload": {
    "context_type": "busy"
  }
}
```

**Server → Client:**
```json
{
  "type": "identity_update",
  "payload": {
    "identity_strength": 78,
    "change": -5,
    "shap_factors": [...]
  }
}
```

## Security Architecture

**Authentication:**
- JWT tokens with HS256 (hackathon), RS256 (post-MVP)
- Claims: `customer_id`, `business_id`, `exp`, `iat`
- Token validation on every WebSocket connection + API request

**Authorization:**
- Multi-tenant isolation via `business_id` filtering
- Database queries MUST include `business_id` WHERE clause
- Widget only accesses own customer data (JWT validation)

**Data Protection:**
- All traffic over HTTPS/WSS
- Database credentials in environment variables
- OpenAI API key server-side only
- No customer PII in logs

**CORS:**
- Frontend: Same-origin
- Widget: Allow all origins (embedded in customer sites)
- API: Configured origins list

## Performance Considerations

**Identity Score Calculation:**
- LRU cache with 5-minute TTL
- Async computation (non-blocking)
- Target: < 2 seconds (NFR1)

**WebSocket Scalability:**
- Single server for hackathon
- Post-MVP: Redis pub/sub for multi-instance

**Database Performance:**
- Indexes on `business_id` + query columns
- Connection pooling (SQLAlchemy async)
- Query optimization for 10K+ customers

**Widget Load Time:**
- UMD bundle minified + gzipped
- Target: < 500ms (NFR3)
- Shadow DOM for style isolation (no global CSS overhead)

## Deployment Architecture

### Docker Compose (Hackathon)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:18.1
    environment:
      POSTGRES_DB: pulse
      POSTGRES_USER: pulse
      POSTGRES_PASSWORD: pulse_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://pulse:pulse_dev@postgres/pulse
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:8000/api
      REACT_APP_WS_URL: ws://localhost:8000/ws

  widget:
    build: ./widget
    ports:
      - "5173:5173"
    volumes:
      - ./widget/dist:/app/dist

volumes:
  postgres_data:
```

### Post-MVP Deployment

**Platforms:** Railway, Render, Fly.io (all have free tiers)

**Architecture:**
- Frontend: Static hosting (Vercel, Netlify)
- Widget: CDN (Cloudflare, AWS CloudFront)
- Backend: Container platform
- Database: Managed PostgreSQL (Supabase, Neon)

## Development Environment

### Prerequisites

**Frontend & Widget:**
- Node.js 18+ and npm 9+
- Git

**Backend:**
- Python 3.12+
- pip
- PostgreSQL 18+ (or Docker)

### Setup Commands

**Initial Setup:**
```bash
# Clone repository
git clone <repo-url>
cd sheba-dashboard

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your secrets

# Database migrations
alembic upgrade head

# Frontend setup
cd ../frontend
npm install
cp .env.example .env

# Widget setup
cd ../widget
npm create vite@latest . -- --template react
npm install
cp .env.example .env
```

**Running Locally:**
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
python api_server.py

# Terminal 2: Frontend
cd frontend
npm start

# Terminal 3: Widget
cd widget
npm run dev
```

**Docker (Recommended for Hackathon):**
```bash
docker-compose up --build
```

## Architecture Decision Records (ADRs)

### ADR-001: Enhanced Multi-Factor Identity Scoring
**Status:** Accepted
**Context:** Need to transform "churn risk" to "identity strength" without rebuilding ML infrastructure.
**Decision:** Reuse existing SHAP model, calculate identity as weighted sum of positive behavioral signals.
**Consequences:** Fast implementation, philosophically aligned, SHAP still usable for "cause diagnostics".

### ADR-002: WebSockets for Real-time Communication
**Status:** Accepted
**Context:** NFR requirements demand < 2s identity updates, 200ms context sharing response.
**Decision:** Use WebSockets (FastAPI/Starlette) for bi-directional real-time updates.
**Consequences:** Demo impact, meets NFRs, native FastAPI support. Trade-off: More complex than polling.

### ADR-003: PostgreSQL from Day One
**Status:** Accepted
**Context:** Need multi-tenant isolation, production scalability, ACID transactions.
**Decision:** PostgreSQL 18.1 + SQLAlchemy async ORM instead of SQLite → PostgreSQL migration.
**Consequences:** Production-ready immediately, slight setup complexity. Free tiers available (Supabase, Neon).

### ADR-004: JWT Token Pass-through for Widget Auth
**Status:** Accepted
**Context:** Widget needs to authenticate customers without separate login.
**Decision:** Business app generates JWT, widget passes to Pulse backend for validation.
**Consequences:** Industry standard, secure, stateless. Business controls customer access. HS256 for hackathon, RS256 post-MVP.

### ADR-005: OpenAI GPT-4o-mini for Conversation Cards
**Status:** Accepted
**Context:** Need AI-generated conversation starters for "AI prepares, humans deliver" differentiator.
**Decision:** Use OpenAI GPT-4o-mini API with rule-based fallback.
**Consequences:** High quality, demo credibility, ~$0.0001/card cost. Requires API key management.

### ADR-006: Vite UMD Bundle for Embeddable Widget
**Status:** Accepted
**Context:** Customer Widget must embed in any website via `<script>` tag.
**Decision:** Vite build with UMD output + Shadow DOM for style isolation.
**Consequences:** Modern tooling, fast builds, single .js file distribution. Based on makerkit/react-embeddable-widget pattern.

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-22_
_For: BMad_
_Project: Pulse - Customer Identity Intelligence Platform_
