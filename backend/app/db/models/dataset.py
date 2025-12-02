from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.db.base_class import Base


class Dataset(Base):
    """
    Stores dataset URLs and metadata for churn prediction.
    Datasets are stored in Supabase storage buckets.
    """
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)

    # Dataset type: 'raw' or 'features'
    dataset_type = Column(String, nullable=False)  # 'raw' = customer transactions, 'features' = engineered features

    # Supabase storage URLs
    file_url = Column(String, nullable=False)  # Public URL to the CSV file
    bucket_name = Column(String, nullable=False)  # Supabase bucket name
    file_path = Column(String, nullable=False)  # Path within bucket

    # Metadata
    filename = Column(String, nullable=False)  # Original filename
    file_size = Column(Integer, nullable=True)  # File size in bytes
    row_count = Column(Integer, nullable=True)  # Number of rows in CSV

    # Churn label info
    has_churn_label = Column(String, default=False, nullable=False)  # Whether CSV has churn_label column

    # Status
    status = Column(String, default="uploaded", nullable=False)  # uploaded, processing, ready, error

    # Timestamps
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", backref="datasets")
