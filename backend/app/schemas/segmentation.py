"""
Pydantic schemas for customer segmentation API.
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class SegmentResponse(BaseModel):
    """Response schema for individual customer segment."""
    customer_id: UUID
    organization_id: UUID
    segment: str
    segment_score: float
    rfm_category: Dict[str, str]
    churn_risk_level: str
    assigned_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class SegmentUploadRequest(BaseModel):
    """Request schema for uploading churn predictions CSV."""
    # CSV file will be uploaded via multipart/form-data
    pass


class BatchSegmentResponse(BaseModel):
    """Response schema for batch segmentation."""
    success: bool
    total_customers: int
    segmented: int
    errors: Optional[List[str]] = None


class SegmentDistributionResponse(BaseModel):
    """Response schema for segment distribution across organization."""
    total_customers: int
    segments: Dict[str, Dict[str, Any]]  # {segment_name: {count, percentage, metadata}}


class SegmentDefinitionsResponse(BaseModel):
    """Response schema for segment definitions."""
    segments: Dict[str, Dict[str, str]]  # {segment_name: {description, action}}
