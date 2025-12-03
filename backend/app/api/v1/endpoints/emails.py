"""
Email API Endpoints
Handles HTTP requests for email campaign operations.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List

from app.api.deps import get_current_active_user
from app.db.models.user import User
from app.schemas.email import (
    EmailGenerateRequest,
    EmailGenerateResponse,
    EmailSendRequest,
    EmailSendResponse
)
from app.schemas.customer import CustomerResponse, SegmentResponse
from app.services.email_service import EmailService
from app.services.customer_service import CustomerService
from app.services.segmentation_service import SegmentationService

router = APIRouter()


@router.get("/segments", response_model=List[SegmentResponse])
async def get_segments(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all customer segments for the organization.
    
    Returns:
        List of segments with customer counts
    """
    try:
        org_id = current_user.id  # User ID equals organization ID
        segments = await SegmentationService.get_segments(org_id)
        return segments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch segments: {str(e)}"
        )


@router.get("/segments/{segment_id}/customers", response_model=List[CustomerResponse])
async def get_segment_customers(
    segment_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all customers in a specific segment.
    
    Args:
        segment_id: Segment ID
        
    Returns:
        List of customers in the segment
    """
    try:
        org_id = current_user.id  # User ID equals organization ID
        customers = await CustomerService.get_customers_by_segment(segment_id, org_id)
        return customers
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch customers: {str(e)}"
        )


@router.get("/customers", response_model=List[CustomerResponse])
async def get_all_customers(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all customers for the organization.
    
    Returns:
        List of all customers
    """
    try:
        org_id = current_user.id  # User ID equals organization ID
        customers = await CustomerService.get_all_customers(org_id)
        return customers
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch customers: {str(e)}"
        )


@router.post("/emails/generate", response_model=EmailGenerateResponse)
async def generate_email(
    request: EmailGenerateRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate email template preview for customers or segment.
    
    Request body:
        - customer_ids: List of customer IDs (optional)
        - segment_id: Segment ID (optional)
        - extra_params: Additional parameters (optional)
        
    Returns:
        Email template with subject and body
    """
    try:
        # Validate input - check if customer_ids has values or segment_id is provided
        has_customer_ids = request.customer_ids is not None and len(request.customer_ids) > 0
        has_segment_id = request.segment_id is not None and request.segment_id != ""
        
        if not has_customer_ids and not has_segment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either customer_ids (with at least one ID) or segment_id must be provided"
            )
        
        org_id = current_user.id  # User ID equals organization ID
        # Generate email preview
        email = await EmailService.generate_email_preview(
            customer_ids=request.customer_ids or [],
            segment_id=request.segment_id,
            organization_id=org_id,
            extra_params=request.extra_params or {}
        )
        
        return email
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate email: {str(e)}"
        )


@router.post("/emails/send", response_model=EmailSendResponse)
async def send_emails(
    request: EmailSendRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Send personalized emails to customers.
    
    Request body:
        - subject: Email subject (may contain {placeholders})
        - html_body: HTML email body (may contain {placeholders})
        - text_body: Plain text body (optional)
        - customer_ids: List of customer IDs to send to
        - segment_id: Segment ID (optional, for logging)
        
    Returns:
        Send results with success/failure counts
    """
    try:
        # Validate input
        if not request.customer_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="customer_ids must be provided"
            )
        
        org_id = current_user.id  # User ID equals organization ID
        
        print(f"[DEBUG] Sending emails to {len(request.customer_ids)} customers")
        print(f"[DEBUG] Organization ID: {org_id}")
        print(f"[DEBUG] Customer IDs: {request.customer_ids}")
        
        # Send emails
        result = await EmailService.send_emails(
            subject=request.subject,
            html_body=request.html_body,
            text_body=request.text_body,
            customer_ids=request.customer_ids,
            segment_id=request.segment_id,
            organization_id=org_id
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Failed to send emails: {str(e)}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send emails: {str(e)}"
        )


@router.post("/emails/send-to-segment", response_model=EmailSendResponse)
async def send_to_segment(
    segment_id: str,
    subject: str,
    html_body: str,
    text_body: str = None,
    current_user: User = Depends(get_current_active_user)
):
    """
    Send emails to all customers in a segment.
    
    Query parameters:
        - segment_id: Segment ID
        - subject: Email subject
        - html_body: HTML email body
        - text_body: Plain text body (optional)
        
    Returns:
        Send results with success/failure counts
    """
    try:
        org_id = current_user.id  # User ID equals organization ID
        result = await EmailService.send_to_segment(
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            segment_id=segment_id,
            organization_id=org_id
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send emails: {str(e)}"
        )
