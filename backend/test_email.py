"""
Quick test script to verify email sending works
"""
import asyncio
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.email_sender import EmailSender

async def test_email():
    print("🧪 Testing Email Sender...")
    print("-" * 60)
    
    # Check configuration
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    use_real = os.getenv("USE_REAL_EMAIL", "true")
    
    print(f"USE_REAL_EMAIL: {use_real}")
    print(f"SMTP_USER: {smtp_user if smtp_user else '❌ NOT SET'}")
    print(f"SMTP_PASSWORD: {'✓ SET' if smtp_pass else '❌ NOT SET'}")
    print("-" * 60)
    
    if not smtp_user or not smtp_pass:
        print("\n⚠️  Email credentials not configured!")
        print("Please edit backend/.env file and add:")
        print("  SMTP_USER=your-email@gmail.com")
        print("  SMTP_PASSWORD=your-app-password")
        return
    
    # Test email
    test_recipient = input("\nEnter test email address: ").strip()
    if not test_recipient:
        print("❌ No email provided")
        return
    
    try:
        result = await EmailSender.send_email(
            to=test_recipient,
            subject="🎉 Test Email from Pulse",
            html_body="<h1>Success!</h1><p>Your email sender is working correctly.</p>",
            text_body="Success! Your email sender is working correctly."
        )
        
        print(f"\n✅ Result: {result['message']}")
        print(f"Status: {result['status']}")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_email())
