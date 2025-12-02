# Pulse - Team Work Allocation Plan

> **Project:** Pulse - Customer Identity Intelligence Platform
> **Team Size:** 4 members
> **Goal:** Balanced workload distribution (25% each)
> **Timeline:** 6 days (Hackathon)

---

## Team Structure

| Role | Focus Areas | Primary Deliverable |
|------|-------------|---------------------|
| **AI+Backend Engineer #1** | Identity Engine, Database, Core API | Identity scoring system |
| **AI+Backend Engineer #2** | WebSockets, OpenAI, Auth, DevOps | Real-time + AI features + Deployment |
| **Frontend Engineer** | Business Dashboard | Enhanced dashboard with identity focus |
| **R&D Engineer** | Customer Widget, Integration, Demo | Embeddable widget + Demo preparation |

---

## 👤 AI+Backend Engineer #1: "Identity & Database Lead"

### Focus
Identity Engine + Database + Core API

### Responsibilities

**1. Identity Engine** (`backend/identity_engine.py`)
- Enhanced multi-factor identity scoring algorithm
- SHAP integration for cause diagnostics
- Predictive enablement logic (what customer needs next)
- LRU caching implementation
- Identity strength calculation: weighted sum of positive signals
  - Tenure (20 points max)
  - Engagement (20 points max)
  - Satisfaction (20 points max)
  - Loyalty (20 points max)
  - Value (20 points max)

**2. Database Setup**
- PostgreSQL schema design (4 core tables)
- Alembic migrations setup
- SQLAlchemy async ORM models:
  - `Business` (tenants)
  - `Customer` (with identity_strength column)
  - `IdentitySnapshot` (historical scores)
- Seed data scripts for demo

**3. Core REST API Endpoints**
- `GET /api/customers/{id}/identity` - Get identity score + SHAP factors
- `POST /api/customers/{id}/identity/recalculate` - Trigger recalculation
- `GET /api/customers?segment={segment}` - List customers by segment
- `GET /api/customers/{id}` - Get customer details
- `POST /api/customers/upload` - Bulk CSV upload (FastAPI UploadFile + pandas)
- `GET /health` - Health check

**4. ML Model Enhancement**
- Adapt existing SHAP model for identity strength
- Update segment mapping (identity-based names)
- Segment customers by identity strength (Strong/Growing/At-Risk/Critical)

### Files Owned
- `backend/identity_engine.py` ⭐ **Critical**
- `backend/database.py`
- `backend/models/__init__.py`
- `backend/models/business.py`
- `backend/models/customer.py`
- `backend/models/identity_snapshot.py`
- `backend/migrations/` (Alembic setup + versions)
- `backend/segment_customers.py` (enhance existing)
- `backend/schemas/identity.py`
- `backend/schemas/customer.py`
- `backend/seeds/demo_data.sql`

### Success Metrics
- ✅ Identity scores calculate in < 2 seconds (NFR1)
- ✅ Database supports 10,000+ customers per tenant (NFR10)
- ✅ CSV upload processes successfully
- ✅ SHAP explanations generate correctly
- ✅ Multi-tenant isolation works (all queries filter by business_id)

### Estimated Effort
**~900 lines of code** | **25% of total work**

---

## 👤 AI+Backend Engineer #2: "Real-time, AI & DevOps Lead"

### Focus
WebSockets + OpenAI + Authentication + DevOps

### Responsibilities

**1. WebSocket System**
- `websocket_manager.py` - Connection manager
  - Track connections by (business_id, customer_id)
  - Broadcast to business (all dashboard users)
  - Broadcast to customer (widget)
  - Handle disconnections gracefully
- WebSocket endpoints in `api_server.py`:
  - `/ws` - Customer widget connections
  - `/ws/dashboard` - Business dashboard connections
- Real-time event triggers:
  - Identity score updates
  - Context sharing notifications
  - Conversation card creation
- Message routing and validation

**2. Conversation Cards + OpenAI Integration**
- `conversation_cards.py` - AI card generation
  - OpenAI GPT-4o-mini API integration (async)
  - Prompt engineering with customer context:
    - Identity strength + change
    - Shared customer context ("I'm busy")
    - SHAP factors (top 3)
    - Recent activity patterns
  - Rule-based fallback templates (if API fails)
  - Cost optimization (only generate for identity drops > 10 points)
- SQLAlchemy models: ConversationCard, CustomerContext, Intervention

**3. Authentication & Security**
- `auth.py` - JWT validation system
  - HS256 signature validation (hackathon)
  - Extract customer_id + business_id from claims
  - Token expiration checking
  - WebSocket auth middleware
- Multi-tenant security helpers
- business_id filtering utilities

**4. API Endpoints**
- `GET /api/conversation-cards?status={status}` - List cards (filtered by business_id)
- `POST /api/conversation-cards/{id}/action` - Mark card as actioned
- `PUT /api/conversation-cards/{id}/outcome` - Record outcome (responded/ignored/converted)
- `POST /api/customers/{id}/context` - Save customer shared context
- `GET /api/customers/{id}/contexts` - Get context history

**5. Utilities & Infrastructure**
- `utils/logger.py` - Structlog configuration (JSON output)
- `utils/errors.py` - Custom exception classes
- `utils/cache.py` - LRU cache decorators

**6. DevOps & Deployment**
- `docker-compose.yml` - Multi-container orchestration
  - PostgreSQL service
  - Backend service
  - Frontend service
  - Widget build service
- `backend/Dockerfile` - Backend containerization
- `frontend/Dockerfile` - Frontend containerization
- `widget/Dockerfile` - Widget build containerization
- `.env.example` - Environment template for all services
- `.dockerignore` files
- Container networking configuration
- Volume management for PostgreSQL data
- Health checks for all services

### Files Owned
- `backend/websocket_manager.py` ⭐ **Critical**
- `backend/conversation_cards.py` ⭐ **Critical**
- `backend/auth.py` ⭐ **Critical**
- `backend/models/conversation_card.py`
- `backend/models/customer_context.py`
- `backend/models/intervention.py`
- `backend/utils/logger.py`
- `backend/utils/errors.py`
- `backend/utils/cache.py`
- `backend/schemas/conversation_card.py`
- `backend/schemas/auth.py`
- `backend/api_server.py` (shared - add WebSocket + new endpoints)
- `docker-compose.yml` ⭐ **Critical**
- `backend/Dockerfile` ⭐
- `frontend/Dockerfile` ⭐
- `widget/Dockerfile` ⭐
- `.env.example`
- `.dockerignore`

### Success Metrics
- ✅ WebSocket connections stable and performant
- ✅ Context sharing responds in < 200ms (NFR4)
- ✅ Conversation cards generate with GPT-4o-mini
- ✅ JWT authentication works for widget + dashboard
- ✅ Multi-tenant isolation enforced (business_id filtering)
- ✅ Docker Compose brings up full stack successfully
- ✅ All services healthy in containers

### Estimated Effort
**~1100 lines of code** | **25% of total work**

---

## 👤 Frontend Engineer: "Business Dashboard Lead"

### Focus
Business Dashboard ONLY (all React components and pages)

### Responsibilities

**1. New Identity-Focused Components**
- `IdentityScore.jsx` ⭐
  - Circular progress indicator (0-100 scale)
  - Color coding (green/yellow/orange/red)
  - SHAP factor display (top 3 contributors)
  - Trend indicator (↑↓ from last snapshot)

- `ConversationCards.jsx` ⭐
  - Card queue display
  - AI-generated opener preview
  - Action buttons (Mark Actioned, Edit)
  - Status badges (pending/actioned/completed)
  - Outcome tracking

- `CustomerContext.jsx`
  - Display customer-shared context
  - Context type badges ("I'm busy", "I'm stuck")
  - Timestamp display
  - Context history timeline

- `IdentityView.jsx` (NEW PAGE)
  - Customer list with identity strength column
  - Segment filter dropdown
  - Sort by identity strength
  - Click to view customer details

- `ConversationQueue.jsx` (NEW PAGE)
  - Pending conversation cards
  - Filter by customer/status
  - Batch actions

**2. Enhanced Existing Components**
- `KPICards.jsx`
  - Replace churn metrics with identity metrics
  - Avg identity strength
  - Customers by segment (Strong/Growing/At-Risk/Critical)
  - Identity trend chart

- `ChurnTable.jsx` → Rename to `CustomerTable.jsx`
  - Add `identity_strength` column
  - Color-coded identity scores
  - Replace "churn risk" with "identity strength"
  - Click to open CustomerModal

- `CustomerModal.jsx`
  - Display identity dashboard (not churn prediction)
  - Show SHAP cause diagnostics
  - Display shared customer context
  - Show conversation card history
  - Intervention tracking

- `SegmentChart.jsx`
  - Update segment names (identity-based)
  - "Strong Identity" / "Growing" / "At-Risk" / "Critical"
  - Pie chart with identity distribution

- `ShapExplanation.jsx`
  - Reframe as "Cause Diagnostics"
  - "What makes this identity strong/weak"
  - SHAP waterfall or bar chart

**3. State Management (Zustand)**
- `services/identityStore.js` ⭐
  - Global state for identity scores
  - Customer list state
  - Conversation cards state
  - WebSocket connection state
  - Actions: updateIdentityScore, addConversationCard, etc.

**4. Real-time WebSocket Integration**
- `services/websocket.js` ⭐
  - WebSocket connection manager
  - Message handler (switch on message.type)
  - Reconnection logic
  - JWT token in connection URL
  - Event listeners for:
    - `identity_update` → Update Zustand store
    - `context_share` → Show notification
    - `conversation_card_created` → Add to queue

**5. API Client Updates**
- `services/api.js` (enhance existing)
  - Add identity endpoints
  - Add conversation card endpoints
  - Add customer context endpoints
  - Axios interceptors for JWT

**6. Routing**
- `App.js`
  - Add `/identity` route → IdentityView page
  - Add `/conversation-queue` route → ConversationQueue page
  - Update navigation menu
  - Add route guards (if needed)

**7. Styling**
- Consistent TailwindCSS usage
- Identity strength color scheme:
  - 80-100: Green (Strong)
  - 60-79: Yellow (Growing)
  - 40-59: Orange (At-Risk)
  - 0-39: Red (Critical)

### Files Owned
- `frontend/src/components/IdentityScore.jsx` ⭐ **Critical**
- `frontend/src/components/ConversationCards.jsx` ⭐ **Critical**
- `frontend/src/components/CustomerContext.jsx`
- `frontend/src/components/KPICards.jsx` (enhance)
- `frontend/src/components/CustomerTable.jsx` (rename from ChurnTable)
- `frontend/src/components/CustomerModal.jsx` (enhance)
- `frontend/src/components/SegmentChart.jsx` (enhance)
- `frontend/src/components/ShapExplanation.jsx` (enhance)
- `frontend/src/pages/IdentityView.jsx` ⭐ **Critical**
- `frontend/src/pages/ConversationQueue.jsx`
- `frontend/src/pages/Dashboard.jsx` (enhance)
- `frontend/src/services/identityStore.js` ⭐ **Critical**
- `frontend/src/services/websocket.js` ⭐ **Critical**
- `frontend/src/services/api.js` (enhance)
- `frontend/src/utils/formatters.js` (identity score formatters)
- `frontend/src/App.js` (routing updates)
- `frontend/package.json` (add zustand dependency)

### Success Metrics
- ✅ Business dashboard displays identity scores correctly
- ✅ Real-time updates work via WebSocket
- ✅ Conversation cards queue is functional
- ✅ SHAP cause diagnostics render properly
- ✅ Customer context displays in real-time
- ✅ All components responsive and polished

### Estimated Effort
**~1050 lines of code** | **25% of total work**

---

## 👤 R&D Engineer: "Widget, Integration & Demo Lead"

### Focus
Customer Widget + Integration Testing + Demo Preparation

### Responsibilities

**1. Customer Widget - Full Ownership** (`widget/`)

**Setup:**
- Vite project initialization with React template
- `vite.config.js` - UMD build configuration
  - Output format: UMD (single .js file)
  - Library name: `PulseWidget`
  - External dependencies: React, ReactDOM
  - Rollup options for code splitting
- `tailwind.config.js` - Widget-specific Tailwind config
- `package.json` - Widget dependencies

**Core Components:**
- `PulseWidget.jsx` ⭐
  - Main container with Shadow DOM setup
  - Position control (bottom-right, bottom-left, etc.)
  - Minimize/maximize states
  - Widget theme configuration

- `IdentityDashboard.jsx`
  - Customer's identity score display (0-100)
  - "Strong because:" SHAP factors (top 3)
  - Progress bar visualization
  - Transparent design (customer sees their own data)

- `ContextButtons.jsx` ⭐
  - 4 one-tap buttons: "I'm busy", "I'm stuck", "I'm exploring", "I'm frustrated"
  - Click → Send WebSocket message
  - Visual feedback (button pressed state)
  - Optional custom text input

- `ProgressMilestones.jsx`
  - Journey visualization
  - Milestone checkpoints
  - Celebration triggers
  - Timeline view

- `MicroCelebration.jsx`
  - Achievement popups
  - Confetti animation (simple CSS)
  - Milestone unlocked notifications
  - Auto-dismiss after 3 seconds

- `WrappedReflection.jsx`
  - Basic "Your journey so far" view
  - Key stats (days active, identity score, milestones)
  - Shareable image/card (future)

**Services:**
- `services/websocket.js`
  - Widget WebSocket client
  - Connect with JWT token
  - Message handlers (identity_update, celebration)
  - Reconnection logic
  - Error handling (graceful degradation)

- `services/auth.js`
  - JWT token handling
  - Token validation (client-side decode)
  - Token refresh logic

- `services/api.js`
  - REST API fallback (if WebSocket fails)
  - Fetch identity score
  - Send context

**Initialization:**
- `main.jsx` - Widget entry point
- `widget-init.js` - UMD initialization wrapper
  - `PulseWidget.init({ token, apiUrl, position })` API
  - Shadow DOM creation
  - Style isolation
  - Host page integration

**Styling:**
- `styles.css` - Shadow DOM isolated styles
- TailwindCSS build for widget
- No global CSS pollution

**2. Widget Embedding Demo**
- `demo-host/index.html` - Sample host website
- `demo-host/generate-jwt.html` - JWT token generator demo
- Embedding instructions (code snippets)

**3. Integration Testing**
- End-to-end tests:
  - Widget → Backend WebSocket connection
  - Context sharing flow (widget → dashboard update)
  - Identity score updates (backend → widget display)
- Multi-tenant data isolation verification
- Cross-browser testing (Chrome, Firefox, Safari)

**4. Demo Data & Preparation**
- Create realistic demo scenarios:
  - Strong identity customer
  - At-risk customer with context sharing
  - Conversation card generation demo
- Demo script for judges (step-by-step walkthrough)
- Video recording or screenshots
- Judge-facing one-pager

**5. Documentation**
- `README.md` updates
  - Pulse overview (rewrite intro)
  - Architecture diagram
  - Quick start guide
  - Demo instructions
- Widget integration guide
- Troubleshooting section

### Files Owned
- `widget/` (ENTIRE directory) ⭐ **Critical**
  - `widget/src/components/PulseWidget.jsx` ⭐
  - `widget/src/components/IdentityDashboard.jsx`
  - `widget/src/components/ContextButtons.jsx` ⭐
  - `widget/src/components/ProgressMilestones.jsx`
  - `widget/src/components/MicroCelebration.jsx`
  - `widget/src/components/WrappedReflection.jsx`
  - `widget/src/services/websocket.js`
  - `widget/src/services/auth.js`
  - `widget/src/services/api.js`
  - `widget/src/main.jsx`
  - `widget/src/widget-init.js`
  - `widget/src/styles.css`
  - `widget/vite.config.js` ⭐
  - `widget/tailwind.config.js`
  - `widget/package.json`
  - `widget/.env.example`
- `demo-host/` (demo website)
  - `demo-host/index.html`
  - `demo-host/generate-jwt.html`
  - `demo-host/styles.css`
- `README.md` ⭐ (major rewrite)
- `docs/widget-integration-guide.md`
- `docs/demo-script.md`

### Success Metrics
- ✅ Widget embeds successfully in demo host site
- ✅ Shadow DOM prevents style conflicts
- ✅ WebSocket connection from widget works
- ✅ Context buttons send messages to backend
- ✅ Identity score displays and updates in real-time
- ✅ UMD bundle loads as single .js file
- ✅ Widget bundle size < 200KB (gzipped)
- ✅ Demo script is polished and rehearsed
- ✅ Integration tests pass

### Estimated Effort
**~1100 lines of code** | **25% of total work**

---

## Work Distribution Summary

| Team Member | Backend | Frontend/Widget | DevOps | Total LoC |
|-------------|---------|-----------------|--------|-----------|
| **AI+Backend #1** | ~800 | 0 | ~100 (migrations) | ~900 |
| **AI+Backend #2** | ~900 | 0 | ~200 (Docker) | ~1100 |
| **Frontend** | 0 | ~1050 | 0 | ~1050 |
| **R&D** | 0 | ~800 (widget) | ~300 (docs/demo) | ~1100 |

**✅ Balanced: Each person ~25% of total work**

---

## Parallel Work Phases

### Phase 1: Foundation (Days 1-3)
**Everyone works independently - No blockers**

**AI+Backend #1:**
- ✅ Database schema + migrations
- ✅ Identity engine algorithm
- ✅ Core API endpoints (can use mock data)

**AI+Backend #2:**
- ✅ Auth system + JWT validation
- ✅ WebSocket manager scaffold
- ✅ OpenAI conversation cards logic
- ✅ Docker Compose initial setup

**Frontend:**
- ✅ Zustand store setup
- ✅ Component scaffolds
- ✅ WebSocket client (mock backend responses)

**R&D:**
- ✅ Widget Vite project setup
- ✅ Widget components (mock backend responses)
- ✅ Demo host website

### Phase 2: Integration (Days 4-5)
**Connect all the pieces**

**Day 4 Integration:**
- Backend #1 + #2 merge: API + WebSocket endpoints working
- Frontend connects to real backend: REST + WebSocket
- R&D connects widget to real backend: Auth + WebSocket
- Docker Compose runs all services

**Day 5 Polish:**
- Full end-to-end testing
- Demo data loaded
- Bug fixes
- Performance optimization

### Phase 3: Demo Prep (Day 6)
**All team:**
- UI polish
- Error handling
- Demo script rehearsal
- Documentation finalization
- Video/screenshots
- Judge-facing materials

---

## Clear Integration Points

### Backend #1 ↔ Backend #2
- **Interface:** `calculate_identity_strength(customer_data) -> dict`
- Backend #2 calls Backend #1's identity engine from WebSocket handlers

### Backend ↔ Frontend
- **Interface:** API contracts in `docs/api-contracts.md`
- Frontend can mock API responses during Days 1-3
- Real integration on Day 4

### Backend ↔ Widget (R&D)
- **Interface:** Same API contracts + WebSocket messages
- Widget uses same JWT auth as dashboard
- R&D can mock during Days 1-3

### Docker (AI+Backend #2) uses everyone's code
- Each person provides working Dockerfile recipe
- AI+Backend #2 orchestrates with docker-compose.yml

---

## Communication Cadence

### Daily Sync (15 minutes)
**Each person shares:**
- ✅ What I finished yesterday
- 🚧 What I'm working on today
- 🚨 Any blockers

**Critical alignment topics:**
1. API contract changes
2. WebSocket message format updates
3. Database schema changes
4. Integration blockers

### Dedicated Channels
- **#backend** - AI+Backend #1 & #2 coordinate
- **#frontend-widget** - Frontend + R&D coordinate on UI
- **#integration** - Cross-team integration issues
- **#demo** - Demo preparation (all team)

---

## Fallback Plan (If Short on Time)

### Must-Have for Demo (Priority 1)
- ✅ Backend: Identity engine + WebSocket + Conversation cards (AI+Backend #1 & #2)
- ✅ Frontend: Business dashboard with identity scores (Frontend)
- ✅ Demo data: Synthetic customers loaded (AI+Backend #1)
- ✅ Docker: Working docker-compose (AI+Backend #2)

### Nice-to-Have (Priority 2)
- ⭐ Widget: Customer-facing widget (R&D)
  - If time-constrained, focus on business dashboard only
  - Widget can be "coming soon" slide in demo
- ⭐ Real-time: Full WebSocket updates
  - Fallback: Polling every 5 seconds acceptable
- ⭐ Micro-celebrations: Achievement popups
  - Can be skipped if widget is deprioritized

### Demo-Only Features (Priority 3)
- Wrapped reflections (basic version only)
- Advanced SHAP visualizations
- Historical identity trend charts

---

## Risk Mitigation

### Technical Risks

| Risk | Owner | Mitigation |
|------|-------|------------|
| WebSocket complexity | AI+Backend #2 | Start simple, add features incrementally |
| OpenAI API latency | AI+Backend #2 | Implement rule-based fallback early |
| Widget Shadow DOM issues | R&D | Test in multiple browsers early |
| Docker networking | AI+Backend #2 | Use docker-compose network defaults |
| Database migration failures | AI+Backend #1 | Test migrations early with seed data |

### Integration Risks

| Risk | Mitigation |
|------|------------|
| API contract mismatches | Document contracts in `api-contracts.md` on Day 1 |
| WebSocket message format changes | Version message types, backward compatible |
| Late integration issues | Daily integration tests starting Day 3 |
| Demo data quality | R&D reviews seed data with AI+Backend #1 |

---

## Success Criteria

### Per Team Member

**AI+Backend #1:**
- ✅ Identity scores calculate correctly with SHAP
- ✅ Database handles 10K+ customers
- ✅ Multi-tenant isolation works
- ✅ CSV upload processes successfully

**AI+Backend #2:**
- ✅ WebSocket connections stable (no disconnects)
- ✅ Conversation cards generate with GPT-4o-mini
- ✅ JWT auth works for widget + dashboard
- ✅ Docker Compose brings up full stack
- ✅ All services healthy

**Frontend:**
- ✅ Dashboard displays identity scores
- ✅ Real-time WebSocket updates work
- ✅ Conversation cards queue functional
- ✅ UI is polished and professional

**R&D:**
- ✅ Widget embeds in host site
- ✅ Context buttons send WebSocket messages
- ✅ Demo script is polished
- ✅ Integration tests pass
- ✅ README is comprehensive

### Team Success (Hackathon Win)
- 🏆 Judges say "I've never seen this before"
- 🏆 Demo shows complete story (business + customer sides)
- 🏆 Technical credibility (real ML, real-time, working end-to-end)
- 🏆 Differentiation clear (transparent dashboard, AI-prepared human touchpoints)

---

_Generated: 2025-11-22_
_For: Pulse Hackathon Team_
_Next Step: Create Epics and Stories (`/bmad:bmm:workflows:create-epics-and-stories`)_
