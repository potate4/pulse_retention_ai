"""
SSLCommerz Payment Gateway Service
Handles SSLCommerz API integration for payment processing
Supports localhost for sandbox testing
"""
import requests
import hashlib
import json
from typing import Dict, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class SSLCommerzService:
    """Service for interacting with SSLCommerz Payment Gateway API"""
    
    def __init__(self):
        self.mode = settings.SSLCOMMERZ_MODE.lower()
        self.store_id = settings.SSLCOMMERZ_STORE_ID
        self.store_passwd = settings.SSLCOMMERZ_STORE_PASSWORD
        self.is_live = self.mode == "production"
        
        # SSLCommerz API URLs
        if self.is_live:
            self.base_url = "https://securepay.sslcommerz.com"
            self.initiate_url = f"{self.base_url}/gwprocess/v4/api.php"
            self.validation_url = f"{self.base_url}/validator/api/validationserverAPI.php"
        else:
            # Sandbox URLs
            self.base_url = "https://sandbox.sslcommerz.com"
            self.initiate_url = f"{self.base_url}/gwprocess/v4/api.php"
            self.validation_url = f"{self.base_url}/validator/api/validationserverAPI.php"
    
    def _generate_hash(self, data: Dict[str, str]) -> str:
        """
        Generate hash for SSLCommerz API
        Hash is generated from: store_passwd + all fields in alphabetical order
        Note: SSLCommerz uses sign_key, not sign
        """
        # Sort all fields alphabetically (excluding sign_key itself)
        sorted_data = sorted([(k, v) for k, v in data.items() if k != 'sign_key'])
        
        # Create hash string: store_passwd + field1=value1&field2=value2...
        hash_string = self.store_passwd
        for key, value in sorted_data:
            hash_string += f"{key}={value}&"
        hash_string = hash_string.rstrip('&')
        
        # Generate MD5 hash
        hash_value = hashlib.md5(hash_string.encode('utf-8')).hexdigest()
        return hash_value
    
    def create_payment(
        self,
        amount: float,
        invoice_id: str,
        user_id: str,
        user_name: str,
        user_email: str,
        user_phone: Optional[str] = None,
        success_url: str = None,
        fail_url: str = None,
        cancel_url: str = None,
        ipn_url: str = None
    ) -> Dict:
        """
        Create a payment session with SSLCommerz
        
        Args:
            amount: Payment amount
            invoice_id: Unique invoice/order ID
            user_id: User ID making the payment
            user_name: User's name
            user_email: User's email
            user_phone: User's phone (optional)
            success_url: URL to redirect after successful payment
            fail_url: URL to redirect after failed payment
            cancel_url: URL to redirect after cancelled payment
            ipn_url: Instant Payment Notification URL (optional)
        
        Returns:
            Dictionary with payment_url and sessionkey
        """
        # Default callback URLs
        base_callback = settings.SSLCOMMERZ_CALLBACK_URL or "http://localhost:5173"
        success_url = success_url or f"{base_callback}/payment/sslcommerz/success"
        fail_url = fail_url or f"{base_callback}/payment/sslcommerz/fail"
        cancel_url = cancel_url or f"{base_callback}/payment/sslcommerz/cancel"
        ipn_url = ipn_url or f"{settings.BACKEND_URL}/api/v1/payment/sslcommerz/ipn"
        
        # Prepare payment data
        payment_data = {
            'store_id': self.store_id,
            'store_passwd': self.store_passwd,
            'total_amount': str(amount),
            'currency': 'BDT',
            'tran_id': invoice_id,
            'success_url': success_url,
            'fail_url': fail_url,
            'cancel_url': cancel_url,
            'ipn_url': ipn_url,
            'cus_name': user_name,
            'cus_email': user_email,
            'cus_phone': user_phone or '01700000000',
            'cus_add1': 'Dhaka',
            'cus_city': 'Dhaka',
            'cus_country': 'Bangladesh',
            'shipping_method': 'NO',
            'product_name': 'Pulse Retention AI Subscription',
            'product_category': 'Software',
            'product_profile': 'general'
        }
        
        # Generate hash
        payment_data['sign_key'] = self._generate_hash(payment_data)
        
        try:
            # Make request to SSLCommerz
            response = requests.post(
                self.initiate_url,
                data=payment_data,
                timeout=30
            )
            response.raise_for_status()
            
            # Parse response (SSLCommerz returns form data or JSON)
            if response.headers.get('content-type', '').startswith('application/json'):
                data = response.json()
            else:
                # Parse form response
                data = {}
                for line in response.text.split('\n'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        data[key.strip()] = value.strip()
            
            # Check if payment session created successfully
            if data.get('status') == 'SUCCESS' or 'GatewayPageURL' in data:
                payment_url = data.get('GatewayPageURL') or data.get('redirectGatewayURL')
                sessionkey = data.get('sessionkey') or invoice_id
                
                logger.info(f"SSLCommerz payment session created: {sessionkey}")
                return {
                    "payment_url": payment_url,
                    "sessionkey": sessionkey,
                    "status": "success"
                }
            else:
                error_msg = data.get('failedreason', 'Unknown error')
                logger.error(f"SSLCommerz payment creation failed: {error_msg}")
                raise Exception(f"SSLCommerz payment creation failed: {error_msg}")
        
        except requests.exceptions.RequestException as e:
            logger.error(f"SSLCommerz API request failed: {str(e)}")
            raise Exception(f"Failed to create SSLCommerz payment: {str(e)}")
    
    def validate_payment(self, val_id: str, amount: float, currency: str = 'BDT') -> Dict:
        """
        Validate payment using SSLCommerz validation API
        
        Args:
            val_id: Validation ID from SSLCommerz callback
            amount: Original payment amount
            currency: Currency code (default: BDT)
        
        Returns:
            Dictionary with payment validation result
        """
        validation_data = {
            'val_id': val_id,
            'store_id': self.store_id,
            'store_passwd': self.store_passwd,
            'format': 'json'
        }
        
        try:
            response = requests.get(
                self.validation_url,
                params=validation_data,
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            # Check validation result
            if data.get('status') == 'VALID' or data.get('status') == 'VALIDATED':
                # Verify amount matches
                validated_amount = float(data.get('amount', 0))
                if abs(validated_amount - amount) > 0.01:  # Allow small floating point differences
                    logger.warning(f"Amount mismatch: expected {amount}, got {validated_amount}")
                    return {
                        "status": "failed",
                        "message": "Amount mismatch"
                    }
                
                logger.info(f"SSLCommerz payment validated: {val_id}")
                return {
                    "status": "success",
                    "transaction_id": data.get('tran_id'),
                    "val_id": val_id,
                    "amount": validated_amount,
                    "currency": data.get('currency', currency),
                    "card_type": data.get('card_type'),
                    "card_no": data.get('card_no'),
                    "bank_tran_id": data.get('bank_tran_id'),
                    "message": "Payment validated successfully"
                }
            else:
                error_msg = data.get('errorReason', 'Validation failed')
                logger.error(f"SSLCommerz payment validation failed: {error_msg}")
                return {
                    "status": "failed",
                    "message": error_msg
                }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"SSLCommerz validation API request failed: {str(e)}")
            raise Exception(f"Failed to validate SSLCommerz payment: {str(e)}")


# Singleton instance
sslcommerz_service = SSLCommerzService()

