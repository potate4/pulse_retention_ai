"""
Pydantic schemas for behavior analysis API.
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class BehaviorAnalysisResponse(BaseModel):
    """Response schema for customer behavior analysis."""
    customer_id: str  # External customer ID (string)
    organization_id: UUID
    org_type: str
    behavior_score: float
    activity_trend: Optional[str] = None
    value_trend: Optional[str] = None
    engagement_trend: Optional[str] = None
    risk_signals: List[str]
    recommendations: List[str]
    analyzed_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None  # Changed from extra_data to match model


class BatchBehaviorAnalysisResponse(BaseModel):
    """Response schema for batch behavior analysis."""
    success: bool
    total_customers: int
    analyzed: int
    errors: Optional[List[str]] = None


class BehaviorInsightsResponse(BaseModel):
    """Response schema for aggregated behavior insights."""
    organization_id: UUID
    org_type: str
    total_customers: int
    top_risk_signals: Dict[str, int]  # {signal: count}
    avg_behavior_score: float
    customers_by_trend: Dict[str, int]  # {trend: count}
    priority_actions: List[Dict[str, Any]]


class RiskSignalDefinitionsResponse(BaseModel):
    """Response schema for risk signal definitions."""
    org_type: str
    risk_signals: Dict[str, str]  # {signal: description}
