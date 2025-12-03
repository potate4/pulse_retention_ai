"""
Behavior Analysis Model
Stores industry-specific behavior analysis and risk signals
"""
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Enum as SQLAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum
from app.db.base_class import Base


class OrgType(str, enum.Enum):
    """Organization type enum"""
    BANKING = "banking"
    TELECOM = "telecom"
    ECOMMERCE = "ecommerce"


class BehaviorAnalysis(Base):
    __tablename__ = "behavior_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(String, nullable=False, index=True)  # Now stores external_customer_id as string
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    # Organization type for context
    org_type = Column(
        SQLAEnum(
            OrgType,
            name='org_type_enum',
            values_callable=lambda enum_cls: [member.value for member in enum_cls]
        ),
        nullable=False
    )

    # Behavior metrics
    behavior_score = Column(Numeric(5, 2), nullable=False)  # 0.00 to 100.00 - composite behavior health score
    activity_trend = Column(String, nullable=True)  # 'increasing', 'stable', 'declining'
    value_trend = Column(String, nullable=True)  # 'increasing', 'stable', 'declining'
    engagement_trend = Column(String, nullable=True)  # 'increasing', 'stable', 'declining'

    # Risk signals and recommendations
    risk_signals = Column(JSONB, nullable=True)  # Array of detected risk signals
    recommendations = Column(JSONB, nullable=True)  # Array of recommended actions

    # Metadata
    analyzed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    extra_data = Column(JSONB, nullable=True)  # Industry-specific metrics

    # Relationships
    organization = relationship("Organization", backref="behavior_analyses")
