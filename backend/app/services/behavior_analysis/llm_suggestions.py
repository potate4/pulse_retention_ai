"""
LLM-based Churn Risk Analysis
Analyzes transaction patterns to explain WHY a customer is at risk
"""
import os
import json
import requests
from typing import Dict, Optional, List
from sqlalchemy.orm import Session

from app.db.models.transaction import Transaction
from app.db.models.customer_segment import CustomerSegment
from app.db.models.behavior_analysis import BehaviorAnalysis


def generate_personalized_email(
    customer_id: str,
    organization_id: str,
    churn_probability: float,
    risk_level: str,
    db: Session
) -> Optional[Dict]:
    """
    Generate personalized retention email HTML based on customer data.

    Args:
        customer_id: External customer ID
        organization_id: Organization UUID
        churn_probability: Predicted churn probability (0-1)
        risk_level: Risk segment (Low/Medium/High/Critical)
        db: Database session

    Returns:
        Dict with 'subject', 'html_body' or None if fails
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    # Fetch customer's transactions
    transactions = db.query(Transaction).filter(
        Transaction.customer_id == customer_id
    ).order_by(Transaction.event_date.desc()).limit(10).all()

    # Fetch segment data
    segment = db.query(CustomerSegment).filter(
        CustomerSegment.customer_id == customer_id
    ).first()

    # Fetch behavior analysis
    behavior = db.query(BehaviorAnalysis).filter(
        BehaviorAnalysis.customer_id == customer_id
    ).first()

    # Build context
    segment_info = f"Segment: {segment.segment}, Risk: {segment.churn_risk_level}" if segment else "No segment data"

    behavior_context = ""
    if behavior:
        behavior_context = f"""
Customer Behavior:
- Score: {behavior.behavior_score}/100
- Activity Trend: {behavior.activity_trend}
- Risk Signals: {', '.join(behavior.risk_signals[:2]) if behavior.risk_signals else 'None'}
- Recommendations: {', '.join(behavior.recommendations[:2]) if behavior.recommendations else 'None'}
"""

    # Build LLM prompt
    prompt = f"""You are an email marketing specialist. Generate a personalized retention email for a customer with {churn_probability*100:.0f}% churn probability and {risk_level} risk.

CUSTOMER CONTEXT:
{segment_info}
{behavior_context}

TASK:
Create a warm, personalized retention email that:
1. Acknowledges their value as a customer
2. Addresses their specific situation (use the risk signals if available)
3. Offers specific incentive or value proposition
4. Includes a clear call-to-action button
5. Keeps a professional but friendly tone

EXAMPLE FORMAT TO FOLLOW:
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50;">Hello Valued Customer,</h2>
    <p>[Personalized opening based on their situation]</p>
    <p>[Acknowledge value and address concerns]</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">[Action Button Text]</a>
    </div>
    <p>[Closing with support offer]</p>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
        Best regards,<br>
        The Team
    </p>
</body>
</html>

Return JSON ONLY:
{{
  "subject": "Compelling subject line (under 50 chars)",
  "html_body": "Full HTML email as shown above"
}}"""

    try:
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
        result = response.json()
        content = result['choices'][0]['message']['content']
        return json.loads(content)
    except Exception as e:
        print(f"LLM email generation failed: {e}")
        return None


def analyze_churn_reason(
    customer_id: str,
    organization_id: str,
    churn_probability: float,
    risk_level: str,
    db: Session
) -> Optional[Dict]:
    """
    Analyze customer's transaction history and explain churn risk.

    Args:
        customer_id: External customer ID
        organization_id: Organization UUID
        churn_probability: Predicted churn probability (0-1)
        risk_level: Risk segment (Low/Medium/High/Critical)
        db: Database session

    Returns:
        Dict with 'analysis', 'key_patterns', 'retention_tips' or None if fails
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    # Fetch customer's transactions
    transactions = db.query(Transaction).filter(
        Transaction.customer_id == customer_id
    ).order_by(Transaction.event_date.desc()).limit(20).all()

    # Fetch segment data
    segment = db.query(CustomerSegment).filter(
        CustomerSegment.customer_id == customer_id
    ).first()

    # Fetch behavior analysis
    behavior = db.query(BehaviorAnalysis).filter(
        BehaviorAnalysis.customer_id == customer_id
    ).first()

    # Build transaction summary
    if transactions:
        transaction_summary = []
        for t in transactions:
            transaction_summary.append({
                'date': t.event_date.strftime('%Y-%m-%d'),
                'type': t.event_type or 'transaction',
                'amount': float(t.amount) if t.amount else 0
            })
        transactions_text = json.dumps(transaction_summary, indent=2)
    else:
        transactions_text = "No transaction history available"

    # Build context from segment
    segment_info = f"Segment: {segment.segment}, Churn Risk: {segment.churn_risk_level}" if segment else "No segment data"

    # Build context from behavior analysis
    behavior_info = ""
    if behavior:
        behavior_info = f"""
Behavior Score: {behavior.behavior_score}/100
Activity Trend: {behavior.activity_trend}
Value Trend: {behavior.value_trend}
Risk Signals: {', '.join(behavior.risk_signals[:3]) if behavior.risk_signals else 'None'}
Existing Recommendations: {', '.join(behavior.recommendations[:2]) if behavior.recommendations else 'None'}
"""
    else:
        behavior_info = "No behavior analysis available"

    # Build LLM prompt
    prompt = f"""You are a customer retention analyst. Analyze this customer's transaction history and explain WHY they have a {risk_level} churn risk with {churn_probability*100:.1f}% churn probability.

CUSTOMER DATA:
{segment_info}

{behavior_info}

TRANSACTION HISTORY (most recent 20):
{transactions_text}

TASK:
Analyze the transaction patterns and provide:
1. A clear explanation of WHY this customer is at risk (2-3 sentences analyzing their behavior patterns)
2. 3 key patterns you identified (e.g., "Declining transaction frequency", "Increasing gaps between purchases")
3. 2-3 brief retention recommendations based on the analysis

Return JSON ONLY:
{{
  "analysis": "Clear explanation of why customer is at risk based on transaction patterns...",
  "key_patterns": ["Pattern 1", "Pattern 2", "Pattern 3"],
  "retention_tips": ["Tip 1", "Tip 2", "Tip 3"]
}}"""

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "response_format": {"type": "json_object"}
            },
            timeout=15
        )
        result = response.json()
        content = result['choices'][0]['message']['content']
        return json.loads(content)
    except Exception as e:
        print(f"LLM analysis failed: {e}")
        return None
