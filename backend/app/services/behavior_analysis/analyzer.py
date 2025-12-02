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
        customer_ids = [c.id for c in customers]

        print(f"Analyzing behavior for {total_customers} customers (org_type: {org_type})...")

        # Get existing analyses and clean up duplicates
        existing_analyses = db.query(BehaviorAnalysis).filter(
            BehaviorAnalysis.customer_id.in_(customer_ids)
        ).all()

        # Build lookup and handle duplicates by keeping only the most recent
        existing_analyses_lookup = {}
        duplicate_analyses = []

        for analysis in existing_analyses:
            if analysis.customer_id in existing_analyses_lookup:
                # Found a duplicate - keep the most recent one
                existing_analysis = existing_analyses_lookup[analysis.customer_id]
                if analysis.analyzed_at > existing_analysis.analyzed_at:
                    # This analysis is newer, remove the old one
                    duplicate_analyses.append(existing_analysis)
                    existing_analyses_lookup[analysis.customer_id] = analysis
                else:
                    # Keep the existing one, mark this for removal
                    duplicate_analyses.append(analysis)
            else:
                existing_analyses_lookup[analysis.customer_id] = analysis

        # Delete duplicate analyses if found
        if duplicate_analyses:
            print(f"Found {len(duplicate_analyses)} duplicate analyses, cleaning up...")
            try:
                for dup_analysis in duplicate_analyses:
                    db.delete(dup_analysis)
                db.commit()
                print(f"Removed {len(duplicate_analyses)} duplicate analyses")
            except Exception as cleanup_error:
                print(f"Warning: Could not clean up duplicates: {str(cleanup_error)}")
                db.rollback()
                # Rebuild the lookup after rollback
                existing_analyses = db.query(BehaviorAnalysis).filter(
                    BehaviorAnalysis.customer_id.in_(customer_ids)
                ).all()
                existing_analyses_lookup = {analysis.customer_id: analysis for analysis in existing_analyses}

        print(f"  Existing analyses found: {len(existing_analyses_lookup)}")

        # Prepare batches for bulk operations
        analyzed = 0
        errors = []
        analyses_to_add = []
        analyses_to_update = []
        processed_customer_ids = set()  # Track processed customers to prevent duplicates

        for idx, customer in enumerate(customers, 1):
            try:
                # Skip if already processed in this batch
                if customer.id in processed_customer_ids:
                    continue

                # Analyze customer
                analysis_data = analyze_customer(customer.id, org_type, db)

                # Check if analysis already exists
                existing_analysis = existing_analyses_lookup.get(customer.id)

                if existing_analysis:
                    # Prepare update data as dictionary
                    update_data = {
                        'id': existing_analysis.id,
                        'org_type': org_type,
                        'behavior_score': analysis_data['behavior_score'],
                        'activity_trend': analysis_data['activity_trend'],
                        'value_trend': analysis_data['value_trend'],
                        'engagement_trend': analysis_data['engagement_trend'],
                        'risk_signals': analysis_data['risk_signals'],
                        'recommendations': analysis_data['recommendations'],
                        'analyzed_at': datetime.utcnow(),
                        'extra_data': analysis_data.get('extra_data', {})
                    }
                    analyses_to_update.append(update_data)
                else:
                    # Create new analysis object
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
                    analyses_to_add.append(new_analysis)

                # Mark customer as processed
                processed_customer_ids.add(customer.id)
                analyzed += 1

                # Progress indicator
                if analyzed % 100 == 0:
                    print(f"  Processed {analyzed}/{total_customers} customers...")

            except Exception as e:
                error_msg = f"Error analyzing customer {customer.id}: {str(e)}"
                errors.append(error_msg)
                continue

        # Bulk commit all changes in batches
        print(f"\nPreparing to commit:")
        print(f"  Total processed: {analyzed}")
        print(f"  Analyses to add: {len(analyses_to_add)}")
        print(f"  Analyses to update: {len(analyses_to_update)}")
        print(f"  Errors so far: {len(errors)}")

        try:
            # First, bulk update existing analyses in batches
            if analyses_to_update:
                print(f"  Bulk updating {len(analyses_to_update)} existing analyses in batches...")
                batch_size = 500
                total_batches = (len(analyses_to_update) + batch_size - 1) // batch_size
                for i in range(0, len(analyses_to_update), batch_size):
                    batch = analyses_to_update[i:i + batch_size]
                    db.bulk_update_mappings(BehaviorAnalysis, batch)
                    db.commit()
                    print(f"    Updated and committed batch {i//batch_size + 1}/{total_batches} ({len(batch)} analyses)")
                print(f"  All {len(analyses_to_update)} analyses updated...")

            # Then, bulk insert new analyses in batches
            if analyses_to_add:
                print(f"  Bulk inserting {len(analyses_to_add)} new analyses in batches...")
                batch_size = 500
                total_batches = (len(analyses_to_add) + batch_size - 1) // batch_size
                for i in range(0, len(analyses_to_add), batch_size):
                    batch = analyses_to_add[i:i + batch_size]
                    db.bulk_save_objects(batch)
                    db.commit()
                    print(f"    Inserted and committed batch {i//batch_size + 1}/{total_batches} ({len(batch)} analyses)")
                print(f"  All {len(analyses_to_add)} analyses added...")

            print(f"Completed: {analyzed}/{total_customers} customers analyzed")

        except Exception as commit_error:
            print(f"Bulk commit failed: {str(commit_error)}")
            print(f"  Analyses to add: {len(analyses_to_add)}")
            print(f"  Analyses to update: {len(analyses_to_update)}")
            db.rollback()

            # Try inserting analyses one by one to identify problematic records
            print("Attempting individual analysis insertion...")
            successful_inserts = 0
            failed_inserts = 0

            try:
                # Re-apply updates one by one
                for analysis_data in analyses_to_update:
                    try:
                        db.query(BehaviorAnalysis).filter(
                            BehaviorAnalysis.id == analysis_data['id']
                        ).update(analysis_data)
                        db.commit()
                        successful_inserts += 1
                    except Exception as e:
                        db.rollback()
                        failed_inserts += 1
                        errors.append(f"Failed to update analysis {analysis_data['id']}: {str(e)}")

                # Insert new analyses one by one
                for analysis in analyses_to_add:
                    try:
                        db.add(analysis)
                        db.commit()
                        successful_inserts += 1
                    except Exception as e:
                        db.rollback()
                        failed_inserts += 1
                        errors.append(f"Failed to add analysis for customer {analysis.customer_id}: {str(e)}")

                print(f"Individual insertion complete: {successful_inserts} successful, {failed_inserts} failed")

                if successful_inserts > 0:
                    return {
                        'success': True,
                        'total_customers': total_customers,
                        'analyzed': successful_inserts,
                        'new_analyses': len([a for a in analyses_to_add]),
                        'updated_analyses': len([a for a in analyses_to_update]),
                        'errors': errors if errors else None
                    }
            except Exception as retry_error:
                print(f"Individual insertion also failed: {str(retry_error)}")
                errors.append(f"Retry error: {str(retry_error)}")

            return {
                'success': False,
                'total_customers': total_customers,
                'analyzed': 0,
                'new_analyses': 0,
                'updated_analyses': 0,
                'errors': errors
            }

        return {
            'success': True,
            'total_customers': total_customers,
            'analyzed': analyzed,
            'new_analyses': len(analyses_to_add),
            'updated_analyses': len(analyses_to_update),
            'errors': errors if errors else None
        }

    except Exception as e:
        db.rollback()
        print(f"Fatal error in batch behavior analysis: {str(e)}")
        return {
            'success': False,
            'total_customers': 0,
            'analyzed': 0,
            'new_analyses': 0,
            'updated_analyses': 0,
            'errors': [f"Fatal error: {str(e)}"]
        }
