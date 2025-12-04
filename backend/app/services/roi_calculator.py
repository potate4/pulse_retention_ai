"""
ROI Calculator Service
Calculates return on investment for high-risk, high-value customers
Based on churn probability > 80% and top 10% monetary score
"""
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import cast, Float
from datetime import datetime, timedelta

from app.db.models.prediction_batch import CustomerPrediction
from app.db.models.organization import Organization


# Revenue multiplier: monetary_score × 100 = estimated annual value
# Score 80 → ₹8,000, Score 50 → ₹5,000
REVENUE_MULTIPLIER = 100

# Retention cost as percentage of customer value
RETENTION_COST_PERCENTAGE = 0.10  # 10%


def get_high_risk_high_value_customers(org_id: uuid.UUID, db: Session) -> List[CustomerPrediction]:
    """
    Get top 10% high-value customers who have churn probability > 80%.
    
    Args:
        org_id: Organization UUID
        db: Database session
    
    Returns:
        List of CustomerPrediction objects sorted by monetary_score (descending)
    """
    # Get predictions from the LATEST batch for this organization
    from app.db.models.prediction_batch import PredictionBatch
    
    # Find the most recent completed batch
    latest_batch = db.query(PredictionBatch).filter(
        PredictionBatch.organization_id == org_id,
        PredictionBatch.status == "completed"
    ).order_by(PredictionBatch.completed_at.desc()).first()
    
    if not latest_batch:
        print(f"[ROI Calculator] No completed prediction batches found for org {org_id}")
        return []
    
    # Get predictions from that batch
    predictions = db.query(CustomerPrediction).filter(
        CustomerPrediction.organization_id == org_id,
        CustomerPrediction.batch_id == latest_batch.id
    ).all()
    
    print(f"[ROI Calculator] Using batch {latest_batch.id} (completed: {latest_batch.completed_at})")
    
    print(f"[ROI Calculator] Total predictions for org {org_id}: {len(predictions)}")
    
    if not predictions:
        print(f"[ROI Calculator] No predictions found for org {org_id}")
        return []
    
    # Filter by churn > 80% and extract monetary_score
    customers_with_monetary = []
    high_churn_count = 0
    
    for pred in predictions:
        try:
            # Convert string churn_probability to float
            churn_prob = float(pred.churn_probability) if pred.churn_probability else 0.0
            
            # Only include high-risk customers (churn > 80%)
            if churn_prob > 0.80:
                high_churn_count += 1
                if pred.features and isinstance(pred.features, dict):
                    monetary_score = pred.features.get('monetary_score', 0)
                    # Store as attribute for sorting
                    pred.monetary_value = float(monetary_score) if monetary_score else 0.0
                    pred.churn_prob_float = churn_prob
                    customers_with_monetary.append(pred)
                else:
                    print(f"[ROI Calculator] Prediction {pred.id} has churn {churn_prob} but no features")
        except (ValueError, TypeError) as e:
            # Skip records with invalid churn_probability
            print(f"[ROI Calculator] Error processing prediction {pred.id}: {e}")
            continue
    
    print(f"[ROI Calculator] High churn (>80%) customers: {high_churn_count}")
    print(f"[ROI Calculator] High churn WITH monetary data: {len(customers_with_monetary)}")
    
    if not customers_with_monetary:
        print(f"[ROI Calculator] No high-value, high-risk customers found")
        return []
    
    # Sort by monetary_score descending
    sorted_customers = sorted(
        customers_with_monetary,
        key=lambda x: x.monetary_value,
        reverse=True
    )
    
    # Take top 10%
    top_10_percent_count = max(1, int(len(sorted_customers) * 0.1))
    high_value_customers = sorted_customers[:top_10_percent_count]
    
    return high_value_customers


def calculate_retention_roi(customers: List[CustomerPrediction]) -> Dict[str, Any]:
    """
    Calculate ROI metrics for retaining high-risk, high-value customers.
    
    Args:
        customers: List of CustomerPrediction objects with monetary_value attribute
    
    Returns:
        Dictionary with ROI metrics
    """
    if not customers:
        return {
            "totalRevenue": 0,
            "totalCosts": 0,
            "netProfit": 0,
            "roiPercentage": 0.0,
            "customerCount": 0,
            "avgCustomerValue": 0.0,
            "avgRetentionCost": 0.0
        }
    
    # Calculate total value (monetary_score × multiplier)
    total_monetary_score = sum(c.monetary_value for c in customers)
    total_revenue = total_monetary_score * REVENUE_MULTIPLIER
    
    # Calculate retention costs (10% of total value)
    total_costs = total_revenue * RETENTION_COST_PERCENTAGE
    
    # Calculate profit
    net_profit = total_revenue - total_costs
    
    # Calculate ROI percentage
    roi_percentage = (net_profit / total_costs * 100) if total_costs > 0 else 0
    
    # Calculate averages
    customer_count = len(customers)
    avg_customer_value = total_revenue / customer_count if customer_count > 0 else 0
    avg_retention_cost = total_costs / customer_count if customer_count > 0 else 0
    
    return {
        "totalRevenue": int(total_revenue),
        "totalCosts": int(total_costs),
        "netProfit": int(net_profit),
        "roiPercentage": round(roi_percentage, 2),
        "customerCount": customer_count,
        "avgCustomerValue": round(avg_customer_value, 2),
        "avgRetentionCost": round(avg_retention_cost, 2),
        "totalMonetaryScore": round(total_monetary_score, 2)
    }


def get_roi_metrics(org_id: uuid.UUID, timeframe: str, db: Session) -> Dict[str, Any]:
    """
    Get comprehensive ROI metrics for the dashboard.
    
    Args:
        org_id: Organization UUID
        timeframe: monthly, quarterly, or yearly (currently ignored, uses all data)
        db: Database session
    
    Returns:
        Dictionary with all ROI metrics
    """
    # Get high-risk, high-value customers
    high_value_customers = get_high_risk_high_value_customers(org_id, db)
    
    # Debug: Log customer count
    print(f"[ROI Calculator] Found {len(high_value_customers)} high-risk, high-value customers for org {org_id}")
    
    # Calculate ROI
    roi_data = calculate_retention_roi(high_value_customers)
    
    # Calculate additional metrics
    avg_customer_ltv = roi_data["avgCustomerValue"]
    cost_per_retention = roi_data["avgRetentionCost"]
    
    # Payback period (months to recover retention cost)
    # Assuming monthly revenue = annual value / 12
    monthly_revenue_per_customer = avg_customer_ltv / 12 if avg_customer_ltv > 0 else 0
    payback_period = int(cost_per_retention / monthly_revenue_per_customer) if monthly_revenue_per_customer > 0 else 0
    
    # Break even date (assuming today + payback period)
    break_even_date = (datetime.now() + timedelta(days=payback_period * 30)).strftime("%Y-%m-%d")
    
    # For trends, we'd need historical data - using placeholder for now
    # In production, compare with previous period's data
    revenue_trend = 15.5  # Placeholder
    cost_trend = -5.2  # Placeholder (negative = cost reduction)
    profit_trend = 18.3  # Placeholder
    roi_trend = 22.1  # Placeholder
    
    return {
        "totalRevenue": roi_data["totalRevenue"],
        "totalCosts": roi_data["totalCosts"],
        "netProfit": roi_data["netProfit"],
        "roiPercentage": roi_data["roiPercentage"],
        "avgCustomerLTV": int(avg_customer_ltv),
        "costPerRetention": int(cost_per_retention),
        "paybackPeriod": payback_period,
        "breakEvenDate": break_even_date,
        "revenueTrend": revenue_trend,
        "costTrend": cost_trend,
        "profitTrend": profit_trend,
        "roiTrend": roi_trend,
        "customerCount": roi_data["customerCount"],
        "avgMonetaryScore": round(roi_data["totalMonetaryScore"] / roi_data["customerCount"], 2) if roi_data["customerCount"] > 0 else 0
    }


def get_profit_trend(org_id: uuid.UUID, timeframe: str, db: Session) -> List[Dict[str, Any]]:
    """
    Get profit trend over time.
    Note: This is a simplified version showing current data as a trend.
    In production, you'd query historical prediction batches.
    
    Args:
        org_id: Organization UUID
        timeframe: monthly, quarterly, or yearly
        db: Database session
    
    Returns:
        List of period data with profit, revenue, and costs
    """
    # Get current metrics
    metrics = get_roi_metrics(org_id, timeframe, db)
    
    # For now, simulate trend by showing current month and projecting
    # In production, query actual historical data
    current_revenue = metrics["totalRevenue"]
    current_costs = metrics["totalCosts"]
    current_profit = metrics["netProfit"]
    
    if timeframe == "monthly":
        # Simulate 6 months of data
        trend_data = []
        months = ["January", "February", "March", "April", "May", "June"]
        for i, month in enumerate(months):
            # Simulate growth trend
            factor = 0.85 + (i * 0.03)  # 85% to 100% of current
            trend_data.append({
                "period": month,
                "profit": int(current_profit * factor),
                "revenue": int(current_revenue * factor),
                "costs": int(current_costs * factor)
            })
    elif timeframe == "quarterly":
        # Simulate 2 quarters
        trend_data = [
            {
                "period": "Q1 2025",
                "profit": int(current_profit * 0.92),
                "revenue": int(current_revenue * 0.92),
                "costs": int(current_costs * 0.92)
            },
            {
                "period": "Q2 2025",
                "profit": current_profit,
                "revenue": current_revenue,
                "costs": current_costs
            }
        ]
    else:  # yearly
        # Simulate 2 years
        trend_data = [
            {
                "period": "2024",
                "profit": int(current_profit * 0.85),
                "revenue": int(current_revenue * 0.85),
                "costs": int(current_costs * 0.85)
            },
            {
                "period": "2025",
                "profit": current_profit,
                "revenue": current_revenue,
                "costs": current_costs
            }
        ]
    
    return trend_data


def get_cost_breakdown(org_id: uuid.UUID, db: Session) -> List[Dict[str, Any]]:
    """
    Get cost breakdown by category.
    
    Args:
        org_id: Organization UUID
        db: Database session
    
    Returns:
        List of cost categories with values and colors
    """
    # Get total retention costs
    high_value_customers = get_high_risk_high_value_customers(org_id, db)
    roi_data = calculate_retention_roi(high_value_customers)
    total_costs = roi_data["totalCosts"]
    
    # Break down costs into categories
    # Retention cost breakdown: 50% campaigns, 20% staff, 15% tech, 10% support, 5% other
    cost_breakdown = [
        {
            "name": "Retention Campaigns",
            "value": int(total_costs * 0.50),
            "color": "#3b82f6"
        },
        {
            "name": "Customer Success Team",
            "value": int(total_costs * 0.20),
            "color": "#ef4444"
        },
        {
            "name": "Technology & Tools",
            "value": int(total_costs * 0.15),
            "color": "#10b981"
        },
        {
            "name": "Support & Service",
            "value": int(total_costs * 0.10),
            "color": "#f59e0b"
        },
        {
            "name": "Other Expenses",
            "value": int(total_costs * 0.05),
            "color": "#8b5cf6"
        }
    ]
    
    return cost_breakdown


def get_campaign_roi(org_id: uuid.UUID, db: Session) -> List[Dict[str, Any]]:
    """
    Get ROI for different retention campaigns.
    
    Args:
        org_id: Organization UUID
        db: Database session
    
    Returns:
        List of campaigns with ROI data
    """
    # Get base metrics
    high_value_customers = get_high_risk_high_value_customers(org_id, db)
    roi_data = calculate_retention_roi(high_value_customers)
    
    total_revenue = roi_data["totalRevenue"]
    total_costs = roi_data["totalCosts"]
    base_roi = roi_data["roiPercentage"]
    
    # Simulate different campaign performance
    campaigns = [
        {
            "campaign": "High-Value Retention",
            "roi": base_roi,
            "revenue": total_revenue,
            "costs": total_costs
        },
        {
            "campaign": "Win-back Campaign",
            "roi": round(base_roi * 0.75, 2),
            "revenue": int(total_revenue * 0.35),
            "costs": int(total_costs * 0.20)
        },
        {
            "campaign": "VIP Experience Program",
            "roi": round(base_roi * 1.2, 2),
            "revenue": int(total_revenue * 0.30),
            "costs": int(total_costs * 0.15)
        },
        {
            "campaign": "Loyalty Rewards",
            "roi": round(base_roi * 0.85, 2),
            "revenue": int(total_revenue * 0.25),
            "costs": int(total_costs * 0.18)
        },
        {
            "campaign": "Personal Outreach",
            "roi": round(base_roi * 0.95, 2),
            "revenue": int(total_revenue * 0.10),
            "costs": int(total_costs * 0.07)
        }
    ]
    
    return campaigns


def get_retention_savings(org_id: uuid.UUID, db: Session) -> List[Dict[str, Any]]:
    """
    Get savings from retention by risk segment.
    
    Args:
        org_id: Organization UUID
        db: Database session
    
    Returns:
        List of segments with savings data
    """
    # Get high-risk customers
    high_value_customers = get_high_risk_high_value_customers(org_id, db)
    roi_data = calculate_retention_roi(high_value_customers)
    
    total_savings = roi_data["netProfit"]
    customer_count = roi_data["customerCount"]
    
    # Break down by risk/value tiers
    savings_data = [
        {
            "segment": "Critical Risk - Top 3%",
            "savings": int(total_savings * 0.40),
            "customersRetained": max(1, int(customer_count * 0.03)),
            "label": "Critical Risk - Highest Value"
        },
        {
            "segment": "High Risk - Top 7%",
            "savings": int(total_savings * 0.35),
            "customersRetained": max(1, int(customer_count * 0.07)),
            "label": "High Risk - High Value"
        },
        {
            "segment": "At Risk - Premium",
            "savings": int(total_savings * 0.15),
            "customersRetained": max(1, int(customer_count * 0.40)),
            "label": "At Risk - Premium Tier"
        },
        {
            "segment": "Moderate Risk",
            "savings": int(total_savings * 0.10),
            "customersRetained": max(1, int(customer_count * 0.50)),
            "label": "Moderate Risk Customers"
        }
    ]
    
    return savings_data

