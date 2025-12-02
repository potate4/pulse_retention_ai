"""
Behavior Analysis Core Engine
Routes analysis to industry-specific analyzers and generates insights
"""
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import UUID

from app.db.models.customer import Customer
from app.db.models.transaction import Transaction
from app.db.models.organization import Organization
from app.db.models.behavior_analysis import BehaviorAnalysis, OrgType
from .banking_analyzer import analyze_banking_behavior
from .telecom_analyzer import analyze_telecom_behavior
from .ecommerce_analyzer import analyze_ecommerce_behavior
from .insights_generator import generate_recommendations


def create_behavior_timeline(transactions: List[Transaction]) -> pd.DataFrame:
    """
    Convert transactions to behavior timeline DataFrame.

    Args:
        transactions: List of Transaction objects

    Returns:
        DataFrame with event_date, event_type, amount, extra_data
    """
    if not transactions:
        return pd.DataFrame(columns=['event_date', 'event_type', 'amount', 'extra_data'])

    data = []
    for txn in transactions:
        data.append({
            'event_date': txn.event_date,
            'event_type': txn.event_type or 'transaction',
            'amount': float(txn.amount) if txn.amount else 0.0,
            'extra_data': txn.extra_data or {}
        })

    df = pd.DataFrame(data)
    df = df.sort_values('event_date')
    return df


def calculate_behavior_score(metrics: Dict[str, Any]) -> float:
    """
    Calculate composite behavior score (0-100) from metrics.
    Higher score = healthier behavior, lower churn risk.

    Args:
        metrics: Dictionary of behavior metrics

    Returns:
        Score from 0 to 100
    """
    # Extract key metrics
    activity_trend_str = metrics.get('activity_trend', 'stable')
    value_trend_str = metrics.get('value_trend', 'stable')
    engagement_level = metrics.get('engagement_level', 50)

    # Convert trend strings to numeric scores
    trend_to_score = {
        'increasing': 80,
        'stable': 50,
        'declining': 20,
        'unknown': 40
    }

    activity_score = trend_to_score.get(activity_trend_str, 50)
    value_score = trend_to_score.get(value_trend_str, 50)

    # Combine scores
    behavior_score = (
        activity_score * 0.4 +
        value_score * 0.3 +
        engagement_level * 0.3
    )

    # Clip to 0-100 range
    return round(max(0, min(100, behavior_score)), 2)


def analyze_customer(
    customer_id: UUID,
    org_type: str,
    db: Session
) -> Dict[str, Any]:
    """
    Analyze customer behavior based on organization type.

    Args:
        customer_id: Customer UUID
        org_type: Organization type ('banking', 'telecom', 'ecommerce')
        db: Database session

    Returns:
        Dictionary with behavior analysis results

    Raises:
        ValueError: If customer not found or invalid org_type
    """
    # Get customer
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise ValueError(f"Customer {customer_id} not found")

    # Get transactions
    transactions = db.query(Transaction).filter(
        Transaction.customer_id == customer_id
    ).order_by(Transaction.event_date).all()

    if not transactions:
        # Return default analysis for customers with no transactions
        return {
            'customer_id': str(customer_id),
            'organization_id': str(customer.organization_id),
            'org_type': org_type,
            'behavior_score': 0.0,
            'activity_trend': 'unknown',
            'value_trend': 'unknown',
            'engagement_trend': 'unknown',
            'risk_signals': ['no_transaction_history'],
            'recommendations': ['Investigate customer onboarding status'],
            'extra_data': {}
        }

    # Create behavior timeline
    timeline = create_behavior_timeline(transactions)

    # Route to industry-specific analyzer
    if org_type == 'banking' or org_type == OrgType.BANKING.value:
        metrics = analyze_banking_behavior(timeline)
    elif org_type == 'telecom' or org_type == OrgType.TELECOM.value:
        metrics = analyze_telecom_behavior(timeline)
    elif org_type == 'ecommerce' or org_type == OrgType.ECOMMERCE.value:
        metrics = analyze_ecommerce_behavior(timeline)
    else:
        raise ValueError(f"Invalid org_type: {org_type}")

    # Calculate composite behavior score
    behavior_score = calculate_behavior_score(metrics)

    # Generate recommendations
    recommendations = generate_recommendations(metrics['risk_signals'], org_type)

    return {
        'customer_id': str(customer_id),
        'organization_id': str(customer.organization_id),
        'org_type': org_type,
        'behavior_score': behavior_score,
        'activity_trend': metrics['activity_trend'],
        'value_trend': metrics['value_trend'],
        'engagement_trend': metrics['engagement_trend'],
        'risk_signals': metrics['risk_signals'],
        'recommendations': recommendations,
        'extra_data': metrics.get('industry_metrics', {})
    }


def batch_analyze_behaviors(
    organization_id: UUID,
    db: Session
) -> Dict[str, Any]:
    """
    Batch analyze behaviors for all customers in an organization.

    Args:
        organization_id: Organization UUID
        db: Database session

    Returns:
        Status dictionary with counts and errors
    """
    try:
        # Get organization to determine org_type
        org = db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise ValueError(f"Organization {organization_id} not found")

        org_type = org.org_type.value if hasattr(org.org_type, 'value') else org.org_type

        # Get all customers
        customers = db.query(Customer).filter(
            Customer.organization_id == organization_id
        ).all()

        total_customers = len(customers)
        analyzed = 0
        errors = []

        print(f"Analyzing behavior for {total_customers} customers (org_type: {org_type})...")

        for idx, customer in enumerate(customers, 1):
            try:
                # Analyze customer
                analysis_data = analyze_customer(customer.id, org_type, db)

                # Check if analysis already exists
                existing_analysis = db.query(BehaviorAnalysis).filter(
                    BehaviorAnalysis.customer_id == customer.id
                ).first()

                if existing_analysis:
                    # Update existing
                    existing_analysis.org_type = org_type
                    existing_analysis.behavior_score = analysis_data['behavior_score']
                    existing_analysis.activity_trend = analysis_data['activity_trend']
                    existing_analysis.value_trend = analysis_data['value_trend']
                    existing_analysis.engagement_trend = analysis_data['engagement_trend']
                    existing_analysis.risk_signals = analysis_data['risk_signals']
                    existing_analysis.recommendations = analysis_data['recommendations']
                    existing_analysis.analyzed_at = datetime.utcnow()
                    existing_analysis.extra_data = analysis_data.get('extra_data', {})
                else:
                    # Create new
                    new_analysis = BehaviorAnalysis(
                        customer_id=customer.id,
                        organization_id=organization_id,
                        org_type=org_type,
                        behavior_score=analysis_data['behavior_score'],
                        activity_trend=analysis_data['activity_trend'],
                        value_trend=analysis_data['value_trend'],
                        engagement_trend=analysis_data['engagement_trend'],
                        risk_signals=analysis_data['risk_signals'],
                        recommendations=analysis_data['recommendations'],
                        extra_data=analysis_data.get('extra_data', {})
                    )
                    db.add(new_analysis)

                analyzed += 1

                # Commit every 50 records to avoid long transactions
                if analyzed % 50 == 0:
                    try:
                        db.commit()
                        print(f"  Analyzed {analyzed}/{total_customers} customers...")
                    except Exception as commit_error:
                        print(f"  Commit error at {analyzed}: {str(commit_error)}")
                        db.rollback()
                        errors.append(f"Commit error at customer {analyzed}: {str(commit_error)}")

            except Exception as e:
                error_msg = f"Error analyzing customer {customer.id}: {str(e)}"
                print(f"  {error_msg}")
                errors.append(error_msg)
                # Rollback the failed customer and continue
                db.rollback()
                continue

        # Final commit
        try:
            db.commit()
            print(f"Completed: {analyzed}/{total_customers} customers analyzed")
        except Exception as final_commit_error:
            print(f"Final commit error: {str(final_commit_error)}")
            db.rollback()
            errors.append(f"Final commit error: {str(final_commit_error)}")

        return {
            'success': True,
            'total_customers': total_customers,
            'analyzed': analyzed,
            'errors': errors if errors else None
        }

    except Exception as e:
        db.rollback()
        raise Exception(f"Error in batch behavior analysis: {str(e)}")
