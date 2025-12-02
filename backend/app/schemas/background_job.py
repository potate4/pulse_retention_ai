"""
Pydantic schemas for background job status API.
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class BackgroundJobResponse(BaseModel):
    """Response schema for background job status."""
    job_id: UUID
    organization_id: UUID
    job_type: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    batch_id: Optional[UUID] = None
    total_items: int = 0
    processed_items: int = 0
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    errors: Optional[List[str]] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class BackgroundJobCreateResponse(BaseModel):
    """Response when a background job is created."""
    success: bool
    job_id: UUID
    job_type: str
    status: str
    message: str


class PipelineStatusResponse(BaseModel):
    """Response schema for pipeline status (prediction + segmentation + behavior)."""
    batch_id: UUID
    organization_id: UUID
    prediction_status: str
    segmentation_job_id: Optional[UUID] = None
    segmentation_status: Optional[str] = None
    behavior_job_id: Optional[UUID] = None
    behavior_status: Optional[str] = None
    overall_status: str  # 'processing', 'completed', 'partially_completed', 'failed'
    message: str

