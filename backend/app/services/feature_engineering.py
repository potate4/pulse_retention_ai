"""
Feature Engineering Service
Calculates RFM (Recency, Frequency, Monetary) metrics and additional activity features.
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.models.customer import Customer
from app.db.models.transaction import Transaction
from app.db.models.customer_feature import CustomerFeature


def calculate_rfm(
    customer_id: UUID,
    transactions: List[Transaction],
    lookback_days: int = 90,
    current_date: Optional[datetime] = None
) -> Dict[str, float]:
    """
    Calculate RFM (Recency, Frequency, Monetary) scores for a customer.
    
    Args:
        customer_id: Customer UUID
        transactions: List of Transaction objects
        lookback_days: Number of days to look back for frequency calculation
        current_date: Current date (defaults to today)
        
    Returns:
        Dictionary with recency_score, frequency_score, monetary_score (0-100 scale)
    """
    if current_date is None:
        current_date = datetime.now().date()
    
    if not transactions:
        return {
            "recency_score": 0.0,
            "frequency_score": 0.0,
            "monetary_score": 0.0
        }
    
    # Convert transactions to DataFrame for easier processing
    df = pd.DataFrame([{
        "event_date": t.event_date,
        "amount": float(t.amount) if t.amount else 0.0
    } for t in transactions])
    
    # Calculate Recency (days since last activity)
    max_date = df["event_date"].max()
    recency_days = (current_date - max_date).days
    # Normalize to 0-100 (higher = more recent)
    # Assume max recency of 365 days = 0 score
    max_recency = 365
    recency_score = max(0, 100 * (1 - min(recency_days, max_recency) / max_recency))
    
    # Calculate Frequency (number of transactions in lookback period)
    lookback_date = current_date - timedelta(days=lookback_days)
    frequency_count = len(df[df["event_date"] >= lookback_date])
    # Normalize to 0-100 (assume max frequency of 100 transactions = 100 score)
    max_frequency = 100
    frequency_score = min(100, 100 * (frequency_count / max_frequency))
    
    # Calculate Monetary (total value in lookback period)
    monetary_value = df[df["event_date"] >= lookback_date]["amount"].sum()
    # Normalize to 0-100 (need to determine max based on data distribution)
    # For now, use percentile-based normalization
    if len(df) > 0:
        all_amounts = df["amount"].sum()
        # Use 95th percentile as max (or actual max if smaller)
        max_monetary = df["amount"].quantile(0.95) * 10  # Rough estimate
        if max_monetary == 0:
            max_monetary = 1
        monetary_score = min(100, 100 * (monetary_value / max_monetary))
    else:
        monetary_score = 0.0
    
    return {
        "recency_score": round(recency_score, 2),
        "frequency_score": round(frequency_score, 2),
        "monetary_score": round(monetary_score, 2)
    }


def calculate_engagement_metrics(
    customer_id: UUID,
    transactions: List[Transaction]
) -> Dict[str, float]:
    """
    Calculate additional engagement metrics.
    
    Args:
        customer_id: Customer UUID
        transactions: List of Transaction objects
        
    Returns:
        Dictionary with engagement metrics
    """
    if not transactions:
        return {
            "engagement_score": 0.0,
            "tenure_days": 0,
            "activity_trend": 0.0,
            "avg_transaction_value": 0.0,
            "days_between_transactions": 0.0
        }
    
    df = pd.DataFrame([{
        "event_date": t.event_date,
        "amount": float(t.amount) if t.amount else 0.0,
        "event_type": t.event_type or "transaction"
    } for t in transactions])
    
    # Tenure (days since first transaction)
    first_date = df["event_date"].min()
    last_date = df["event_date"].max()
    tenure_days = (last_date - first_date).days
    
    # Activity trend (slope of activity over last 30 days)
    current_date = datetime.now().date()
    thirty_days_ago = current_date - timedelta(days=30)
    recent_transactions = df[df["event_date"] >= thirty_days_ago]
    
    if len(recent_transactions) > 1:
        # Calculate daily activity count
        daily_activity = recent_transactions.groupby("event_date").size().reset_index(name="count")
        if len(daily_activity) > 1:
            # Simple linear regression slope
            x = np.arange(len(daily_activity))
            y = daily_activity["count"].values
            activity_trend = float(np.polyfit(x, y, 1)[0])  # Slope
        else:
            activity_trend = 0.0
    else:
        activity_trend = 0.0
    
    # Average transaction value
    avg_transaction_value = float(df["amount"].mean()) if len(df) > 0 else 0.0
    
    # Average days between transactions
    if len(df) > 1:
        df_sorted = df.sort_values("event_date")
        date_diffs = df_sorted["event_date"].diff().dt.days.dropna()
        days_between_transactions = float(date_diffs.mean()) if len(date_diffs) > 0 else 0.0
    else:
        days_between_transactions = 0.0
    
    # Engagement score (composite metric)
    # Based on frequency, recency, and activity trend
    engagement_score = (
        min(100, len(recent_transactions) * 10) +  # Recent activity
        min(50, tenure_days / 10) +  # Tenure bonus
        max(0, activity_trend * 10)  # Trend bonus
    ) / 2.5  # Normalize to roughly 0-100
    
    engagement_score = max(0, min(100, engagement_score))
    
    return {
        "engagement_score": round(engagement_score, 2),
        "tenure_days": int(tenure_days),
        "activity_trend": round(activity_trend, 2),
        "avg_transaction_value": round(avg_transaction_value, 2),
        "days_between_transactions": round(days_between_transactions, 2)
    }


def create_feature_vector(customer_id: UUID, db: Session) -> np.ndarray:
    """
    Create feature vector for ML model from customer features.
    
    Args:
        customer_id: Customer UUID
        db: Database session
        
    Returns:
        NumPy array of features
    """
    feature = db.query(CustomerFeature).filter(
        CustomerFeature.customer_id == customer_id
    ).first()
    
    if not feature:
        # Return zero vector if features not calculated
        return np.zeros(8)
    
    return np.array([
        float(feature.recency_score or 0),
        float(feature.frequency_score or 0),
        float(feature.monetary_score or 0),
        float(feature.engagement_score or 0),
        float(feature.tenure_days or 0),
        float(feature.activity_trend or 0),
        float(feature.avg_transaction_value or 0),
        float(feature.days_between_transactions or 0)
    ])


def batch_calculate_features(
    db: Session,
    organization_id: UUID,
    lookback_days: int = 90
) -> Dict[str, Any]:
    """
    Calculate features for all customers in an organization.
    
    Args:
        db: Database session
        organization_id: Organization UUID
        lookback_days: Lookback period for frequency calculation
        
    Returns:
        Status dictionary
    """
    try:
        # Get all customers for organization
        customers = db.query(Customer).filter(
            Customer.organization_id == organization_id
        ).all()
        
        total_customers = len(customers)
        processed = 0
        errors = []
        
        # Get monetary distribution for normalization
        all_transactions = db.query(Transaction).filter(
            Transaction.organization_id == organization_id
        ).all()
        
        if all_transactions:
            all_amounts = [float(t.amount) for t in all_transactions if t.amount]
            if all_amounts:
                max_monetary = np.percentile(all_amounts, 95) * 10
            else:
                max_monetary = 1.0
        else:
            max_monetary = 1.0
        
        for customer in customers:
            try:
                # Get all transactions for customer
                transactions = db.query(Transaction).filter(
                    Transaction.customer_id == customer.id
                ).order_by(Transaction.event_date).all()
                
                if not transactions:
                    # Create empty feature record
                    feature = CustomerFeature(
                        customer_id=customer.id,
                        organization_id=organization_id,
                        recency_score=0.0,
                        frequency_score=0.0,
                        monetary_score=0.0,
                        engagement_score=0.0,
                        tenure_days=0,
                        activity_trend=0.0,
                        avg_transaction_value=0.0,
                        days_between_transactions=0.0
                    )
                    db.merge(feature)
                    processed += 1
                    continue
                
                # Calculate RFM
                rfm = calculate_rfm(customer.id, transactions, lookback_days)
                
                # Recalculate monetary with proper normalization
                lookback_date = datetime.now().date() - timedelta(days=lookback_days)
                recent_amounts = [float(t.amount) for t in transactions 
                                if t.event_date >= lookback_date and t.amount]
                monetary_value = sum(recent_amounts) if recent_amounts else 0.0
                monetary_score = min(100, 100 * (monetary_value / max_monetary)) if max_monetary > 0 else 0.0
                rfm["monetary_score"] = round(monetary_score, 2)
                
                # Calculate engagement metrics
                engagement = calculate_engagement_metrics(customer.id, transactions)
                
                # Create or update feature record
                feature = db.query(CustomerFeature).filter(
                    CustomerFeature.customer_id == customer.id
                ).first()
                
                if feature:
                    feature.recency_score = rfm["recency_score"]
                    feature.frequency_score = rfm["frequency_score"]
                    feature.monetary_score = rfm["monetary_score"]
                    feature.engagement_score = engagement["engagement_score"]
                    feature.tenure_days = engagement["tenure_days"]
                    feature.activity_trend = engagement["activity_trend"]
                    feature.avg_transaction_value = engagement["avg_transaction_value"]
                    feature.days_between_transactions = engagement["days_between_transactions"]
                    feature.calculated_at = datetime.utcnow()
                else:
                    feature = CustomerFeature(
                        customer_id=customer.id,
                        organization_id=organization_id,
                        recency_score=rfm["recency_score"],
                        frequency_score=rfm["frequency_score"],
                        monetary_score=rfm["monetary_score"],
                        engagement_score=engagement["engagement_score"],
                        tenure_days=engagement["tenure_days"],
                        activity_trend=engagement["activity_trend"],
                        avg_transaction_value=engagement["avg_transaction_value"],
                        days_between_transactions=engagement["days_between_transactions"]
                    )
                    db.add(feature)
                
                processed += 1
                
                # Commit every 100 customers
                if processed % 100 == 0:
                    db.commit()
                    
            except Exception as e:
                errors.append(f"Error processing customer {customer.id}: {str(e)}")
                continue
        
        # Final commit
        db.commit()
        
        return {
            "success": True,
            "total_customers": total_customers,
            "processed": processed,
            "errors": errors
        }
        
    except Exception as e:
        db.rollback()
        raise Exception(f"Error in batch feature calculation: {str(e)}")

