"""
Customer Segmentation API Endpoints
"""
import uuid
import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.api.deps import get_db
from app.db.models.organization import Organization
from app.db.models.customer_segment import CustomerSegment
from app.schemas.segmentation import (
    SegmentResponse,
    BatchSegmentResponse,
    SegmentDistributionResponse,
    SegmentDefinitionsResponse
)
from app.services.segmentation import (
    batch_segment_customers,
    get_segment_distribution,
    get_customer_segment,
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
async def segment_customers(
    org_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload churn predictions CSV and segment all customers.

    CSV must have columns:
    - customer_id: Customer identifier (must match external_customer_id in database)
    - churn_score: Churn probability (0.0 to 1.0)

    This endpoint will:
    1. Load churn predictions from CSV
    2. For each customer, fetch RFM scores from database
    3. Assign customer to one of 11 business segments
    4. Store segment in customer_segments table
    """
    org = get_organization(org_id, db)

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )

    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='wb') as tmp_file:
            contents = await file.read()
            tmp_file.write(contents)
            tmp_file_path = tmp_file.name

        # Run batch segmentation
        result = batch_segment_customers(org_id, tmp_file_path, db)

        # Clean up temporary file
        os.unlink(tmp_file_path)

        return BatchSegmentResponse(
            success=result['success'],
            total_customers=result['total_customers'],
            segmented=result['segmented'],
            errors=result.get('errors')
        )

    except Exception as e:
        # Clean up temporary file on error
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing segmentation: {str(e)}"
        )


@router.get("/organizations/{org_id}/segments", response_model=SegmentDistributionResponse)
async def get_segments_distribution(
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
async def get_customer_segment_info(
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
async def get_segment_definitions():
    """
    Get definitions and recommended actions for all 11 customer segments.

    Returns:
    - Segment descriptions
    - Recommended retention actions per segment
    """
    return SegmentDefinitionsResponse(
        segments=SEGMENT_DEFINITIONS
    )
