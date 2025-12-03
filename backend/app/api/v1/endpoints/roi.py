"""
ROI/Profit-Calculation API Endpoints
Calculates real ROI based on churn predictions and RFM monetary values.
Uses real data from high-risk (churn > 80%), high-value (top 10% monetary score) customers.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid

from app.api.deps import get_db, get_current_active_user
from app.api.deps import get_current_active_user, get_db
from app.db.models.user import User
from app.db.models.prediction_batch import PredictionBatch, CustomerPrediction
from app.services.roi_calculator import (
    get_roi_metrics as calc_roi_metrics,
    get_profit_trend as calc_profit_trend,
    get_cost_breakdown as calc_cost_breakdown,
    get_campaign_roi as calc_campaign_roi,
    get_retention_savings as calc_retention_savings
)

router = APIRouter()


def calculate_batch_roi(batch_id: uuid.UUID, db: Session) -> Dict[str, Any]:
    """
    Calculate ROI for a single prediction batch.

    Logic:
    - Get all predictions with churn_probability > 0.5
    - Sum their monetary_value from features JSON
    - This represents potential revenue saved
    """
    predictions = db.query(CustomerPrediction).filter(
        CustomerPrediction.batch_id == batch_id
    ).all()

    high_risk_customers = []
    total_at_risk_value = 0.0

    for pred in predictions:
        try:
            churn_prob = float(pred.churn_probability)
            if churn_prob > 0.5:
                # Extract monetary_value from features JSON
                monetary_value = 0.0
                if pred.features:
                    if 'monetary_value' in pred.features:
                        monetary_value = float(pred.features.get('monetary_value', 0))
                    elif 'avg_transaction_value' in pred.features:
                        # Fallback: estimate from avg_transaction_value * frequency
                        avg_txn = float(pred.features.get('avg_transaction_value', 0))
                        # Rough estimate: assume 90 days lookback with some transactions
                        monetary_value = avg_txn * 5  # Conservative estimate

                if monetary_value > 0:
                    total_at_risk_value += monetary_value
                    high_risk_customers.append({
                        'customer_id': pred.external_customer_id,
                        'churn_probability': churn_prob,
                        'monetary_value': monetary_value
                    })
        except (ValueError, TypeError):
            continue

    return {
        'total_at_risk_value': round(total_at_risk_value, 2),
        'high_risk_count': len(high_risk_customers),
        'high_risk_customers': high_risk_customers
    }


def get_current_org_id(current_user: User = Depends(get_current_active_user)) -> uuid.UUID:
    """Get the organization ID for the current authenticated user.
    In this system, the organization ID is the same as the user ID."""
    return current_user.id


@router.get("/metrics")
async def get_roi_metrics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    timeframe: str = Query("monthly", regex="^(monthly|quarterly|yearly)$")
) -> Dict[str, Any]:
    """
    Get key ROI and financial metrics based on real prediction data.

    Returns calculated metrics from prediction batches:
    - totalRevenue: Sum of all at-risk customer monetary values (potential savings)
    - total_batches: Number of prediction batches processed
    - total_customers_analyzed: Total customers across all batches
    - total_high_risk: Total high-risk customers (>50% churn probability)
    - avg_batch_value: Average value saved per batch
    """
    try:
        org_id = current_user.id

        # Get all completed batches for this organization
        batches = db.query(PredictionBatch).filter(
            PredictionBatch.organization_id == org_id,
            PredictionBatch.status == "completed"
        ).all()

        if not batches:
            return {
                "totalRevenue": 0,
                "total_batches": 0,
                "total_customers_analyzed": 0,
                "total_high_risk": 0,
                "avg_batch_value": 0,
                "message": "No completed prediction batches found. Upload data to see ROI metrics."
            }

        total_revenue = 0.0
        total_high_risk = 0
        total_customers = 0

        for batch in batches:
            batch_roi = calculate_batch_roi(batch.id, db)
            total_revenue += batch_roi['total_at_risk_value']
            total_high_risk += batch_roi['high_risk_count']
            total_customers += batch.total_customers

        avg_batch_value = total_revenue / len(batches) if batches else 0

        return {
            "totalRevenue": round(total_revenue, 2),
            "total_batches": len(batches),
            "total_customers_analyzed": total_customers,
            "total_high_risk": total_high_risk,
            "avg_batch_value": round(avg_batch_value, 2),
            "avg_customer_value": round(total_revenue / total_high_risk, 2) if total_high_risk > 0 else 0
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ROI metrics: {str(e)}"
        )


@router.get("/batch-savings")
async def get_batch_savings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50)
) -> List[Dict[str, Any]]:
    """
    Get savings calculation for each prediction batch.

    Returns:
        List of batches with:
        - batch_id: Batch UUID
        - batch_name: Batch name
        - potential_savings: Sum of monetary values for high-risk customers
        - high_risk_count: Number of customers with >50% churn probability
        - total_customers: Total customers in batch
        - created_at: Batch creation date
    """
    try:
        org_id = current_user.id

        batches = db.query(PredictionBatch).filter(
            PredictionBatch.organization_id == org_id,
            PredictionBatch.status == "completed"
        ).order_by(PredictionBatch.created_at.desc()).limit(limit).all()

        batch_savings = []

        for batch in batches:
            roi_data = calculate_batch_roi(batch.id, db)
            batch_savings.append({
                "batch_id": str(batch.id),
                "batch_name": batch.batch_name or f"Batch {batch.created_at.strftime('%Y-%m-%d')}",
                "potential_savings": roi_data['total_at_risk_value'],
                "high_risk_count": roi_data['high_risk_count'],
                "total_customers": batch.total_customers,
                "created_at": batch.created_at.isoformat()
            })

        return batch_savings
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch batch savings: {str(e)}"
        )


@router.get("/risk-value-distribution")
async def get_risk_value_distribution(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get monetary value distribution by risk segment.

    Returns:
        List of risk segments with total monetary value at risk
    """
    try:
        org_id = current_user.id

        # Get all completed batches
        batches = db.query(PredictionBatch).filter(
            PredictionBatch.organization_id == org_id,
            PredictionBatch.status == "completed"
        ).all()

        if not batches:
            return []

        # Aggregate by risk segment
        risk_values = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
        risk_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}

        for batch in batches:
            predictions = db.query(CustomerPrediction).filter(
                CustomerPrediction.batch_id == batch.id
            ).all()

            for pred in predictions:
                risk_segment = pred.risk_segment
                if risk_segment in risk_values:
                    try:
                        monetary_value = 0.0
                        if pred.features:
                            if 'monetary_value' in pred.features:
                                monetary_value = float(pred.features.get('monetary_value', 0))
                            elif 'avg_transaction_value' in pred.features:
                                # Fallback: estimate from avg_transaction_value
                                avg_txn = float(pred.features.get('avg_transaction_value', 0))
                                monetary_value = avg_txn * 5  # Conservative estimate

                        if monetary_value > 0:
                            risk_values[risk_segment] += monetary_value
                            risk_counts[risk_segment] += 1
                    except (ValueError, TypeError):
                        continue

        return [
            {
                "name": risk,
                "value": round(risk_values[risk], 2),
                "count": risk_counts[risk],
                "color": {
                    "Low": "#10b981",
                    "Medium": "#f59e0b",
                    "High": "#ef4444",
                    "Critical": "#991b1b"
                }[risk]
            }
            for risk in ["Low", "Medium", "High", "Critical"]
            if risk_counts[risk] > 0
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch risk value distribution: {str(e)}"
        )


@router.get("/summary")
async def get_roi_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive ROI summary based on real prediction data.
    """
    try:
        metrics = await get_roi_metrics(current_user, db, "monthly")
        batch_savings = await get_batch_savings(current_user, db, 10)
        risk_distribution = await get_risk_value_distribution(current_user, db)

        return {
            "metrics": metrics,
            "batch_savings": batch_savings,
            "risk_distribution": risk_distribution
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ROI summary: {str(e)}"
        )
