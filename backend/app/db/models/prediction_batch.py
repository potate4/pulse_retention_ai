from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.db.base_class import Base


class PredictionBatch(Base):
    """
    Stores batch prediction results for organizations.
    Each batch represents one CSV upload for inference.
    """
    __tablename__ = "prediction_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)

    # Batch info
    batch_name = Column(String, nullable=True)  # Optional name for the batch
    total_customers = Column(Integer, nullable=False)  # Number of customers predicted

    # File references
    input_file_url = Column(String, nullable=True)  # Supabase URL of uploaded CSV
    output_file_url = Column(String, nullable=True)  # Supabase URL of predictions CSV

    # Status
    status = Column(String, default="processing", nullable=False)  # processing, completed, failed
    error_message = Column(String, nullable=True)

    # Summary statistics
    avg_churn_probability = Column(String, nullable=True)  # Average churn probability
    risk_distribution = Column(JSONB, nullable=True)  # {"Low": 100, "Medium": 50, "High": 30, "Critical": 20}

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization", backref="prediction_batches")
    predictions = relationship("CustomerPrediction", back_populates="batch", cascade="all, delete-orphan")


class CustomerPrediction(Base):
    """
    Individual customer predictions within a batch.
    Stores predictions without requiring Customer table entries.
    """
    __tablename__ = "customer_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("prediction_batches.id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)

    # Customer info (from CSV, not linked to Customer table)
    external_customer_id = Column(String, nullable=False, index=True)  # customer_id from CSV

    # Prediction results
    churn_probability = Column(String, nullable=False)  # 0.0 to 1.0
    risk_segment = Column(String, nullable=False)  # Low, Medium, High, Critical

    # Calculated features (for reference)
    features = Column(JSONB, nullable=True)  # Store the 8 RFM features

    # Timestamp
    predicted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    batch = relationship("PredictionBatch", back_populates="predictions")
    organization = relationship("Organization", backref="customer_predictions")
