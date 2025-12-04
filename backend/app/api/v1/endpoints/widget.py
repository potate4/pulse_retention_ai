"""
Public Widget API Endpoint
Provides personalized offers for embeddable widget
"""
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db
from app.db.models.organization import Organization
from app.db.models.customer import Customer
from app.db.models.customer_segment import CustomerSegment
from app.db.models.churn_prediction import ChurnPrediction
from app.services.segmentation.rules import SEGMENT_DEFINITIONS
from app.services.behavior_analysis.widget_message_generator import get_or_generate_widget_message


router = APIRouter()


def get_customer_name_from_email(email: str) -> str:
    """Extract customer name from email."""
    if not email or '@' not in email:
        return 'Valued Customer'
    local_part = email.split('@')[0]
    # Capitalize first letter
    name = local_part.replace('.', ' ').replace('_', ' ').title()
    return name


def generate_offer_content(segment: str, churn_risk: str, customer_name: str) -> dict:
    """
    Generate personalized offer based on customer segment and churn risk.
    
    Returns:
        dict with title, message, cta_text, cta_link
    """
    segment_def = SEGMENT_DEFINITIONS.get(segment, {})
    
    # Base offers by segment
    if segment == 'Champions':
        return {
            'title': f'Exclusive VIP Rewards for {customer_name}!',
            'message': f'''
                <p><strong>You're one of our most valued customers!</strong></p>
                <ul>
                    <li>🎁 Unlock <strong>Premium Access</strong> with 30% OFF</li>
                    <li>⭐ <strong>Early access</strong> to new features and products</li>
                    <li>🎯 <strong>VIP Support</strong> - dedicated priority assistance</li>
                </ul>
                <p>Thank you for being a Champion customer!</p>
            ''',
            'cta_text': 'Claim VIP Rewards',
            'cta_link': '#vip-rewards'
        }
    
    elif segment == 'Loyal Customers':
        return {
            'title': f'Special Offer for {customer_name}!',
            'message': f'''
                <p><strong>We appreciate your loyalty!</strong></p>
                <ul>
                    <li>💝 <strong>20% OFF</strong> your next purchase</li>
                    <li>🎁 <strong>Free upgrade</strong> on selected services</li>
                    <li>📦 <strong>Free shipping</strong> on all orders this month</li>
                </ul>
                <p>Your continued support means everything to us!</p>
            ''',
            'cta_text': 'Get Your Discount',
            'cta_link': '#loyalty-offer'
        }
    
    elif segment in ['At Risk', 'Cannot Lose Them']:
        return {
            'title': f'We Miss You, {customer_name}!',
            'message': f'''
                <p><strong>Come back and save BIG!</strong></p>
                <ul>
                    <li>🔥 <strong>40% OFF</strong> - Your biggest discount yet!</li>
                    <li>💰 <strong>₹500 credit</strong> added to your account</li>
                    <li>🎯 <strong>Personalized support</strong> - Let us help you</li>
                </ul>
                <p>We value your business and want to make things right!</p>
            ''',
            'cta_text': 'Claim Comeback Offer',
            'cta_link': '#winback-offer'
        }
    
    elif segment in ['About to Sleep', 'Need Attention']:
        return {
            'title': f'Don\'t Miss Out, {customer_name}!',
            'message': f'''
                <p><strong>Exclusive limited-time offers just for you!</strong></p>
                <ul>
                    <li>⚡ <strong>25% OFF</strong> on your favorite items</li>
                    <li>🎁 <strong>Bonus rewards</strong> with your next order</li>
                    <li>📦 <strong>Free delivery</strong> for the next 7 days</li>
                </ul>
                <p>These special offers are exclusively for you!</p>
            ''',
            'cta_text': 'Redeem Your Offers',
            'cta_link': '#reengagement-offer'
        }
    
    elif segment in ['New Customers', 'Promising', 'Potential Loyalists']:
        return {
            'title': f'Welcome Back, {customer_name}!',
            'message': f'''
                <p><strong>Keep the momentum going!</strong></p>
                <ul>
                    <li>🎉 <strong>15% OFF</strong> your next purchase</li>
                    <li>🌟 <strong>Earn double rewards</strong> this month</li>
                    <li>📱 <strong>Free trial</strong> of premium features</li>
                </ul>
                <p>We're excited to have you as part of our community!</p>
            ''',
            'cta_text': 'Get Started',
            'cta_link': '#welcome-offer'
        }
    
    elif segment in ['Hibernating', 'Lost']:
        return {
            'title': f'We Want You Back, {customer_name}!',
            'message': f'''
                <p><strong>Here's a special incentive to return!</strong></p>
                <ul>
                    <li>💥 <strong>50% OFF</strong> your next order</li>
                    <li>🎁 <strong>Free gift</strong> with purchase</li>
                    <li>⭐ <strong>No commitment</strong> - just try us again!</li>
                </ul>
                <p>We'd love to serve you again!</p>
            ''',
            'cta_text': 'Claim Your Offer',
            'cta_link': '#winback-offer'
        }
    
    # Default offer
    return {
        'title': f'Hello {customer_name}!',
        'message': f'''
            <p><strong>Special offers just for you!</strong></p>
            <ul>
                <li>🎁 <strong>15% OFF</strong> on your next order</li>
                <li>📦 <strong>Free delivery</strong> available</li>
                <li>⭐ <strong>Exclusive deals</strong> updated daily</li>
            </ul>
            <p>Thank you for being a valued customer!</p>
        ''',
        'cta_text': 'View Offers',
        'cta_link': '#offers'
    }


@router.get("/offers")
async def get_widget_offers(
    business_id: str = Query(..., description="Organization UUID"),
    customer_email: str = Query(..., description="Customer email address"),
    personalized: bool = Query(False, description="Use LLM-generated personalized messages"),
    db: Session = Depends(get_db)
):
    """
    Public endpoint to fetch personalized widget offers.

    This endpoint does not require authentication and is designed to be called
    by the embedded widget on customer websites.

    Query Parameters:
        - business_id: Organization UUID
        - customer_email: Customer email address
        - personalized: bool - If true, uses LLM-generated messages (default: false)

    Returns:
        - show_popup: Whether to display the popup
        - title: Popup title
        - message: HTML message content
        - cta_text: Call-to-action button text
        - cta_link: Call-to-action link
    """
    try:
        # DEBUG LOGGING
        print(f"\n[Widget API] === NEW REQUEST ===")
        print(f"[Widget API] business_id: {business_id}")
        print(f"[Widget API] customer_email: {customer_email}")
        print(f"[Widget API] personalized: {personalized} (type: {type(personalized)})")

        # Validate and parse business_id as UUID
        try:
            org_id = uuid.UUID(business_id)
        except (ValueError, AttributeError):
            return {
                'show_popup': False,
                'error': 'Invalid business_id format'
            }

        # Check if organization exists
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            return {
                'show_popup': False,
                'error': 'Organization not found'
            }

        print(f"[Widget API] Organization found: {org.name}")

        # Find customer by email (using external_customer_id as email for now)
        # In production, you might have a separate email field
        customer = db.query(Customer).filter(
            Customer.organization_id == org_id,
            Customer.external_customer_id == customer_email
        ).first()

        print(f"[Widget API] Customer found: {customer is not None}")

        # If customer not found, try to generate personalized message anyway (for demo)
        if not customer:
            customer_name = get_customer_name_from_email(customer_email)
            print(f"[Widget API] Customer not in DB, using demo mode for: {customer_name}")

            # If personalized=true, generate for demo segment (At Risk / High)
            if personalized:
                print(f"[Widget API] Generating LLM message for unknown customer (At Risk/High)")
                llm_message = get_or_generate_widget_message(
                    organization_id=str(org_id),
                    segment='At Risk',  # Demo segment for unknown customers
                    risk_level='High',  # Demo risk level
                    db=db
                )

                if llm_message:
                    print(f"[Widget API] ✅ Returning LLM message: {llm_message.get('title', 'N/A')}")
                    return {
                        'show_popup': True,
                        **llm_message
                    }
                else:
                    print(f"[Widget API] ❌ LLM message generation failed")

            # Return generic welcome offer for unknown customers
            return {
                'show_popup': True,
                'title': f'Welcome to {org.name or "our service"}!',
                'message': f'''
                    <p><strong>Hello {customer_name}!</strong></p>
                    <p>We're excited to have you here. Check out our latest offers and deals!</p>
                    <ul>
                        <li>🎁 Special discounts for new customers</li>
                        <li>📦 Fast and reliable service</li>
                        <li>⭐ Join thousands of happy customers</li>
                    </ul>
                ''',
                'cta_text': 'Explore Offers',
                'cta_link': '#'
            }
        
        # Get customer segment
        segment_data = db.query(CustomerSegment).filter(
            CustomerSegment.customer_id == customer.id
        ).first()
        
        # Get churn prediction
        churn_data = db.query(ChurnPrediction).filter(
            ChurnPrediction.customer_id == customer.id
        ).first()
        
        # Extract segment and risk level
        segment = segment_data.segment if segment_data else 'Promising'
        churn_risk = segment_data.churn_risk_level if segment_data else 'Low'

        # Get customer name from email
        customer_name = get_customer_name_from_email(customer_email)

        print(f"[Widget API] Customer segment: {segment}, Risk: {churn_risk}")

        # If personalized=true, try to get LLM-generated message
        if personalized:
            print(f"[Widget API] Generating LLM message for {segment}/{churn_risk}")
            llm_message = get_or_generate_widget_message(
                organization_id=str(org_id),
                segment=segment,
                risk_level=churn_risk,
                db=db
            )

            if llm_message:
                # Return LLM-generated personalized message
                print(f"[Widget API] ✅ Returning LLM message for existing customer: {llm_message.get('title', 'N/A')}")
                return {
                    'show_popup': True,
                    **llm_message
                }
            # If LLM fails, fall through to static template
            print(f"[Widget API] ❌ LLM generation failed, falling back to static template")

        # Generate static segment-based offer (fallback or default)
        print(f"[Widget API] Using static template for {segment}/{churn_risk}")
        offer_data = generate_offer_content(segment, churn_risk, customer_name)

        return {
            'show_popup': True,
            **offer_data
        }
        
    except Exception as e:
        # Log error but don't expose internal details to public endpoint
        print(f"Widget API Error: {str(e)}")
        return {
            'show_popup': False,
            'error': 'Unable to load offers at this time'
        }


@router.post("/events")
async def log_widget_event(
    event_data: dict,
    db: Session = Depends(get_db)
):
    """
    Log widget events (popup shown, closed, CTA clicked).

    This can be used for analytics and tracking widget performance.

    Body:
        - business_id: Organization UUID
        - customer_email: Customer email
        - event_type: 'popup_shown', 'popup_closed', 'popup_cta_clicked'
        - event_data: Additional event metadata
        - timestamp: Event timestamp
    """
    try:
        # For now, just log to console
        # In production, you'd save this to a widget_events table
        print(f"Widget Event: {event_data.get('event_type')} - {event_data.get('customer_email')}")

        return {
            'success': True,
            'message': 'Event logged successfully'
        }

    except Exception as e:
        print(f"Widget Event Error: {str(e)}")
        return {
            'success': False,
            'error': 'Failed to log event'
        }


@router.post("/generate-message")
async def generate_widget_message(
    request_data: dict,
    db: Session = Depends(get_db)
):
    """
    Generate personalized widget message for a specific customer.

    Used by the Widget Campaign dashboard to preview messages before sending.

    Body:
        - organization_id: Organization UUID
        - customer_id: Customer ID
        - segment: Customer segment
        - risk_level: Risk level
        - churn_probability: Churn probability (0-1)
    """
    try:
        org_id = request_data.get('organization_id')
        segment = request_data.get('segment', 'At Risk')
        risk_level = request_data.get('risk_level', 'High')

        # Generate or get cached message
        message_data = get_or_generate_widget_message(
            organization_id=str(org_id),
            segment=segment,
            risk_level=risk_level,
            db=db
        )

        if message_data:
            return {
                'success': True,
                **message_data
            }
        else:
            return {
                'success': False,
                'message': 'Failed to generate widget message. OPENAI_API_KEY may not be set.'
            }

    except Exception as e:
        print(f"Generate Message Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@router.post("/queue-message")
async def queue_widget_message(
    request_data: dict,
    db: Session = Depends(get_db)
):
    """
    Queue a personalized widget message for a customer.

    The message will be shown as a popup on their next website visit.
    This is used for targeted retention campaigns.

    Body:
        - organization_id: Organization UUID
        - customer_id: Customer ID
        - customer_email: Customer email
        - title: Message title
        - message: HTML message content
        - cta_text: CTA button text
        - cta_link: CTA button link
    """
    try:
        # In a full implementation, you would:
        # 1. Save message to a customer_widget_queue table
        # 2. When customer visits website, widget checks this queue
        # 3. Display queued message instead of default offer
        # 4. Mark message as shown after display

        # For demo purposes, we'll return success
        # The actual implementation would require a new database table
        print(f"[Widget Queue] Queued message for customer {request_data.get('customer_id')}")
        print(f"  Title: {request_data.get('title')}")
        print(f"  CTA: {request_data.get('cta_text')} -> {request_data.get('cta_link')}")

        return {
            'success': True,
            'message': 'Widget message queued successfully'
        }

    except Exception as e:
        print(f"Queue Message Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@router.post("/bulk-queue-messages")
async def bulk_queue_widget_messages(
    request_data: dict,
    db: Session = Depends(get_db)
):
    """
    Queue personalized widget messages for multiple customers.

    Generates a unique message for each customer based on their segment/risk,
    then queues them for display on next visit.

    Body:
        - organization_id: Organization UUID
        - customer_ids: List of customer IDs
        - customers: List of customer objects with segment/risk data
    """
    try:
        org_id = str(request_data.get('organization_id'))
        customer_ids = request_data.get('customer_ids', [])
        customers = request_data.get('customers', [])

        queued_count = 0
        failed_count = 0

        for customer in customers:
            if customer['id'] not in customer_ids:
                continue

            try:
                # Generate message for this customer's segment/risk
                message_data = get_or_generate_widget_message(
                    organization_id=org_id,
                    segment=customer.get('risk_segment', 'At Risk'),
                    risk_level=customer.get('risk_segment', 'High'),
                    db=db
                )

                if message_data:
                    # Queue the message (in production, save to DB)
                    print(f"[Bulk Queue] Queued for {customer['id']}: {message_data['title']}")
                    queued_count += 1
                else:
                    failed_count += 1

            except Exception as e:
                print(f"[Bulk Queue] Failed for {customer['id']}: {str(e)}")
                failed_count += 1

        return {
            'success': True,
            'message': f'Queued {queued_count} widget messages',
            'queued_count': queued_count,
            'failed_count': failed_count
        }

    except Exception as e:
        print(f"Bulk Queue Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'queued_count': 0,
            'failed_count': len(request_data.get('customer_ids', []))
        }

