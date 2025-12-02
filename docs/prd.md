# Pulse - Product Requirements Document

**Author:** BMad
**Date:** 2025-11-21
**Version:** 1.0

---

## Executive Summary

**Pulse** is a Customer Identity Intelligence Platform that transforms how businesses understand and retain customers. Instead of predicting when customers will leave, Pulse predicts what they need to thrive—and empowers customers to own their own journey.

The platform serves two audiences simultaneously:
1. **Businesses** - Get Identity Strength Scores, Cause Diagnostics, and AI-prepared Conversation Cards
2. **Customers** - See their own progress, share context with one tap, and receive personalized "Wrapped" reflections

**Core Insight:** People don't stay for products. They stay for who they're becoming. Retention = Identity Attachment.

### What Makes This Special

**Pulse is the only platform that:**
- Shows customers their OWN health dashboard (everyone else hides scores)
- Predicts NEEDS, not departures (proactive vs reactive)
- Uses Identity Strength instead of Churn Risk (positive framing)
- Prepares AI insights for HUMAN delivery (not automated spam)
- Lets customers tell YOU their context ("I'm busy", "I'm confused")

**Manifesto:**
> "Pulse doesn't spy on customers to predict failure. Pulse empowers customers to own their journey, arms humans with AI leverage, acts before problems exist, and listens when customers speak."

---

## Project Classification

**Technical Type:** SaaS B2B Platform
**Domain:** Customer Success / Retention Tech
**Complexity:** Medium-High (novel category, two-sided value proposition)

This is a **brownfield enhancement** of an existing churn prediction system (Sheba Retention AI) with React frontend, Python/FastAPI backend, and SHAP explainability already implemented.

**Hackathon Goal:** Demonstrate full platform with both business dashboard and customer-facing widget.

---

## Success Criteria

### Primary Success (Hackathon)

1. **Judges say "I've never seen this before"** - The transparent customer dashboard and identity framing are genuinely novel
2. **Demo tells a complete story** - Business sees insights → prepares human touchpoint → customer receives value → both sides win
3. **Technical credibility** - Real ML (enhanced SHAP), real-time updates, working end-to-end

### Product Success (Post-Hackathon)

1. **Customers engage with their dashboard** - >30% of end-users check their Identity Score at least once
2. **One-tap context actually gets used** - Customers share state, proving the "ask don't guess" model works
3. **Conversation Cards drive action** - Business users act on AI-prepared touchpoints
4. **Identity Score correlates with retention** - Validates the core hypothesis

### Business Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Customer Identity Score accuracy | >85% correlation with actual retention | Proves the model works |
| Context sharing adoption | >20% of users share state at least once | Validates two-way model |
| Conversation Card action rate | >40% of cards result in touchpoint | Proves business value |
| Wrapped engagement | >50% open rate | Proves customer value |

---

## Product Scope

### MVP - Minimum Viable Product

**For Hackathon Demo - Must Have:**

**Business Dashboard:**
1. Identity Strength Scores (not churn risk) per customer
2. Cause Diagnostics - WHY identity is eroding (using SHAP)
3. Conversation Cards - AI-prepared human touchpoints
4. Segment view by identity strength (Strong/Growing/At-Risk/Critical)
5. Predictive Enablement - "This customer needs X next"

**Customer Widget (Embeddable):**
1. Transparent Health Dashboard - customer sees their own journey
2. One-tap Context Sharing - "I'm busy" / "I'm stuck" / "I'm exploring" / "I'm frustrated"
3. Progress milestones and micro-celebrations
4. Basic Wrapped reflection - "Your journey so far"

**Core Engine:**
1. Identity Strength Score algorithm (enhance existing SHAP model)
2. Cause diagnostic system (leverage existing explainability)
3. Predictive enablement logic (rule-based + ML)
4. Real-time state management

### Growth Features (Post-MVP)

1. **Full Wrapped Experience** - Shareable, periodic identity reflections (Spotify-style)
2. **Collective Wisdom** - "Others like you found success by..."
3. **Customer-designed Care Plans** - Let customers choose how they want to be helped
4. **Advanced Conversation Cards** - Best channel, optimal timing, suggested follow-ups
5. **Multi-tenant Support** - Multiple businesses on one platform
6. **API for Integration** - Embed Pulse in any product

### Vision (Future)

1. **Shared Product Governance** - Customers vote on feature priorities
2. **Portable Identity** - Customers own and can export their growth profile
3. **Symbiotic Retention** - Retention becomes emergent property, not a department
4. **Cross-platform Identity** - Track identity across multiple products
5. **Predictive Lifecycle** - Know what customers need before they do

---

## Innovation & Novel Patterns

### Category Creation: "Customer Identity Intelligence"

This is NOT another churn prediction tool. It's a new category defined by:

| Traditional Churn Tools | Pulse (Identity Intelligence) |
|------------------------|------------------------------|
| Hidden scores | Transparent customer dashboard |
| Predict failure | Predict success needs |
| Business extracts data | Customer owns relationship |
| Automated responses | AI-prepared human touchpoints |
| React to risk signals | Proactive enablement |
| Churn Risk Score | Identity Strength Score |

### Validation Approach

1. **Hypothesis:** Customers with visible progress tracking retain better than hidden-score customers
2. **Test:** A/B test transparent vs hidden dashboard in demo
3. **Fallback:** If transparency hurts (unlikely), make it opt-in

### Research Validation

- Duolingo streaks: 3.6x retention increase (proves identity/progress mechanics)
- 76% frustrated by lack of personalization (proves transparency gap)
- No competitor offers customer-visible health scores (blue ocean confirmed)

---

## SaaS B2B Specific Requirements

### Two-Sided Platform Architecture

**Side 1: Business Users (B2B Dashboard)**
- Customer Success Managers
- Product Managers
- Support Teams

**Side 2: End Customers (Embedded Widget)**
- Users of the business's product
- Embedded via JavaScript snippet or React component

### Data Flow

```
Business's Product → Pulse Engine → Identity Analysis
                          ↓
            ┌─────────────┴─────────────┐
            ↓                           ↓
    Business Dashboard           Customer Widget
    (Identity Scores,            (Progress, Context,
     Conversation Cards)          Wrapped)
```

### Multi-Tenancy Model (Post-MVP)

- Each business is a tenant
- Business defines their own identity milestones
- Customer data isolated per tenant
- Shared ML models, personalized thresholds

### Authentication Model

**Business Dashboard:**
- Email/password authentication
- Role-based access (Admin, CSM, Viewer)

**Customer Widget:**
- Authenticated via business's existing auth
- Widget receives customer ID token
- No separate Pulse login for end customers

---

## User Experience Principles

### Design Philosophy

**"Invisible work, visible reward"**
- AI works quietly in background
- Customers see only the payoff (progress, celebrations, insights)
- No cognitive load on users

### Visual Personality

- **Clean and calm** - Not another cluttered dashboard
- **Warm and human** - Not cold analytics
- **Progress-focused** - Celebrate growth, don't alarm about risk
- **Trustworthy** - Transparency builds trust

### Key Interactions

**Business Dashboard:**
1. Glanceable segment overview (Strong/Growing/At-Risk/Critical)
2. Click customer → see Identity Score breakdown + SHAP factors
3. One-click to generate Conversation Card
4. Mark touchpoint as completed, track outcomes

**Customer Widget:**
1. Minimal, non-intrusive presence (corner widget or dedicated page)
2. One-tap context buttons always visible
3. Progress visualization (journey map or simple metrics)
4. Periodic "Wrapped" notifications

---

## Functional Requirements

### Identity Engine

- **FR1:** System calculates Identity Strength Score (0-100) for each customer based on behavioral signals
- **FR2:** System provides SHAP-based explanations for each Identity Score component
- **FR3:** System detects identity erosion patterns before traditional churn signals appear
- **FR4:** System predicts what customers need next (Predictive Enablement)
- **FR5:** System updates scores in near-real-time as new data arrives
- **FR6:** Business can configure which signals contribute to identity scoring

### Business Dashboard

- **FR7:** Business users can view all customers segmented by Identity Strength (Strong/Growing/At-Risk/Critical)
- **FR8:** Business users can view individual customer Identity Score with breakdown
- **FR9:** Business users can see Cause Diagnostics explaining WHY identity is strong/weak
- **FR10:** Business users can generate Conversation Cards with AI-prepared context and suggested opener
- **FR11:** Business users can mark Conversation Cards as actioned and track outcomes
- **FR12:** Business users can filter and search customers by segment, score, or attributes
- **FR13:** Business users can view aggregate trends (identity distribution over time)

### Customer Widget

- **FR14:** Customers can view their own Identity Strength Dashboard
- **FR15:** Customers can see their progress milestones and achievements
- **FR16:** Customers can share context with one tap ("I'm busy", "I'm stuck", "I'm exploring", "I'm frustrated")
- **FR17:** System acknowledges customer context and adjusts behavior accordingly
- **FR18:** Customers receive micro-celebrations when reaching milestones
- **FR19:** Customers can view basic "Wrapped" reflection of their journey

### Predictive Enablement

- **FR20:** System identifies what each customer needs next to succeed
- **FR21:** System generates proactive suggestions (not reactive alerts)
- **FR22:** Predictions appear in Conversation Cards for human delivery
- **FR23:** System learns from outcomes to improve predictions

### Integration & Data

- **FR24:** System ingests customer behavior data via API
- **FR25:** System can import from existing data sources (CSV, database)
- **FR26:** Widget can be embedded via JavaScript snippet
- **FR27:** Widget authenticates via customer ID token from host application

### Demo-Specific (Hackathon)

- **FR28:** System works with synthetic/demo data out of the box
- **FR29:** Demo mode shows realistic customer scenarios
- **FR30:** Demo can simulate customer context sharing in real-time

---

## Non-Functional Requirements

### Performance

- **NFR1:** Identity Score calculation completes within 2 seconds of new data
- **NFR2:** Dashboard loads initial view within 1 second
- **NFR3:** Widget loads within 500ms after page load
- **NFR4:** One-tap context sharing responds within 200ms

### Security

- **NFR5:** All data encrypted in transit (HTTPS)
- **NFR6:** Customer data isolated per business tenant
- **NFR7:** Widget cannot access data from other customers
- **NFR8:** API endpoints require authentication

### Scalability (Post-MVP)

- **NFR9:** Architecture supports multiple business tenants
- **NFR10:** Identity Engine can process 10,000+ customers per tenant

### Accessibility

- **NFR11:** Widget meets WCAG 2.1 AA standards
- **NFR12:** Dashboard keyboard-navigable
- **NFR13:** Color choices accessible for colorblind users

---

_This PRD captures the essence of Pulse - a platform that transforms retention from something businesses do TO customers into something businesses and customers create TOGETHER._

_Created through collaborative discovery between BMad and AI facilitator._
