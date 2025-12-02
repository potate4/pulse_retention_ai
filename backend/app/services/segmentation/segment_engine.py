"""
Customer Segmentation Engine
Core logic for assigning customers to segments based on RFM and churn predictions
"""
import pandas as pd
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import UUID

from app.db.models.customer import Customer
from app.db.models.customer_feature import CustomerFeature
from app.db.models.customer_segment import CustomerSegment
from app.db.models.churn_prediction import ChurnPrediction
from .rules import assign_segment, get_segment_metadata
from .utils import (
    categorize_rfm_score,
    categorize_churn_probability,
    calculate_segment_score,
    get_rfm_category_dict
)


def segment_customer(
    customer_id: UUID,
    churn_probability: float,
    db: Session
) -> Dict[str, Any]:
    """
    Segment a single customer based on RFM features and churn probability.

    Args:
        customer_id: Customer UUID
        churn_probability: Churn probability (0.0 to 1.0)
        db: Database session

    Returns:
        Dictionary with segment, score, rfm_category, risk_level

    Raises:
        ValueError: If customer features not found
    """
    # Get customer features (RFM scores)
    feature = db.query(CustomerFeature).filter(
        CustomerFeature.customer_id == customer_id
    ).first()

    if not feature:
        raise ValueError(f"No features found for customer {customer_id}")

    # Get customer for organization_id
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise ValueError(f"Customer {customer_id} not found")

    # Categorize RFM scores
    R = categorize_rfm_score(float(feature.recency_score or 0))
    F = categorize_rfm_score(float(feature.frequency_score or 0))
    M = categorize_rfm_score(float(feature.monetary_score or 0))
    E = categorize_rfm_score(float(feature.engagement_score or 0))

    # Categorize churn risk
    churn_risk = categorize_churn_probability(churn_probability)

    # Assign segment
    segment = assign_segment(R, F, M, E, churn_risk)

    # Calculate composite score
    segment_score = calculate_segment_score(
        float(feature.recency_score or 0),
        float(feature.frequency_score or 0),
        float(feature.monetary_score or 0),
        float(feature.engagement_score or 0),
        churn_probability
    )

    # Get RFM category dict
    rfm_category = get_rfm_category_dict(
        float(feature.recency_score or 0),
        float(feature.frequency_score or 0),
        float(feature.monetary_score or 0),
        float(feature.engagement_score or 0)
    )

    # Get segment metadata
    metadata = get_segment_metadata(segment)

    return {
        'customer_id': str(customer_id),
        'organization_id': str(customer.organization_id),
        'segment': segment,
        'segment_score': segment_score,
        'rfm_category': rfm_category,
        'churn_risk_level': churn_risk,
        'churn_probability': churn_probability,
        'metadata': metadata
    }


def batch_segment_customers(
    organization_id: UUID,
    churn_predictions_csv: str,
    db: Session
) -> Dict[str, Any]:
    """
    Batch segment all customers from CSV churn predictions.

    Args:
        organization_id: Organization UUID
        churn_predictions_csv: Path to CSV file with customer_id and churn_score
        db: Database session

    Returns:
        Status dictionary with counts and errors
    """
    try:
        # Load churn predictions CSV
        df = pd.read_csv(churn_predictions_csv)

        if 'customer_id' not in df.columns or 'churn_score' not in df.columns:
            raise ValueError("CSV must have 'customer_id' and 'churn_score' columns")

        total_customers = len(df)
        segmented = 0
        errors = []

        print(f"Processing {total_customers} customers for segmentation...")

        for idx, row in df.iterrows():
            try:
                external_customer_id = row['customer_id']
                churn_probability = float(row['churn_score'])

                # Find customer by external_customer_id
                customer = db.query(Customer).filter(
                    Customer.external_customer_id == external_customer_id,
                    Customer.organization_id == organization_id
                ).first()

                if not customer:
                    errors.append(f"Customer {external_customer_id} not found in organization")
                    continue

                # Segment customer
                segment_data = segment_customer(customer.id, churn_probability, db)

                # Check if segment already exists
                existing_segment = db.query(CustomerSegment).filter(
                    CustomerSegment.customer_id == customer.id
                ).first()

                if existing_segment:
                    # Update existing
                    existing_segment.segment = segment_data['segment']
                    existing_segment.segment_score = segment_data['segment_score']
                    existing_segment.rfm_category = segment_data['rfm_category']
                    existing_segment.churn_risk_level = segment_data['churn_risk_level']
                    existing_segment.assigned_at = datetime.utcnow()
                    existing_segment.metadata = segment_data['metadata']
                else:
                    # Create new
                    new_segment = CustomerSegment(
                        customer_id=customer.id,
                        organization_id=organization_id,
                        segment=segment_data['segment'],
                        segment_score=segment_data['segment_score'],
                        rfm_category=segment_data['rfm_category'],
                        churn_risk_level=segment_data['churn_risk_level'],
                        metadata=segment_data['metadata']
                    )
                    db.add(new_segment)

                segmented += 1

                # Commit every 100 records
                if segmented % 100 == 0:
                    db.commit()
                    print(f"  Segmented {segmented}/{total_customers} customers...")

            except Exception as e:
                errors.append(f"Error segmenting customer {row.get('customer_id')}: {str(e)}")
                continue

        # Final commit
        db.commit()

        print(f"Completed: {segmented}/{total_customers} customers segmented")

        return {
            'success': True,
            'total_customers': total_customers,
            'segmented': segmented,
            'errors': errors
        }

    except Exception as e:
        db.rollback()
        raise Exception(f"Error in batch segmentation: {str(e)}")


def get_segment_distribution(organization_id: UUID, db: Session) -> Dict[str, Any]:
    """
    Get segment distribution for an organization.

    Args:
        organization_id: Organization UUID
        db: Database session

    Returns:
        Dictionary with segment counts and percentages
    """
    # Get all segments for organization
    segments = db.query(CustomerSegment).filter(
        CustomerSegment.organization_id == organization_id
    ).all()

    if not segments:
        return {
            'total_customers': 0,
            'segments': {}
        }

    # Count by segment
    segment_counts = {}
    for seg in segments:
        segment_name = seg.segment
        segment_counts[segment_name] = segment_counts.get(segment_name, 0) + 1

    total = len(segments)

    # Calculate percentages
    segment_distribution = {}
    for segment_name, count in segment_counts.items():
        segment_distribution[segment_name] = {
            'count': count,
            'percentage': round((count / total) * 100, 2),
            'metadata': get_segment_metadata(segment_name)
        }

    return {
        'total_customers': total,
        'segments': segment_distribution
    }


def get_customer_segment(customer_id: UUID, db: Session) -> Optional[Dict[str, Any]]:
    """
    Get segment for a specific customer.

    Args:
        customer_id: Customer UUID
        db: Database session

    Returns:
        Segment dictionary or None if not found
    """
    segment = db.query(CustomerSegment).filter(
        CustomerSegment.customer_id == customer_id
    ).first()

    if not segment:
        return None

    return {
        'customer_id': str(segment.customer_id),
        'organization_id': str(segment.organization_id),
        'segment': segment.segment,
        'segment_score': float(segment.segment_score),
        'rfm_category': segment.rfm_category,
        'churn_risk_level': segment.churn_risk_level,
        'assigned_at': segment.assigned_at.isoformat() if segment.assigned_at else None,
        'metadata': segment.metadata
    }
