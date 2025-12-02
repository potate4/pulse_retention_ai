from sqlalchemy import Column, Integer, String, Boolean
from app.db.base_class import Base
from app.core.roles import Role


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default=Role.USER.value)
    is_active = Column(Boolean, default=True, nullable=False)
