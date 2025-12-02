from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.db.base_class import Base


class ModelMetadata(Base):
    __tablename__ = "model_metadata"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)

    # Model storage
    model_path = Column(String, nullable=False)  # Path to saved model file
    model_type = Column(String, default="logistic_regression", nullable=True)  # Model type used

    # Training status
    status = Column(String, default="training", nullable=False)  # training, completed, failed
    error_message = Column(String, nullable=True)  # Error message if training failed

    # Model metrics
    accuracy = Column(Numeric(5, 4), nullable=True)
    precision = Column(Numeric(5, 4), nullable=True)
    recall = Column(Numeric(5, 4), nullable=True)
    f1_score = Column(Numeric(5, 4), nullable=True)
    roc_auc = Column(Numeric(5, 4), nullable=True)
    feature_importance = Column(JSONB, nullable=True)  # Dictionary of feature names and importance scores

    # Training dataset info
    training_samples = Column(Integer, nullable=True)  # Number of samples used for training
    churn_rate = Column(Numeric(5, 4), nullable=True)  # Churn rate in training data

    # Timestamps
    trained_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="model_metadata")

