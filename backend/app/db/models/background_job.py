"""
Background Job Model
Tracks status of long-running background tasks like segmentation and behavior analysis
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.db.base_class import Base


class BackgroundJob(Base):
    """
    Stores status and results of background jobs.
    Used for segmentation, behavior analysis, and other long-running tasks.
    """
    __tablename__ = "background_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Job type: 'segmentation', 'behavior_analysis', 'pipeline' (for chained operations)
    job_type = Column(String, nullable=False, index=True)
    
    # Optional reference to prediction batch (for chained operations)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("prediction_batches.id"), nullable=True, index=True)
    
    # Status: 'pending', 'processing', 'completed', 'failed'
    status = Column(String, default="pending", nullable=False, index=True)
    
    # Progress tracking
    total_items = Column(Integer, default=0, nullable=False)
    processed_items = Column(Integer, default=0, nullable=False)
    
    # Results (stored as JSON)
    result = Column(JSONB, nullable=True)  # Success result data
    error_message = Column(String, nullable=True)  # Error message if failed
    errors = Column(JSONB, nullable=True)  # List of non-fatal errors during processing
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization", backref="background_jobs")
    prediction_batch = relationship("PredictionBatch", backref="background_jobs")

