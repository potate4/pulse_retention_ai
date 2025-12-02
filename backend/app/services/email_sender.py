"""
Email Sender Service
Handles actual email sending operations using SMTP.
"""
from typing import Optional
from datetime import datetime
import logging
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Email configuration from environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")  # Your Gmail address
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")  # Your Gmail app password
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER or "noreply@pulse.com")
USE_REAL_EMAIL = os.getenv("USE_REAL_EMAIL", "true").lower() == "true"


class EmailSender:
    """Service for sending emails via SMTP"""
    
    @staticmethod
    async def send_email(
        to: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> dict:
        """
        Send an email to a recipient using SMTP.
        
        Args:
            to: Recipient email address
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)
            
        Returns:
            Dict with status and message
            
        Environment Variables Required:
            SMTP_USER: Your email address (e.g., yourname@gmail.com)
            SMTP_PASSWORD: Your email app password
            USE_REAL_EMAIL: Set to "true" to send real emails (default: true)
            
        For Gmail:
            1. Enable 2-factor authentication
            2. Generate app password: https://myaccount.google.com/apppasswords
            3. Set SMTP_USER and SMTP_PASSWORD in .env file
        """
        timestamp = datetime.utcnow().isoformat()
        
        # Log email details
        logger.info("=" * 80)
        logger.info(f"📧 SENDING EMAIL - {timestamp}")
        logger.info(f"To: {to}")
        logger.info(f"Subject: {subject}")
        logger.info("-" * 80)
        
        # Check if real email sending is disabled or credentials missing
        if not USE_REAL_EMAIL:
            logger.warning("⚠️  MOCK MODE - Set USE_REAL_EMAIL=true in .env to send real emails")
            logger.info("HTML Preview:")
            logger.info(html_body[:300] + "..." if len(html_body) > 300 else html_body)
            logger.info("=" * 80)
            return {
                "status": "mocked",
                "message": f"Email logged (not sent) to {to}",
                "timestamp": timestamp
            }
        
        if not SMTP_USER or not SMTP_PASSWORD:
            logger.error("❌ SMTP credentials not configured!")
            logger.error("Set SMTP_USER and SMTP_PASSWORD in .env file")
            logger.info("=" * 80)
            return {
                "status": "error",
                "message": "SMTP credentials not configured",
                "timestamp": timestamp
            }
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = FROM_EMAIL
            msg['To'] = to
            
            # Attach plain text part if provided
            if text_body:
                part1 = MIMEText(text_body, 'plain', 'utf-8')
                msg.attach(part1)
            
            # Attach HTML part
            part2 = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(part2)
            
            # Connect to SMTP server and send
            logger.info(f"Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(FROM_EMAIL, to, msg.as_string())
            
            logger.info(f"✅ Email successfully sent to {to}")
            logger.info("=" * 80)
            
            return {
                "status": "sent",
                "message": f"Email sent to {to}",
                "timestamp": timestamp
            }
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ Authentication failed: {str(e)}")
            logger.error("Check your SMTP_USER and SMTP_PASSWORD")
            logger.error("For Gmail, use an App Password: https://myaccount.google.com/apppasswords")
            logger.info("=" * 80)
            raise Exception(f"Email authentication failed: {str(e)}")
            
        except smtplib.SMTPException as e:
            logger.error(f"❌ SMTP error sending to {to}: {str(e)}")
            logger.info("=" * 80)
            raise Exception(f"Failed to send email: {str(e)}")
            
        except Exception as e:
            logger.error(f"❌ Unexpected error sending to {to}: {str(e)}")
            logger.info("=" * 80)
            raise Exception(f"Failed to send email: {str(e)}")
    
    @staticmethod
    async def send_bulk_emails(
        recipients: list,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> dict:
        """
        Send emails to multiple recipients.
        
        Args:
            recipients: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body
            
        Returns:
            Dict with send results including success and failed counts
        """
        results = {
            "success": [],
            "failed": []
        }
        
        logger.info(f"📬 Starting bulk email send to {len(recipients)} recipients...")
        
        for recipient in recipients:
            try:
                result = await EmailSender.send_email(recipient, subject, html_body, text_body)
                results["success"].append({
                    "email": recipient,
                    "timestamp": result["timestamp"],
                    "status": result["status"]
                })
            except Exception as e:
                logger.error(f"Failed to send email to {recipient}: {str(e)}")
                results["failed"].append({
                    "email": recipient,
                    "error": str(e)
                })
        
        logger.info(f"✅ Bulk send complete: {len(results['success'])} sent, {len(results['failed'])} failed")
        return results
