from sqlalchemy import Column, String, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.db.base_class import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(String, nullable=False, index=True)  # External customer ID string
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    event_date = Column(Date, nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=True)
    event_type = Column(String, nullable=True)  # 'purchase', 'login', 'usage', etc.
    extra_data = Column(JSONB, nullable=True)  # Additional org-specific fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    # Note: No direct foreign key relationship with Customer since customer_id is external_customer_id (string)
    organization = relationship("Organization", back_populates="transactions")

