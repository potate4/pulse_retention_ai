"""
Customer Segmentation API Endpoints
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db
from app.db.models.organization import Organization
from app.schemas.segmentation import (
    SegmentResponse,
    BatchSegmentResponse,
    SegmentDistributionResponse,
    SegmentDefinitionsResponse
)
from app.services.segmentation import (
    get_segment_distribution,
    get_customer_segment,
    batch_segment_customers_from_db,
    SEGMENT_DEFINITIONS
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


@router.post("/organizations/{org_id}/segment", response_model=BatchSegmentResponse)
def segment_customers(
    org_id: uuid.UUID,
    batch_id: Optional[uuid.UUID] = Query(None, description="Optional batch ID to segment specific batch"),
    db: Session = Depends(get_db)
):
    """
    Segment all customers using predictions from CustomerPrediction table.

    This endpoint will:
    1. Fetch churn predictions from CustomerPrediction table
    2. For each customer, fetch RFM scores from database
    3. Assign customer to one of 11 business segments
    4. Store segment in customer_segments table

    Query Parameters:
    - batch_id (optional): Segment only predictions from specific batch. If not provided, uses all predictions for the organization.
    """
    org = get_organization(org_id, db)

    try:
        # Run batch segmentation from database (synchronous - will block until complete)
        result = batch_segment_customers_from_db(org_id, batch_id, db)

        return BatchSegmentResponse(
            success=result['success'],
            total_customers=result['total_customers'],
            segmented=result['segmented'],
            errors=result.get('errors')
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing segmentation: {str(e)}"
        )


@router.get("/organizations/{org_id}/segments", response_model=SegmentDistributionResponse)
def get_segments_distribution(
    org_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get segment distribution for an organization.

    Returns:
    - Total customer count
    - Count and percentage for each segment
    - Segment metadata (description and recommended actions)
    """
    org = get_organization(org_id, db)

    try:
        distribution = get_segment_distribution(org_id, db)

        return SegmentDistributionResponse(
            total_customers=distribution['total_customers'],
            segments=distribution['segments']
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching segment distribution: {str(e)}"
        )


@router.get("/customers/{customer_id}/segment", response_model=SegmentResponse)
def get_customer_segment_info(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get segment for a specific customer.

    Returns:
    - Segment name
    - Segment score (0-100)
    - RFM categories (High/Medium/Low)
    - Churn risk level
    - Segment metadata
    """
    try:
        segment_data = get_customer_segment(customer_id, db)

        if not segment_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Segment not found for customer {customer_id}"
            )

        return SegmentResponse(**segment_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching customer segment: {str(e)}"
        )


@router.get("/segment-definitions", response_model=SegmentDefinitionsResponse)
def get_segment_definitions():
    """
    Get definitions and recommended actions for all 11 customer segments.

    Returns:
    - Segment descriptions
    - Recommended retention actions per segment
    """
    return SegmentDefinitionsResponse(
        segments=SEGMENT_DEFINITIONS
    )
