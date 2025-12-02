"""
Customer Segment Model
Stores detailed business-focused customer segmentation (Champions, At Risk, etc.)
"""
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.db.base_class import Base


class CustomerSegment(Base):
    __tablename__ = "customer_segments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    # Segment information
    segment = Column(String, nullable=False, index=True)  # 'Champions', 'Loyal Customers', 'At Risk', etc.
    segment_score = Column(Numeric(5, 2), nullable=False)  # 0.00 to 100.00 - composite score
    rfm_category = Column(JSONB, nullable=True)  # {'R': 'High', 'F': 'Medium', 'M': 'High', 'E': 'High'}
    churn_risk_level = Column(String, nullable=False)  # 'Low', 'Medium', 'High', 'Critical'

    # Metadata
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata = Column(JSONB, nullable=True)  # Additional segment-specific data

    # Relationships
    customer = relationship("Customer", backref="customer_segment")
    organization = relationship("Organization", backref="customer_segments")
