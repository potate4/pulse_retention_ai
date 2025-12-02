from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.db.base_class import Base


class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    external_customer_id = Column(String, nullable=False)  # Organization's customer ID
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="customers")
    # Note: No direct relationship with Transaction - transactions are linked via external_customer_id (string)
    customer_feature = relationship("CustomerFeature", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    churn_prediction = relationship("ChurnPrediction", back_populates="customer", uselist=False, cascade="all, delete-orphan")

