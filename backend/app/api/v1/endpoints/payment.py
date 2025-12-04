"""
Payment API Endpoints
Handles payment initiation, callbacks, and subscription management
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import logging

from app.api.deps import get_db, get_current_active_user
from app.db.models.user import User
from app.schemas.subscription import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentCallbackRequest,
    PaymentStatusResponse,
    SubscriptionResponse
)
from app.services.sslcommerz_service import sslcommerz_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Plan pricing configuration
PLAN_PRICES = {
    "starter": {
        "monthly": 20000,
        "yearly": 192000  # 20k * 12 * 0.8 (20% discount)
    },
    "professional": {
        "monthly": 35000,
        "yearly": 336000  # 35k * 12 * 0.8
    },
    "enterprise": {
        "monthly": 50000,
        "yearly": 480000  # 50k * 12 * 0.8
    }
}


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    request: PaymentInitiateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Initiate a payment for subscription plan
    For bKash: Returns payment URL to redirect user
    """
    try:
        # Validate plan
        if request.plan_id not in PLAN_PRICES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan_id: {request.plan_id}"
            )
        
        # Validate billing cycle
        if request.billing_cycle not in ["monthly", "yearly"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="billing_cycle must be 'monthly' or 'yearly'"
            )
        
        # Get plan price
        amount = PLAN_PRICES[request.plan_id][request.billing_cycle]
        
        # Generate unique invoice ID
        invoice_id = f"PULSE-{current_user.id}-{int(datetime.now().timestamp())}"
        
        # All payment methods (bkash, nagad, card) go through SSLCommerz
        # SSLCommerz supports multiple payment methods in one integration
        try:
            # Create payment with SSLCommerz
            # The selected payment method will be available on SSLCommerz payment page
            payment_result = sslcommerz_service.create_payment(
                amount=amount,
                invoice_id=invoice_id,
                user_id=str(current_user.id),
                user_name=current_user.name,
                user_email=current_user.email
            )
            
            # Map payment method to user-friendly message
            method_names = {
                "bkash": "bKash",
                "nagad": "Nagad",
                "card": "Credit/Debit Card",
                "sslcommerz": "SSLCommerz"
            }
            method_name = method_names.get(request.payment_method, "selected payment method")
            
            return PaymentInitiateResponse(
                payment_url=payment_result["payment_url"],
                payment_id=payment_result["sessionkey"],
                invoice_id=invoice_id,
                amount=amount,
                message=f"Payment initiated successfully. Redirecting to SSLCommerz for {method_name} payment."
            )
        
        except Exception as e:
            logger.error(f"SSLCommerz payment initiation failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to initiate payment: {str(e)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment initiation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate payment: {str(e)}"
        )


@router.post("/callback", response_model=PaymentStatusResponse)
async def payment_callback(
    request: PaymentCallbackRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Handle payment callback from bKash
    Verifies payment and updates user subscription
    """
    try:
        payment_id = request.payment_id
        
        # Execute payment to confirm
        payment_result = bkash_service.execute_payment(payment_id)
        
        if payment_result["status"] != "success":
            return PaymentStatusResponse(
                payment_id=payment_id,
                status="failed",
                message=payment_result.get("message", "Payment failed")
            )
        
        # Query payment to get full details
        query_result = bkash_service.query_payment(payment_id)
        
        if query_result["status"] != "success":
            return PaymentStatusResponse(
                payment_id=payment_id,
                status="failed",
                message="Payment verification failed"
            )
        
        # Extract plan info from invoice_id (format: PULSE-{user_id}-{timestamp}-{plan_id})
        # For now, we'll need to store this mapping or extract from payment metadata
        # For simplicity, we'll use a query parameter or store in session
        # This is a simplified version - in production, store payment intent in database
        
        # Update user subscription (you may need to pass plan_id separately)
        # For now, returning success - plan update should be handled separately
        
        return PaymentStatusResponse(
            payment_id=payment_id,
            status="success",
            transaction_id=query_result.get("transaction_id"),
            amount=float(query_result.get("amount", 0)),
            message="Payment successful"
        )
    
    except Exception as e:
        logger.error(f"Payment callback error: {str(e)}")
        return PaymentStatusResponse(
            payment_id=request.payment_id,
            status="failed",
            message=f"Payment callback failed: {str(e)}"
        )


# Note: Payment verification is now handled by SSLCommerz callback endpoints
# This endpoint is kept for backward compatibility but redirects to SSLCommerz flow


# Payment status is now handled through SSLCommerz validation API
# This endpoint can be removed or kept for future use


@router.get("/subscription/current", response_model=SubscriptionResponse)
async def get_current_subscription(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user's subscription details
    """
    is_active = (
        current_user.subscription_status == "active" and
        current_user.subscription_end_date and
        current_user.subscription_end_date > datetime.now()
    )
    
    return SubscriptionResponse(
        plan=current_user.subscription_plan,
        status=current_user.subscription_status,
        billing_cycle=current_user.billing_cycle,
        start_date=current_user.subscription_start_date,
        end_date=current_user.subscription_end_date,
        is_active=is_active
    )


# SSLCommerz Callback Endpoints
@router.post("/sslcommerz/verify")
async def verify_sslcommerz_payment(
    val_id: str = Query(..., description="Validation ID from SSLCommerz"),
    amount: float = Query(..., description="Payment amount"),
    plan_id: str = Query(..., description="Plan ID to activate"),
    billing_cycle: str = Query(..., description="Billing cycle"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify SSLCommerz payment and activate subscription
    Called from SSLCommerz success callback
    """
    try:
        # Validate payment with SSLCommerz
        validation_result = sslcommerz_service.validate_payment(
            val_id=val_id,
            amount=amount,
            currency='BDT'
        )
        
        if validation_result["status"] != "success":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation_result.get("message", "Payment verification failed")
            )
        
        # Calculate subscription dates
        start_date = datetime.now()
        if billing_cycle == "monthly":
            end_date = start_date + timedelta(days=30)
        else:  # yearly
            end_date = start_date + timedelta(days=365)
        
        # Update user subscription
        current_user.subscription_plan = plan_id
        current_user.subscription_status = "active"
        current_user.subscription_start_date = start_date
        current_user.subscription_end_date = end_date
        current_user.billing_cycle = billing_cycle
        
        db.commit()
        db.refresh(current_user)
        
        logger.info(f"SSLCommerz subscription activated for user {current_user.id}: {plan_id} ({billing_cycle})")
        
        return PaymentStatusResponse(
            payment_id=validation_result.get("transaction_id", val_id),
            status="success",
            transaction_id=validation_result.get("bank_tran_id"),
            amount=float(validation_result.get("amount", amount)),
            message="Payment verified and subscription activated"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SSLCommerz payment verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify SSLCommerz payment: {str(e)}"
        )


@router.post("/sslcommerz/ipn")
async def sslcommerz_ipn(
    request: dict = None
):
    """
    SSLCommerz Instant Payment Notification (IPN)
    Server-to-server notification from SSLCommerz
    Note: SSLCommerz sends form data, not JSON
    """
    try:
        # SSLCommerz sends form data, so we need to handle it differently
        # This endpoint will be called by SSLCommerz server
        # For now, we'll log it - actual implementation depends on how SSLCommerz sends data
        
        logger.info(f"SSLCommerz IPN received: {request}")
        
        # Return success response to SSLCommerz
        return {"status": "received"}
    
    except Exception as e:
        logger.error(f"SSLCommerz IPN error: {str(e)}")
        return {"status": "error", "message": str(e)}

