from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class PaymentInitiateRequest(BaseModel):
    plan_id: str  # 'starter', 'professional', 'enterprise'
    billing_cycle: str  # 'monthly' or 'yearly'
    payment_method: str  # 'bkash', 'card', 'nagad'


class PaymentInitiateResponse(BaseModel):
    payment_url: str
    payment_id: str
    invoice_id: str
    amount: float
    message: str


class PaymentCallbackRequest(BaseModel):
    payment_id: str
    status: str  # 'success', 'failure', 'cancel'
    transaction_id: Optional[str] = None


class PaymentStatusResponse(BaseModel):
    payment_id: str
    status: str
    transaction_id: Optional[str] = None
    amount: Optional[float] = None
    message: str


class SubscriptionResponse(BaseModel):
    plan: Optional[str] = None  # 'starter', 'professional', 'enterprise'
    status: Optional[str] = None  # 'active', 'inactive', 'expired'
    billing_cycle: Optional[str] = None  # 'monthly', 'yearly'
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = False

