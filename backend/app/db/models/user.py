from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.base_class import Base
from app.core.roles import Role

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default=Role.USER.value)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Subscription fields
    subscription_plan = Column(String, nullable=True)  # 'starter', 'professional', 'enterprise', or null
    subscription_status = Column(String, nullable=True)  # 'active', 'inactive', 'expired', or null
    subscription_start_date = Column(DateTime(timezone=True), nullable=True)
    subscription_end_date = Column(DateTime(timezone=True), nullable=True)
    billing_cycle = Column(String, nullable=True)  # 'monthly' or 'yearly'
