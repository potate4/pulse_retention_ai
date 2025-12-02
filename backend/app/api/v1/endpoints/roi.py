"""
ROI/Profit-Calculation API Endpoints
Handles HTTP requests for ROI metrics, profit analysis, and cost-benefit calculations.
Uses real data from high-risk (churn > 80%), high-value (top 10% monetary score) customers.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import uuid

from app.api.deps import get_db, get_current_active_user
from app.db.models.user import User
from app.services.roi_calculator import (
    get_roi_metrics as calc_roi_metrics,
    get_profit_trend as calc_profit_trend,
    get_cost_breakdown as calc_cost_breakdown,
    get_campaign_roi as calc_campaign_roi,
    get_retention_savings as calc_retention_savings
)

router = APIRouter()


def get_current_org_id(current_user: User = Depends(get_current_active_user)) -> uuid.UUID:
    """Get the organization ID for the current authenticated user.
    In this system, the organization ID is the same as the user ID."""
    return current_user.id


@router.get("/metrics")
async def get_roi_metrics(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: Session = Depends(get_db),
    timeframe: str = Query("monthly", regex="^(monthly|quarterly|yearly)$")
) -> Dict[str, Any]:
    """
    Get key ROI and financial metrics based on high-risk, high-value customers.
    
    Calculates ROI from customers with:
    - Churn probability > 80%
    - Top 10% monetary score
    
    Args:
        timeframe: Time period for metrics (monthly, quarterly, yearly)
    
    Returns:
        Dictionary containing:
        - totalRevenue: Total revenue from high-value customers (monetary_score × 100)
        - totalCosts: Retention costs (10% of revenue)
        - netProfit: Revenue - Costs
        - roiPercentage: Return on investment percentage
        - avgCustomerLTV: Average customer lifetime value
        - costPerRetention: Cost to retain each customer
        - paybackPeriod: Months to break even
        - breakEvenDate: Date when investment breaks even
        - customerCount: Number of high-risk, high-value customers
    """
    try:
        metrics = calc_roi_metrics(org_id, timeframe, db)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ROI metrics: {str(e)}"
        )


@router.get("/profit-trend")
async def get_profit_trend(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: Session = Depends(get_db),
    timeframe: str = Query("monthly", regex="^(monthly|quarterly|yearly)$")
) -> List[Dict[str, Any]]:
    """
    Get profit trend over time based on high-risk, high-value customer data.
    
    Args:
        timeframe: Time period for trend data
    
    Returns:
        List of periods with profit data:
        - period: Period name (month, quarter, or year)
        - profit: Net profit for the period
        - revenue: Revenue for the period
        - costs: Total costs for the period
    """
    try:
        trend_data = calc_profit_trend(org_id, timeframe, db)
        return trend_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch profit trend: {str(e)}"
        )


@router.get("/cost-breakdown")
async def get_cost_breakdown(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: Session = Depends(get_db),
    timeframe: str = Query("monthly", regex="^(monthly|quarterly|yearly)$")
) -> List[Dict[str, Any]]:
    """
    Get cost breakdown by category for retention efforts.
    
    Returns:
        List of cost categories with:
        - name: Cost category name
        - value: Cost amount
        - color: Color for visualization
    """
    try:
        cost_data = calc_cost_breakdown(org_id, db)
        return cost_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch cost breakdown: {str(e)}"
        )


@router.get("/campaign-roi")
async def get_campaign_roi(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: Session = Depends(get_db),
    timeframe: str = Query("monthly", regex="^(monthly|quarterly|yearly)$"),
    limit: int = Query(10, ge=1, le=50)
) -> List[Dict[str, Any]]:
    """
    Get ROI for each retention campaign type.
    
    Args:
        timeframe: Time period for campaign analysis
        limit: Maximum number of campaigns to return
    
    Returns:
        List of campaigns with:
        - campaign: Campaign name
        - roi: ROI percentage
        - revenue: Campaign revenue
        - costs: Campaign costs
    """
    try:
        campaign_data = calc_campaign_roi(org_id, db)
        return campaign_data[:limit]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch campaign ROI: {str(e)}"
        )


@router.get("/retention-savings")
async def get_retention_savings(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: Session = Depends(get_db),
    timeframe: str = Query("monthly", regex="^(monthly|quarterly|yearly)$")
) -> List[Dict[str, Any]]:
    """
    Get savings from retention by customer risk segment.
    
    Returns:
        List of segments with:
        - segment: Segment name
        - savings: Money saved from retention
        - customersRetained: Number of customers retained
        - label: Display label for the segment
    """
    try:
        savings_data = calc_retention_savings(org_id, db)
        return savings_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch retention savings: {str(e)}"
        )


@router.get("/summary")
async def get_roi_summary(
    org_id: uuid.UUID = Depends(get_current_org_id),
    db: Session = Depends(get_db),
    timeframe: str = Query("monthly", regex="^(monthly|quarterly|yearly)$")
) -> Dict[str, Any]:
    """
    Get comprehensive ROI summary combining all financial data.
    
    Returns:
        Dictionary with all ROI-related data from real customer predictions
    """
    try:
        metrics = calc_roi_metrics(org_id, timeframe, db)
        profit_trend = calc_profit_trend(org_id, timeframe, db)
        cost_breakdown = calc_cost_breakdown(org_id, db)
        campaign_roi = calc_campaign_roi(org_id, db)
        retention_savings = calc_retention_savings(org_id, db)
        
        summary = {
            "metrics": metrics,
            "profitTrend": profit_trend,
            "costBreakdown": cost_breakdown,
            "campaignROI": campaign_roi,
            "retentionSavings": retention_savings
        }
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ROI summary: {str(e)}"
        )
