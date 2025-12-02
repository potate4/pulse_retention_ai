"""
Customer Segmentation API Endpoints
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db
from app.db.models.organization import Organization
from app.db.models.background_job import BackgroundJob
from app.schemas.segmentation import (
    SegmentResponse,
    BatchSegmentResponse,
    SegmentDistributionResponse,
    SegmentDefinitionsResponse
)
from app.schemas.background_job import BackgroundJobResponse, BackgroundJobCreateResponse
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


def process_segmentation_background(
    org_id: uuid.UUID,
    job_id: uuid.UUID,
    batch_id: Optional[uuid.UUID],
    db_session: Session,
    trigger_behavior_analysis: bool = False
):
    """
    Background task: Run batch segmentation for an organization.
    
    Args:
        org_id: Organization UUID
        job_id: Background job UUID for status tracking
        batch_id: Optional batch ID to segment specific batch
        db_session: Database session
        trigger_behavior_analysis: Whether to trigger behavior analysis after completion
    """
    try:
        # Get job and update status to processing
        job = db_session.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
        if not job:
            return
        
        job.status = "processing"
        job.started_at = datetime.utcnow()
        db_session.commit()
        
        # Run batch segmentation
        result = batch_segment_customers_from_db(org_id, batch_id, db_session)
        
        # Update job with results
        job.status = "completed" if result['success'] else "failed"
        job.total_items = result.get('total_customers', 0)
        job.processed_items = result.get('segmented', 0)
        job.result = {
            'success': result['success'],
            'total_customers': result.get('total_customers', 0),
            'segmented': result.get('segmented', 0),
            'new_segments': result.get('new_segments', 0),
            'updated_segments': result.get('updated_segments', 0)
        }
        job.errors = result.get('errors')
        job.completed_at = datetime.utcnow()
        db_session.commit()
        
        # If segmentation succeeded and behavior analysis is requested, trigger it
        if result['success'] and trigger_behavior_analysis:
            from app.api.v1.endpoints.behavior import process_behavior_analysis_background
            
            # Create behavior analysis job
            behavior_job = BackgroundJob(
                id=uuid.uuid4(),
                organization_id=org_id,
                job_type="behavior_analysis",
                batch_id=batch_id,
                status="pending",
                total_items=0,
                processed_items=0
            )
            db_session.add(behavior_job)
            db_session.commit()
            db_session.refresh(behavior_job)
            
            # Run behavior analysis (synchronously since we're already in background)
            process_behavior_analysis_background(org_id, behavior_job.id, db_session)
        
    except Exception as e:
        # Update job as failed
        job = db_session.query(BackgroundJob).filter(BackgroundJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db_session.commit()
        print(f"Error in segmentation background task: {str(e)}")


@router.post("/organizations/{org_id}/segment", response_model=BackgroundJobCreateResponse)
async def segment_customers(
    org_id: uuid.UUID,
    batch_id: Optional[uuid.UUID] = Query(None, description="Optional batch ID to segment specific batch"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Segment all customers using predictions from CustomerPrediction table (Background Task).

    This endpoint will start a background job that:
    1. Fetch churn predictions from CustomerPrediction table
    2. For each customer, fetch RFM scores from database
    3. Assign customer to one of 11 business segments
    4. Store segment in customer_segments table

    Query Parameters:
    - batch_id (optional): Segment only predictions from specific batch. If not provided, uses all predictions for the organization.
    
    Returns:
    - job_id: Use this to check the status of the segmentation job
    """
    org = get_organization(org_id, db)

    try:
        # Create background job record
        job = BackgroundJob(
            id=uuid.uuid4(),
            organization_id=org_id,
            job_type="segmentation",
            batch_id=batch_id,
            status="pending",
            total_items=0,
            processed_items=0
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # Add background task
        background_tasks.add_task(
            process_segmentation_background,
            org_id,
            job.id,
            batch_id,
            db,
            False  # Don't trigger behavior analysis when called directly
        )

        return BackgroundJobCreateResponse(
            success=True,
            job_id=job.id,
            job_type="segmentation",
            status="pending",
            message="Segmentation job started in background. Use /segmentation/jobs/{job_id}/status to check progress."
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting segmentation job: {str(e)}"
        )


@router.get("/jobs/{job_id}/status", response_model=BackgroundJobResponse)
async def get_segmentation_job_status(
    job_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get status of a segmentation background job.
    
    Returns:
    - Job status (pending, processing, completed, failed)
    - Progress (total_items, processed_items)
    - Results when completed
    - Error message if failed
    """
    job = db.query(BackgroundJob).filter(
        BackgroundJob.id == job_id,
        BackgroundJob.job_type == "segmentation"
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Segmentation job {job_id} not found"
        )
    
    return BackgroundJobResponse(
        job_id=job.id,
        organization_id=job.organization_id,
        job_type=job.job_type,
        status=job.status,
        batch_id=job.batch_id,
        total_items=job.total_items,
        processed_items=job.processed_items,
        result=job.result,
        error_message=job.error_message,
        errors=job.errors,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at
    )


@router.get("/organizations/{org_id}/jobs", response_model=list)
async def list_segmentation_jobs(
    org_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List all segmentation jobs for an organization.
    """
    org = get_organization(org_id, db)
    
    jobs = db.query(BackgroundJob).filter(
        BackgroundJob.organization_id == org_id,
        BackgroundJob.job_type == "segmentation"
    ).order_by(BackgroundJob.created_at.desc()).limit(limit).offset(offset).all()
    
    return [
        BackgroundJobResponse(
            job_id=job.id,
            organization_id=job.organization_id,
            job_type=job.job_type,
            status=job.status,
            batch_id=job.batch_id,
            total_items=job.total_items,
            processed_items=job.processed_items,
            result=job.result,
            error_message=job.error_message,
            errors=job.errors,
            created_at=job.created_at,
            started_at=job.started_at,
            completed_at=job.completed_at
        )
        for job in jobs
    ]


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
