"""
Analytics API Endpoints
Calculates analytics based on real prediction data from batches.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_active_user, get_db
from app.db.models.user import User
from app.db.models.prediction_batch import PredictionBatch, CustomerPrediction

router = APIRouter()


@router.get("/metrics")
async def get_analytics_metrics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get key analytics metrics from real prediction data.

    Returns:
        - totalCustomers: Total customers analyzed across all batches
        - churnRate: Percentage of customers with >50% churn probability
        - atRiskCount: Number of high-risk customers
        - retentionRate: 100 - churn rate
        - avgLifetimeValue: Average RFM monetary value
        - total_batches: Number of prediction batches
    """
    try:
        org_id = current_user.id

        # Get all completed batches
        batches = db.query(PredictionBatch).filter(
            PredictionBatch.organization_id == org_id,
            PredictionBatch.status == "completed"
        ).all()

        if not batches:
            return {
                "totalCustomers": 0,
                "churnRate": 0,
                "atRiskCount": 0,
                "retentionRate": 100,
                "avgLifetimeValue": 0,
                "total_batches": 0,
                "message": "No completed prediction batches found. Upload data to see analytics."
            }

        total_customers = 0
        high_risk_count = 0
        total_monetary_value = 0.0
        customer_count_with_value = 0

        for batch in batches:
            total_customers += batch.total_customers

            predictions = db.query(CustomerPrediction).filter(
                CustomerPrediction.batch_id == batch.id
            ).all()

            for pred in predictions:
                try:
                    churn_prob = float(pred.churn_probability)
                    if churn_prob > 0.5:
                        high_risk_count += 1

                    # Calculate average lifetime value
                    monetary_value = 0.0
                    if pred.features:
                        if 'monetary_value' in pred.features:
                            monetary_value = float(pred.features.get('monetary_value', 0))
                        elif 'avg_transaction_value' in pred.features:
                            # Fallback: estimate from avg_transaction_value
                            avg_txn = float(pred.features.get('avg_transaction_value', 0))
                            monetary_value = avg_txn * 5  # Conservative estimate

                    if monetary_value > 0:
                        total_monetary_value += monetary_value
                        customer_count_with_value += 1
                except (ValueError, TypeError):
                    continue

        churn_rate = (high_risk_count / total_customers * 100) if total_customers > 0 else 0
        retention_rate = 100 - churn_rate
        avg_lifetime_value = (total_monetary_value / customer_count_with_value) if customer_count_with_value > 0 else 0

        return {
            "totalCustomers": total_customers,
            "churnRate": round(churn_rate, 1),
            "atRiskCount": high_risk_count,
            "retentionRate": round(retention_rate, 1),
            "avgLifetimeValue": round(avg_lifetime_value, 2),
            "total_batches": len(batches)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch metrics: {str(e)}"
        )


@router.get("/churn-by-batch")
async def get_churn_by_batch(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = Query(12, ge=1, le=24)
) -> List[Dict[str, Any]]:
    """
    Get churn rate for each prediction batch (trend over time).

    Args:
        limit: Number of batches to return (most recent first)

    Returns:
        List of batch data with:
        - batch_name: Batch identifier
        - churnRate: Percentage of high-risk customers
        - retentionRate: 100 - churn rate
        - created_at: Batch creation date
    """
    try:
        org_id = current_user.id

        batches = db.query(PredictionBatch).filter(
            PredictionBatch.organization_id == org_id,
            PredictionBatch.status == "completed"
        ).order_by(PredictionBatch.created_at.desc()).limit(limit).all()

        batch_trends = []

        for batch in batches:
            predictions = db.query(CustomerPrediction).filter(
                CustomerPrediction.batch_id == batch.id
            ).all()

            high_risk_count = sum(
                1 for pred in predictions
                if float(pred.churn_probability) > 0.5
            )

            churn_rate = (high_risk_count / batch.total_customers * 100) if batch.total_customers > 0 else 0

            batch_trends.append({
                "month": batch.batch_name or batch.created_at.strftime('%Y-%m-%d'),
                "churnRate": round(churn_rate, 1),
                "retentionRate": round(100 - churn_rate, 1)
            })

        # Reverse to show oldest first
        return list(reversed(batch_trends))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch churn trend: {str(e)}"
        )


@router.get("/risk-distribution")
async def get_risk_distribution(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get customer distribution by risk level from all batches.

    Returns:
        List of risk levels with:
        - name: Risk level (Low/Medium/High/Critical)
        - value: Number of customers
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

        # Aggregate risk segments across all batches
        risk_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}

        for batch in batches:
            predictions = db.query(CustomerPrediction).filter(
                CustomerPrediction.batch_id == batch.id
            ).all()

            for pred in predictions:
                if pred.risk_segment in risk_counts:
                    risk_counts[pred.risk_segment] += 1

        return [
            {"name": f"{risk} Risk", "value": count}
            for risk, count in risk_counts.items()
            if count > 0
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch risk distribution: {str(e)}"
        )


@router.get("/customer-value-distribution")
async def get_customer_value_distribution(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get distribution of customers by their monetary value ranges.

    Returns:
        List of value ranges with customer counts
    """
    try:
        org_id = current_user.id

        batches = db.query(PredictionBatch).filter(
            PredictionBatch.organization_id == org_id,
            PredictionBatch.status == "completed"
        ).all()

        if not batches:
            return []

        # Define value ranges
        ranges = {
            "0-1000": 0,
            "1000-5000": 0,
            "5000-10000": 0,
            "10000-50000": 0,
            "50000+": 0
        }

        for batch in batches:
            predictions = db.query(CustomerPrediction).filter(
                CustomerPrediction.batch_id == batch.id
            ).all()

            for pred in predictions:
                try:
                    value = 0.0
                    if pred.features:
                        if 'monetary_value' in pred.features:
                            value = float(pred.features.get('monetary_value', 0))
                        elif 'avg_transaction_value' in pred.features:
                            # Fallback: estimate from avg_transaction_value
                            avg_txn = float(pred.features.get('avg_transaction_value', 0))
                            value = avg_txn * 5  # Conservative estimate

                    if value > 0:
                        if value < 1000:
                            ranges["0-1000"] += 1
                        elif value < 5000:
                            ranges["1000-5000"] += 1
                        elif value < 10000:
                            ranges["5000-10000"] += 1
                        elif value < 50000:
                            ranges["10000-50000"] += 1
                        else:
                            ranges["50000+"] += 1
                except (ValueError, TypeError):
                    continue

        return [
            {"range": range_name, "count": count}
            for range_name, count in ranges.items()
            if count > 0
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch value distribution: {str(e)}"
        )


@router.get("/summary")
async def get_analytics_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive analytics summary combining all key data.
    """
    try:
        metrics = await get_analytics_metrics(current_user, db)
        churn_trend = await get_churn_by_batch(current_user, db, 12)
        risk_dist = await get_risk_distribution(current_user, db)
        value_dist = await get_customer_value_distribution(current_user, db)

        return {
            "metrics": metrics,
            "churnTrend": churn_trend,
            "riskDistribution": risk_dist,
            "valueDistribution": value_dist
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch analytics summary: {str(e)}"
        )
