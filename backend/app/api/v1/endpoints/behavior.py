"""
Behavior Analysis API Endpoints
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.api.deps import get_db
from app.db.models.organization import Organization
from app.db.models.behavior_analysis import BehaviorAnalysis
from app.schemas.behavior import (
    BehaviorAnalysisResponse,
    BatchBehaviorAnalysisResponse,
    BehaviorInsightsResponse
)
from app.services.behavior_analysis import (
    analyze_customer,
    batch_analyze_behaviors
)
from app.services.behavior_analysis.insights_generator import (
    get_priority_signal,
    get_action_urgency
)


router = APIRouter()


def get_organization(org_id: uuid.UUID, db: Session) -> Organization:
    """Helper to get organization or raise 404."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization {org_id} not found"
        )
    return org


@router.post("/organizations/{org_id}/analyze-behaviors", response_model=BatchBehaviorAnalysisResponse)
def analyze_customer_behaviors(
    org_id: uuid.UUID,
    limit: Optional[int] = Query(None, description="Optional limit on number of customers to process"),
    db: Session = Depends(get_db)
):
    """
    Run behavior analysis for all customers in an organization.

    This endpoint will:
    1. Determine organization type (banking, telecom, ecommerce)
    2. For each customer, analyze transaction history
    3. Detect industry-specific risk signals
    4. Generate actionable retention recommendations
    5. Store analysis results in behavior_analysis table

    Industry-specific analyses:
    - Banking: Login frequency, transaction volume, feature usage
    - Telecom: Data usage, call patterns, plan utilization
    - Ecommerce: Purchase velocity, cart abandonment, return rates

    Args:
        org_id: Organization UUID
        limit: Optional limit on number of customers to process (useful for testing)
        db: Database session
    """
    org = get_organization(org_id, db)

    try:
        # Run batch behavior analysis (synchronous - will block until complete)
        result = batch_analyze_behaviors(org_id, db, limit=limit)

        return BatchBehaviorAnalysisResponse(
            success=result['success'],
            total_customers=result['total_customers'],
            analyzed=result['analyzed'],
            errors=result.get('errors')
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in batch behavior analysis: {str(e)}"
        )


@router.get("/customers/{customer_id}/behavior", response_model=BehaviorAnalysisResponse)
def get_customer_behavior(
    customer_id: str,  # External customer ID (string)
    org_id: uuid.UUID = Query(..., description="Organization ID"),
    db: Session = Depends(get_db)
):
    """
    Get behavior analysis for a specific customer.

    Returns:
    - Behavior health score (0-100)
    - Activity and value trends
    - Detected risk signals
    - Personalized recommendations
    - Industry-specific metrics
    """
    # Verify organization exists
    org = get_organization(org_id, db)
    org_type = org.org_type.value if hasattr(org.org_type, 'value') else org.org_type

    try:
        # Check if analysis already exists
        existing_analysis = db.query(BehaviorAnalysis).filter(
            BehaviorAnalysis.customer_id == customer_id,
            BehaviorAnalysis.organization_id == org_id
        ).first()

        if existing_analysis:
            # Return stored analysis
            return BehaviorAnalysisResponse(
                customer_id=existing_analysis.customer_id,
                organization_id=existing_analysis.organization_id,
                org_type=existing_analysis.org_type.value if hasattr(existing_analysis.org_type, 'value') else existing_analysis.org_type,
                behavior_score=float(existing_analysis.behavior_score),
                activity_trend=existing_analysis.activity_trend,
                value_trend=existing_analysis.value_trend,
                engagement_trend=existing_analysis.engagement_trend,
                risk_signals=existing_analysis.risk_signals or [],
                recommendations=existing_analysis.recommendations or [],
                analyzed_at=existing_analysis.analyzed_at,
                metadata=existing_analysis.extra_data
            )
        else:
            # Run fresh analysis
            analysis_data = analyze_customer(customer_id, org_type, db)

            # Add organization_id to analysis data
            analysis_data['organization_id'] = org_id

            # Map extra_data to metadata for the response
            if 'extra_data' in analysis_data:
                analysis_data['metadata'] = analysis_data.pop('extra_data')

            return BehaviorAnalysisResponse(**analysis_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing customer behavior: {str(e)}"
        )


@router.get("/organizations/{org_id}/behavior-insights", response_model=BehaviorInsightsResponse)
def get_organization_behavior_insights(
    org_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get aggregated behavior insights for an organization.

    Returns:
    - Total customers analyzed
    - Top risk signals across organization
    - Average behavior score
    - Distribution by trend (increasing/stable/declining)
    - Priority action items
    """
    org = get_organization(org_id, db)
    org_type = org.org_type.value if hasattr(org.org_type, 'value') else org.org_type

    try:
        # Get all behavior analyses for organization
        analyses = db.query(BehaviorAnalysis).filter(
            BehaviorAnalysis.organization_id == org_id
        ).all()

        if not analyses:
            return BehaviorInsightsResponse(
                organization_id=org_id,
                org_type=org_type,
                total_customers=0,
                top_risk_signals={},
                avg_behavior_score=0.0,
                customers_by_trend={},
                priority_actions=[]
            )

        # Aggregate top risk signals
        risk_signal_counts = {}
        trend_counts = {
            'increasing': 0,
            'stable': 0,
            'declining': 0,
            'unknown': 0
        }
        behavior_scores = []

        for analysis in analyses:
            # Count risk signals
            if analysis.risk_signals:
                for signal in analysis.risk_signals:
                    risk_signal_counts[signal] = risk_signal_counts.get(signal, 0) + 1

            # Count trends
            if analysis.activity_trend:
                trend_counts[analysis.activity_trend] = trend_counts.get(analysis.activity_trend, 0) + 1

            # Collect behavior scores
            if analysis.behavior_score:
                behavior_scores.append(float(analysis.behavior_score))

        # Sort risk signals by count
        top_risk_signals = dict(sorted(risk_signal_counts.items(), key=lambda x: x[1], reverse=True)[:10])

        # Calculate average behavior score
        avg_behavior_score = sum(behavior_scores) / len(behavior_scores) if behavior_scores else 0.0

        # Generate priority actions based on top risk signals
        priority_actions = []
        for signal, count in list(top_risk_signals.items())[:5]:
            urgency = get_action_urgency([signal])
            priority_actions.append({
                'risk_signal': signal,
                'affected_customers': count,
                'urgency': urgency,
                'percentage': round((count / len(analyses)) * 100, 2)
            })

        return BehaviorInsightsResponse(
            organization_id=org_id,
            org_type=org_type,
            total_customers=len(analyses),
            top_risk_signals=top_risk_signals,
            avg_behavior_score=round(avg_behavior_score, 2),
            customers_by_trend=trend_counts,
            priority_actions=priority_actions
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching behavior insights: {str(e)}"
        )
