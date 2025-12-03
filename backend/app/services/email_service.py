"""
Email Service
Main orchestration service for email campaigns.
Coordinates between customer, segmentation, template, and sender services.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.customer_service import CustomerService
from app.services.segmentation_service import SegmentationService
from app.services.email_template_service import EmailTemplateService
from app.services.email_sender import EmailSender
from app.schemas.email import EmailGenerateResponse, EmailSendResponse
from app.db.models.email_log import EmailLog
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


class EmailService:
    """Main service for email campaign operations"""
    
    @staticmethod
    async def generate_email_preview(
        customer_ids: Optional[List[str]] = None,
        segment_id: Optional[str] = None,
        organization_id: Any = 1,  # Can be int or UUID
        extra_params: Optional[Dict[str, Any]] = None
    ) -> EmailGenerateResponse:
        """
        Generate email preview for customers or segment.
        
        Args:
            customer_ids: List of customer IDs (optional)
            segment_id: Segment ID (optional)
            organization_id: Organization ID
            extra_params: Additional parameters for template generation
            
        Returns:
            EmailGenerateResponse with subject and body (with placeholders)
        """
        # Determine which customers to target
        if customer_ids and len(customer_ids) > 0:
            # Use specific customers
            customers = await CustomerService.get_customers_by_ids(customer_ids, organization_id)
        elif segment_id:
            # Use segment
            customers = await CustomerService.get_customers_by_segment(segment_id, organization_id)
        else:
            raise ValueError("Either customer_ids or segment_id must be provided")
        
        if not customers:
            raise ValueError("No customers found")
        
        # Use first customer for preview
        first_customer = customers[0]
        
        # Generate template
        template = await EmailTemplateService.generate_template(
            customer=first_customer.model_dump(),
            segment_id=segment_id or first_customer.segment_id,
            extra_params=extra_params
        )
        
        return EmailGenerateResponse(**template)
    
    @staticmethod
    async def send_emails(
        subject: str,
        html_body: str,
        text_body: Optional[str],
        customer_ids: List[str],
        segment_id: Optional[str],
        organization_id: Any = 1  # Can be int or UUID
    ) -> EmailSendResponse:
        """
        Send personalized emails to customers.
        
        Args:
            subject: Email subject (may contain placeholders)
            html_body: HTML email body (may contain placeholders)
            text_body: Plain text email body (optional)
            customer_ids: List of customer IDs to send to
            segment_id: Segment ID (for logging)
            organization_id: Organization ID
            
        Returns:
            EmailSendResponse with send results
        """
        # Get customers
        print(f"[DEBUG EmailService] Getting customers: {customer_ids}")
        print(f"[DEBUG EmailService] Organization ID: {organization_id}")
        
        try:
            customers = await CustomerService.get_customers_by_ids(customer_ids, organization_id)
            print(f"[DEBUG EmailService] Found {len(customers)} customers")
        except Exception as e:
            print(f"[ERROR EmailService] Failed to get customers: {str(e)}")
            raise
        
        if not customers:
            print("[DEBUG EmailService] No customers found")
            return EmailSendResponse(
                success=False,
                message="No customers found",
                sent_count=0,
                failed_count=0,
                details=[]
            )
        
        sent_count = 0
        failed_count = 0
        details = []
        
        # Send personalized email to each customer
        for customer in customers:
            personalized_subject = subject
            personalized_html = html_body
            personalized_text = text_body
            
            try:
                customer_data = customer.model_dump()
                
                # Personalize subject and body for this customer
                personalized_subject = EmailTemplateService.apply_placeholders(subject, customer_data)
                personalized_html = EmailTemplateService.apply_placeholders(html_body, customer_data)
                if text_body:
                    personalized_text = EmailTemplateService.apply_placeholders(text_body, customer_data)
                
                # Send email
                result = await EmailSender.send_email(
                    to=customer.email,
                    subject=personalized_subject,
                    html_body=personalized_html,
                    text_body=personalized_text
                )
                
                sent_count += 1
                details.append({
                    "customer_id": customer.id,
                    "email": customer.email,
                    "status": "sent",
                    "timestamp": result.get("timestamp")
                })
                
                # Log to database (non-blocking)
                try:
                    db = SessionLocal()
                    try:
                        email_log = EmailLog(
                            customer_id=customer.id,
                            recipient_email=customer.email,
                            subject=personalized_subject,
                            html_body=personalized_html,
                            text_body=personalized_text,
                            segment_id=segment_id,
                            status="sent",
                            organization_id=organization_id
                        )
                        db.add(email_log)
                        db.commit()
                    finally:
                        db.close()
                except Exception as log_error:
                    logger.warning(f"Failed to log email to database: {str(log_error)}")
                
            except Exception as e:
                logger.error(f"Failed to send email to {customer.email}: {str(e)}")
                failed_count += 1
                details.append({
                    "customer_id": customer.id,
                    "email": customer.email,
                    "status": "failed",
                    "error": str(e)
                })
                
                # Log failure to database (non-blocking)
                try:
                    db = SessionLocal()
                    try:
                        email_log = EmailLog(
                            customer_id=customer.id,
                            recipient_email=customer.email,
                            subject=personalized_subject,
                            html_body=personalized_html,
                            segment_id=segment_id,
                            status="failed",
                            error_message=str(e),
                            organization_id=organization_id
                        )
                        db.add(email_log)
                        db.commit()
                    finally:
                        db.close()
                except Exception as log_error:
                    logger.warning(f"Failed to log email error to database: {str(log_error)}")
        
        return EmailSendResponse(
            success=sent_count > 0,
            message=f"Sent {sent_count} emails successfully, {failed_count} failed",
            sent_count=sent_count,
            failed_count=failed_count,
            details=details
        )
    
    @staticmethod
    async def send_to_segment(
        subject: str,
        html_body: str,
        text_body: Optional[str],
        segment_id: str,
        organization_id: int = 1
    ) -> EmailSendResponse:
        """
        Send emails to all customers in a segment.
        
        Args:
            subject: Email subject (may contain placeholders)
            html_body: HTML email body (may contain placeholders)
            text_body: Plain text email body (optional)
            segment_id: Segment ID
            organization_id: Organization ID
            
        Returns:
            EmailSendResponse with send results
        """
        # Get all customers in segment
        customers = await CustomerService.get_customers_by_segment(segment_id, organization_id)
        customer_ids = [c.id for c in customers]
        
        # Send emails
        return await EmailService.send_emails(
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            customer_ids=customer_ids,
            segment_id=segment_id,
            organization_id=organization_id
        )
