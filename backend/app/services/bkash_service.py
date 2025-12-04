"""
bKash Payment Gateway Service
Handles bKash API integration for payment processing
"""
import requests
import json
from typing import Dict, Optional, Tuple
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class BKashService:
    """Service for interacting with bKash Payment Gateway API"""
    
    def __init__(self):
        self.mode = settings.BKASH_MODE.lower()
        self.base_url = (
            settings.BKASH_SANDBOX_URL 
            if self.mode == "sandbox" 
            else settings.BKASH_PRODUCTION_URL
        )
        self.app_key = settings.BKASH_APP_KEY
        self.app_secret = settings.BKASH_APP_SECRET
        self.username = settings.BKASH_USERNAME
        self.password = settings.BKASH_PASSWORD
        self.callback_url = settings.BKASH_CALLBACK_URL
        self._access_token: Optional[str] = None
    
    def _get_access_token(self) -> str:
        """
        Grant token from bKash API
        Returns access token for API authentication
        """
        if self._access_token:
            return self._access_token
        
        url = f"{self.base_url}/tokenized/checkout/token/grant"
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "username": self.username,
            "password": self.password
        }
        
        payload = {
            "app_key": self.app_key,
            "app_secret": self.app_secret
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get("statusCode") == "0000":
                self._access_token = data.get("id_token")
                logger.info("bKash access token granted successfully")
                return self._access_token
            else:
                error_msg = data.get("statusMessage", "Unknown error")
                logger.error(f"bKash token grant failed: {error_msg}")
                raise Exception(f"bKash token grant failed: {error_msg}")
        
        except requests.exceptions.RequestException as e:
            logger.error(f"bKash API request failed: {str(e)}")
            raise Exception(f"Failed to get bKash access token: {str(e)}")
    
    def create_payment(
        self, 
        amount: float, 
        invoice_id: str, 
        user_id: str,
        callback_url: Optional[str] = None
    ) -> Dict:
        """
        Create a payment request with bKash
        
        Args:
            amount: Payment amount
            invoice_id: Unique invoice/order ID
            user_id: User ID making the payment
            callback_url: Callback URL after payment (optional)
        
        Returns:
            Dictionary with payment_url and paymentID
        """
        access_token = self._get_access_token()
        url = f"{self.base_url}/tokenized/checkout/payment/create"
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": access_token,
            "X-APP-Key": self.app_key
        }
        
        # Use provided callback URL or default
        callback = callback_url or self.callback_url
        
        payload = {
            "mode": "0011",  # Checkout mode
            "payerReference": str(user_id),
            "callbackURL": callback,
            "amount": str(amount),
            "currency": "BDT",
            "intent": "sale",
            "merchantInvoiceNumber": invoice_id
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get("statusCode") == "0000":
                payment_id = data.get("paymentID")
                payment_url = data.get("bkashURL")
                
                logger.info(f"bKash payment created: {payment_id}")
                return {
                    "payment_id": payment_id,
                    "payment_url": payment_url,
                    "status": "success"
                }
            else:
                error_msg = data.get("statusMessage", "Unknown error")
                logger.error(f"bKash payment creation failed: {error_msg}")
                raise Exception(f"bKash payment creation failed: {error_msg}")
        
        except requests.exceptions.RequestException as e:
            logger.error(f"bKash API request failed: {str(e)}")
            raise Exception(f"Failed to create bKash payment: {str(e)}")
    
    def execute_payment(self, payment_id: str) -> Dict:
        """
        Execute a payment after user confirms on bKash
        
        Args:
            payment_id: Payment ID from create_payment response
        
        Returns:
            Dictionary with payment status and transaction details
        """
        access_token = self._get_access_token()
        url = f"{self.base_url}/tokenized/checkout/payment/execute"
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": access_token,
            "X-APP-Key": self.app_key
        }
        
        payload = {
            "paymentID": payment_id
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get("statusCode") == "0000":
                logger.info(f"bKash payment executed successfully: {payment_id}")
                return {
                    "status": "success",
                    "transaction_id": data.get("trxID"),
                    "amount": data.get("amount"),
                    "currency": data.get("currency"),
                    "payment_id": payment_id,
                    "message": "Payment successful"
                }
            else:
                error_msg = data.get("statusMessage", "Unknown error")
                logger.error(f"bKash payment execution failed: {error_msg}")
                return {
                    "status": "failed",
                    "payment_id": payment_id,
                    "message": error_msg
                }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"bKash API request failed: {str(e)}")
            raise Exception(f"Failed to execute bKash payment: {str(e)}")
    
    def query_payment(self, payment_id: str) -> Dict:
        """
        Query payment status from bKash
        
        Args:
            payment_id: Payment ID to query
        
        Returns:
            Dictionary with payment status
        """
        access_token = self._get_access_token()
        url = f"{self.base_url}/tokenized/checkout/payment/query"
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": access_token,
            "X-APP-Key": self.app_key
        }
        
        payload = {
            "paymentID": payment_id
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get("statusCode") == "0000":
                return {
                    "status": "success",
                    "payment_id": payment_id,
                    "transaction_id": data.get("trxID"),
                    "amount": data.get("amount"),
                    "currency": data.get("currency"),
                    "status_code": data.get("statusCode"),
                    "status_message": data.get("statusMessage")
                }
            else:
                return {
                    "status": "failed",
                    "payment_id": payment_id,
                    "status_code": data.get("statusCode"),
                    "status_message": data.get("statusMessage")
                }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"bKash API request failed: {str(e)}")
            raise Exception(f"Failed to query bKash payment: {str(e)}")


# Singleton instance
bkash_service = BKashService()

