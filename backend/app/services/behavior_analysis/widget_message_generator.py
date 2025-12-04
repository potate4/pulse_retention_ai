"""
Widget Message Generator Service
Generates personalized widget messages using LLM based on customer segment and risk level
"""
import os
import json
import requests
from typing import Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.db.models.customer_segment import CustomerSegment
from app.db.models.widget_message_cache import WidgetMessageCache
from app.services.segmentation.rules import SEGMENT_DEFINITIONS


def get_segment_description(segment: str) -> str:
    """Get human-readable description of a customer segment."""
    segment_def = SEGMENT_DEFINITIONS.get(segment, {})
    return segment_def.get('description', 'No description available')


def get_retention_strategy(segment: str, risk_level: str) -> str:
    """Get retention strategy based on segment and risk level."""
    strategies = {
        'Champions': 'Reward loyalty with exclusive VIP perks and early access',
        'Loyal Customers': 'Nurture relationship with appreciation and special offers',
        'Potential Loyalists': 'Build affinity with engagement incentives and benefits',
        'New Customers': 'Onboard with welcome offers and product education',
        'Promising': 'Increase awareness with targeted campaigns and value propositions',
        'Need Attention': 'Re-engage with personalized offers and reminders',
        'About to Sleep': 'Win-back with urgency-driven limited-time offers',
        'At Risk': 'Urgent retention with significant incentives and personal touch',
        'Cannot Lose Them': 'VIP treatment with maximum value offers and priority support',
        'Hibernating': 'Last-chance aggressive discounts and compelling value',
        'Lost': 'Win-back with breakthrough offers and fresh start messaging',
    }

    base_strategy = strategies.get(segment, 'Generic retention approach')

    # Add urgency for high-risk customers
    if risk_level in ['High', 'Critical']:
        base_strategy += ' (emphasize urgency and scarcity)'

    return base_strategy


def generate_llm_widget_message(
    segment: str,
    risk_level: str,
    organization_id: str
) -> Optional[Dict]:
    """
    Generate personalized widget message using OpenAI's LLM.

    Args:
        segment: Customer segment (e.g., "Champions", "At Risk")
        risk_level: Churn risk level (Low/Medium/High/Critical)
        organization_id: Organization UUID (for context)

    Returns:
        Dict with 'title', 'message', 'cta_text', 'cta_link' or None if fails
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[Widget Message Generator] OPENAI_API_KEY not set")
        return None

    # Get segment context
    segment_desc = get_segment_description(segment)
    retention_strategy = get_retention_strategy(segment, risk_level)

    # Construct prompt
    prompt = f"""You are a conversion optimization specialist. Generate a personalized widget popup message for customers in the "{segment}" segment with "{risk_level}" churn risk.

SEGMENT CONTEXT:
- Segment: {segment}
- Risk Level: {risk_level}
- Typical Behavior: {segment_desc}
- Retention Strategy: {retention_strategy}

TASK:
Create a concise, compelling widget popup that:
1. Title: 20-30 characters, attention-grabbing and personalized
2. Message: 150-200 characters HTML snippet with specific incentive/offer (use <strong>, <ul>, <li> for formatting)
3. CTA Text: 3-5 words, action-oriented (e.g., "Claim Offer Now", "Get My Discount", "Unlock Deal")
4. CTA Link: Dynamic offer page path based on segment

Link Guidelines by Segment:
- Champions/Loyal Customers: Premium offers (e.g., "/offers/vip", "/deals/premium")
- At Risk/Cannot Lose Them: Win-back campaigns (e.g., "/offers/comeback", "/offers/winback")
- About to Sleep/Need Attention: Re-engagement (e.g., "/offers/exclusive", "/deals/limited")
- New Customers/Promising/Potential Loyalists: Welcome offers (e.g., "/offers/welcome", "/deals/starter")
- Hibernating/Lost: Aggressive win-back (e.g., "/offers/bigdeal", "/deals/returner")

IMPORTANT:
- Keep tone friendly but urgent for High/Critical risk customers
- Use specific numbers/percentages for discounts (e.g., "30% OFF", "₹500 credit")
- Message should be concise and scannable
- Include emoji or visual elements in message if appropriate

Return ONLY valid JSON in this exact format:
{{"title": "...", "message": "...", "cta_text": "...", "cta_link": "..."}}"""

    try:
        # Call OpenAI API
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.8,
                "response_format": {"type": "json_object"}
            },
            timeout=20
        )

        if response.status_code != 200:
            print(f"[Widget Message Generator] OpenAI API error: {response.status_code}")
            return None

        result = response.json()
        content = result['choices'][0]['message']['content']
        message_data = json.loads(content)

        # Validate response structure
        required_keys = ['title', 'message', 'cta_text', 'cta_link']
        if not all(key in message_data for key in required_keys):
            print(f"[Widget Message Generator] Invalid response structure: {message_data}")
            return None

        print(f"[Widget Message Generator] Generated message for {segment}/{risk_level}")
        return message_data

    except Exception as e:
        print(f"[Widget Message Generator] Error: {str(e)}")
        return None


def get_or_generate_widget_message(
    organization_id: str,
    segment: str,
    risk_level: str,
    db: Session
) -> Optional[Dict]:
    """
    Get cached widget message or generate new one if expired/missing.

    Uses 7-day caching strategy per (org_id, segment, risk_level) combination.

    Args:
        organization_id: Organization UUID
        segment: Customer segment
        risk_level: Churn risk level
        db: Database session

    Returns:
        Dict with 'title', 'message', 'cta_text', 'cta_link' or None
    """
    # Query cache
    cache_entry = db.query(WidgetMessageCache).filter(
        WidgetMessageCache.organization_id == organization_id,
        WidgetMessageCache.segment == segment,
        WidgetMessageCache.risk_level == risk_level
    ).first()

    # Check if cache is valid
    if cache_entry and not cache_entry.is_expired():
        print(f"[Widget Message Cache] HIT for {segment}/{risk_level}")
        return {
            'title': cache_entry.title,
            'message': cache_entry.message,
            'cta_text': cache_entry.cta_text,
            'cta_link': cache_entry.cta_link
        }

    # Cache miss or expired - generate new message
    print(f"[Widget Message Cache] MISS for {segment}/{risk_level} - generating...")
    message_data = generate_llm_widget_message(segment, risk_level, organization_id)

    if not message_data:
        return None

    # Save to cache
    try:
        if cache_entry:
            # Update existing entry
            cache_entry.title = message_data['title']
            cache_entry.message = message_data['message']
            cache_entry.cta_text = message_data['cta_text']
            cache_entry.cta_link = message_data['cta_link']
            cache_entry.generated_at = datetime.utcnow()
            cache_entry.expires_at = datetime.utcnow() + timedelta(days=7)
        else:
            # Create new entry
            cache_entry = WidgetMessageCache(
                organization_id=organization_id,
                segment=segment,
                risk_level=risk_level,
                title=message_data['title'],
                message=message_data['message'],
                cta_text=message_data['cta_text'],
                cta_link=message_data['cta_link'],
                generated_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.add(cache_entry)

        db.commit()
        print(f"[Widget Message Cache] Saved for {segment}/{risk_level}")
        return message_data

    except Exception as e:
        db.rollback()
        print(f"[Widget Message Cache] Failed to save: {str(e)}")
        # Return generated message even if caching fails
        return message_data
