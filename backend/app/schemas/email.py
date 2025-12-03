from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


class EmailGenerateRequest(BaseModel):
    customer_ids: Optional[List[str]] = None
    segment_id: Optional[str] = None
    extra_params: Optional[Dict[str, Any]] = None


class EmailGenerateResponse(BaseModel):
    subject: str
    html_body: str
    text_body: Optional[str] = None


class EmailSendRequest(BaseModel):
    subject: str
    html_body: str
    text_body: Optional[str] = None
    customer_ids: List[str]
    segment_id: Optional[str] = None


class EmailSendResponse(BaseModel):
    success: bool
    message: str
    sent_count: int
    failed_count: int
    details: Optional[List[Dict[str, Any]]] = []


class EmailLogResponse(BaseModel):
    id: int
    customer_id: str
    recipient_email: str
    subject: str
    segment_id: Optional[str]
    status: str
    sent_at: datetime
    error_message: Optional[str]

    class Config:
        from_attributes = True
