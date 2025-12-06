"""
Widget Message Cache Model
Stores LLM-generated personalized widget messages for reuse across customers
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base


class WidgetMessageCache(Base):
    """
    Cache for LLM-generated widget messages.

    Messages are cached by (organization_id, segment, risk_level) combination
    to reuse across multiple customers with similar profiles.

    TTL: 7 days (weekly refresh)
    """
    __tablename__ = "widget_message_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    segment = Column(String, nullable=False, index=True)  # e.g., "Champions", "At Risk"
    risk_level = Column(String, nullable=False, index=True)  # "Low", "Medium", "High", "Critical"

    # Generated message content
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)  # HTML content
    cta_text = Column(String, nullable=False)
    cta_link = Column(String, nullable=False)

    # Cache metadata
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # generated_at + 7 days

    # Ensure one cache entry per (org_id, segment, risk_level) combination
    __table_args__ = (
        UniqueConstraint('organization_id', 'segment', 'risk_level', name='uq_org_segment_risk'),
    )

    def is_expired(self) -> bool:
        """Check if this cache entry has expired."""
        return datetime.utcnow() > self.expires_at

    def __repr__(self):
        return f"<WidgetMessageCache(org={self.organization_id}, segment={self.segment}, risk={self.risk_level})>"
