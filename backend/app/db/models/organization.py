from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLAEnum
from sqlalchemy.dialects.postgresql import UUID
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


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    churn_threshold_days = Column(Integer, default=30, nullable=False)
    org_type = Column(SQLAEnum(OrgType, name='org_type_enum'), nullable=False, server_default='telecom')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    customers = relationship("Customer", back_populates="organization", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="organization", cascade="all, delete-orphan")
    customer_features = relationship("CustomerFeature", back_populates="organization", cascade="all, delete-orphan")
    churn_predictions = relationship("ChurnPrediction", back_populates="organization", cascade="all, delete-orphan")
    model_metadata = relationship("ModelMetadata", back_populates="organization", cascade="all, delete-orphan")
    data_processing_status = relationship("DataProcessingStatus", back_populates="organization", cascade="all, delete-orphan")

