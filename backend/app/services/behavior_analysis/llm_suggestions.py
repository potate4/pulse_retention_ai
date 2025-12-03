"""
LLM-based Retention Suggestion Generator
Generates personalized retention strategies for At Risk customers using OpenAI
"""
import os
import json
import requests
from typing import Dict, Optional


def generate_llm_suggestion(behavior_data: Dict, segment: str, org_type: str) -> Optional[Dict]:
    """
    Generate personalized retention suggestion using OpenAI GPT-4o-mini.

    Args:
        behavior_data: Dict containing behavior_score, trends, risk_signals, etc.
        segment: Customer segment (e.g., "At Risk")
        org_type: Organization type (banking, telecom, ecommerce)

    Returns:
        Dict with 'suggestion' and 'action_items' or None if API call fails
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    # Build prompt with customer context
    behavior_score = behavior_data.get('behavior_score', 0)
    activity_trend = behavior_data.get('activity_trend', 'unknown')
    value_trend = behavior_data.get('value_trend', 'unknown')
    risk_signals = behavior_data.get('risk_signals', [])

    prompt = f"""You are a {org_type} retention expert.

Customer: Segment={segment}, Score={behavior_score}/100
Trends: Activity={activity_trend}, Value={value_trend}
Risks: {', '.join(risk_signals[:3])}

Generate 2-sentence retention strategy and 3 action items.
Return JSON ONLY: {{"suggestion": "...", "action_items": ["...", "...", "..."]}}"""

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
            timeout=10
        )
        result = response.json()
        content = result['choices'][0]['message']['content']
        # Parse JSON from response
        return json.loads(content)
    except Exception:
        # Fail silently - don't break the analysis flow
        return None
