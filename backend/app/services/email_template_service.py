"""
Email Template Service
Generates personalized email templates using AI.
Currently uses mock templates, designed for easy integration with teammate's AI service.
"""
from typing import Dict, Any, Optional
import re


class EmailTemplateService:
    """Service for generating email templates"""
    
    @staticmethod
    def get_mock_template(segment_id: str) -> Dict[str, str]:
        """
        Returns mock email templates based on segment.
        
        TODO: Replace with teammate's AI template generator API:
        - Endpoint: POST /api/generate-template
        - Request: { segment_id, customer_data, extra_params }
        - Response: { subject, html_body, text_body }
        """
        templates = {
            "s1": {
                "subject": "Thank You for Being a Valued Customer, {name}!",
                "html_body": """
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2c3e50;">Hi {name},</h2>
                        <p>We wanted to take a moment to thank you for being one of our most valued customers!</p>
                        <p>Your recent purchase of <strong>৳{purchase_amount}</strong> means the world to us.</p>
                        <p>As a token of our appreciation, we're offering you an exclusive <strong>20% discount</strong> on your next purchase.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="#" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Claim Your Discount</a>
                        </div>
                        <p>Thank you for choosing us!</p>
                        <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                            Best regards,<br>
                            The Team
                        </p>
                    </div>
                </body>
                </html>
                """,
                "text_body": "Hi {name},\n\nWe wanted to take a moment to thank you for being one of our most valued customers!\n\nYour recent purchase of ৳{purchase_amount} means the world to us.\n\nAs a token of our appreciation, we're offering you an exclusive 20% discount on your next purchase.\n\nThank you for choosing us!\n\nBest regards,\nThe Team"
            },
            "s2": {
                "subject": "We Miss You, {name}! Come Back for Special Offers",
                "html_body": """
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #e74c3c;">Hey {name}, We Miss You!</h2>
                        <p>We noticed it's been a while since your last visit on <strong>{last_purchase}</strong>.</p>
                        <p>We've made some exciting improvements and have new products we think you'll love!</p>
                        <div style="background-color: #ffe6e6; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #e74c3c;">Special Comeback Offer!</h3>
                            <p style="margin-bottom: 0;">Get <strong>30% OFF</strong> on your next purchase + free shipping!</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="#" style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Welcome Back Offer</a>
                        </div>
                        <p>We'd love to have you back!</p>
                        <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                            Best regards,<br>
                            The Team
                        </p>
                    </div>
                </body>
                </html>
                """,
                "text_body": "Hey {name}, We Miss You!\n\nWe noticed it's been a while since your last visit on {last_purchase}.\n\nWe've made some exciting improvements and have new products we think you'll love!\n\nSpecial Comeback Offer!\nGet 30% OFF on your next purchase + free shipping!\n\nWe'd love to have you back!\n\nBest regards,\nThe Team"
            },
            "s3": {
                "subject": "Welcome to Our Community, {name}!",
                "html_body": """
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #27ae60;">Welcome, {name}! 🎉</h2>
                        <p>We're thrilled to have you join our community!</p>
                        <p>Thank you for your recent purchase of <strong>৳{purchase_amount}</strong>. We hope you're enjoying your experience with us.</p>
                        <div style="background-color: #e8f8f5; padding: 15px; border-left: 4px solid #27ae60; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #27ae60;">New Customer Benefits:</h3>
                            <ul style="margin-bottom: 0;">
                                <li>15% discount on your next 3 purchases</li>
                                <li>Free shipping on orders over ৳1000</li>
                                <li>Priority customer support</li>
                            </ul>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="#" style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Explore Products</a>
                        </div>
                        <p>If you have any questions, we're here to help!</p>
                        <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                            Best regards,<br>
                            The Team
                        </p>
                    </div>
                </body>
                </html>
                """,
                "text_body": "Welcome, {name}! 🎉\n\nWe're thrilled to have you join our community!\n\nThank you for your recent purchase of ৳{purchase_amount}. We hope you're enjoying your experience with us.\n\nNew Customer Benefits:\n- 15% discount on your next 3 purchases\n- Free shipping on orders over ৳1000\n- Priority customer support\n\nIf you have any questions, we're here to help!\n\nBest regards,\nThe Team"
            }
        }
        
        return templates.get(segment_id, templates["s3"])
    
    @staticmethod
    def apply_placeholders(template: str, customer_data: Dict[str, Any]) -> str:
        """
        Replace placeholders in template with actual customer data.
        
        Args:
            template: Template string with {placeholders}
            customer_data: Customer data dictionary
            
        Returns:
            Template with replaced values
        """
        if not template:
            return ""
            
        result = template
        
        # Replace basic customer fields
        replacements = {
            "name": customer_data.get("name") or "Valued Customer",
            "email": customer_data.get("email") or "",
            "phone": customer_data.get("phone") or "",
            "segment": customer_data.get("segment_id") or "",
            "churn_score": str(customer_data.get("churn_score") or 0)
        }
        
        # Add custom fields - handle None values
        custom_fields = customer_data.get("custom_fields", {})
        if custom_fields:
            for k, v in custom_fields.items():
                replacements[k] = str(v) if v is not None else ""
        
        # Replace all placeholders - ensure value is never None
        for key, value in replacements.items():
            if value is not None:
                result = result.replace(f"{{{key}}}", str(value))
        
        return result
    
    @staticmethod
    async def generate_template(
        customer: Dict[str, Any],
        segment_id: Optional[str] = None,
        extra_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """
        Generate personalized email template for a customer.
        Returns a simple hardcoded message that can be edited.
        
        Args:
            customer: Customer data
            segment_id: Segment ID (optional)
            extra_params: Additional parameters for template generation
            
        Returns:
            Dict with subject, html_body, text_body
        """
        # Return hardcoded simple message
        return {
            "subject": "We'd Love to Have You Back!",
            "html_body": """
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">Hello Valued Customer,</h2>
                <p>We noticed you haven't been with us lately, and we wanted to reach out to see how we can help.</p>
                <p>We value your business and would love to have you back. As a token of our appreciation, we're offering you a special discount on your next purchase.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Claim Your Offer</a>
                </div>
                <p>If you have any questions or concerns, please don't hesitate to reach out to us. We're here to help!</p>
                <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                    Best regards,<br>
                    The Team
                </p>
            </body>
            </html>
            """,
            "text_body": """Hello Valued Customer,

We noticed you haven't been with us lately, and we wanted to reach out to see how we can help.

We value your business and would love to have you back. As a token of our appreciation, we're offering you a special discount on your next purchase.

If you have any questions or concerns, please don't hesitate to reach out to us. We're here to help!

Best regards,
The Team"""
        }
