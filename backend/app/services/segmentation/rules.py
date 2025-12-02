"""
Segmentation Rules Engine
Defines 11 industry-standard customer segments and assignment logic
"""
from typing import Dict, Literal, Tuple


# Segment definitions with descriptions and recommended actions
SEGMENT_DEFINITIONS = {
    'Champions': {
        'description': 'Best customers: frequent buyers, recent activity, high spend, low churn risk',
        'action': 'Reward with loyalty programs, upsell premium features, ask for referrals'
    },
    'Loyal Customers': {
        'description': 'Regular customers with consistent engagement and low churn risk',
        'action': 'Nurture relationship, cross-sell complementary products'
    },
    'Potential Loyalists': {
        'description': 'Recent customers showing promise but not yet established',
        'action': 'Engage with targeted offers, build brand affinity'
    },
    'New Customers': {
        'description': 'Recent first-time customers with limited history',
        'action': 'Onboarding campaigns, education, early engagement'
    },
    'Promising': {
        'description': 'Recent shoppers who have not bought much yet',
        'action': 'Create brand awareness, offer free trials or samples'
    },
    'Need Attention': {
        'description': 'Average customers showing signs of disengagement',
        'action': 'Re-engagement campaigns, personalized offers'
    },
    'About to Sleep': {
        'description': 'Declining engagement, have not purchased recently',
        'action': 'Win-back campaigns, special limited-time offers'
    },
    'At Risk': {
        'description': 'Were good customers, now inactive with high churn risk',
        'action': 'Urgent retention efforts, understand pain points'
    },
    'Cannot Lose Them': {
        'description': 'High-value customers who have not engaged recently - critical churn risk',
        'action': 'Personal outreach, VIP treatment, executive engagement'
    },
    'Hibernating': {
        'description': 'Long-inactive customers with low value',
        'action': 'Last-chance campaigns, surveys to understand departure'
    },
    'Lost': {
        'description': 'Churned or near-churned customers',
        'action': 'Aggressive win-back or move to cold list'
    }
}


def assign_segment(
    recency_category: Literal['High', 'Medium', 'Low'],
    frequency_category: Literal['High', 'Medium', 'Low'],
    monetary_category: Literal['High', 'Medium', 'Low'],
    engagement_category: Literal['High', 'Medium', 'Low'],
    churn_risk: Literal['Low', 'Medium', 'High', 'Critical']
) -> str:
    """
    Assign customer segment based on RFM categories and churn risk.
    Uses decision tree logic to map to one of 11 segments.

    Args:
        recency_category: Recency category ('High', 'Medium', 'Low')
        frequency_category: Frequency category ('High', 'Medium', 'Low')
        monetary_category: Monetary category ('High', 'Medium', 'Low')
        engagement_category: Engagement category ('High', 'Medium', 'Low')
        churn_risk: Churn risk level ('Low', 'Medium', 'High', 'Critical')

    Returns:
        Segment name (one of 11 segments)
    """
    R = recency_category
    F = frequency_category
    M = monetary_category
    E = engagement_category
    risk = churn_risk

    # Champions: High across the board, low churn risk
    if R == 'High' and F == 'High' and M == 'High' and E == 'High' and risk == 'Low':
        return 'Champions'

    # Loyal Customers: High engagement and frequency, low-medium churn risk
    if (R in ['High', 'Medium'] and F == 'High' and M in ['High', 'Medium'] and
        E == 'High' and risk in ['Low', 'Medium']):
        return 'Loyal Customers'

    # Cannot Lose Them: High value but critical churn risk
    if (F == 'High' and M == 'High' and risk == 'Critical'):
        return 'Cannot Lose Them'

    # At Risk: Were good customers, now high churn risk
    if (F in ['High', 'Medium'] and M in ['High', 'Medium'] and risk in ['High', 'Critical']):
        return 'At Risk'

    # Potential Loyalists: High recency, medium frequency/monetary, low-medium risk
    if (R == 'High' and F in ['Medium', 'High'] and M == 'Medium' and
        risk in ['Low', 'Medium']):
        return 'Potential Loyalists'

    # New Customers: High recency, low frequency/monetary
    if (R == 'High' and F == 'Low' and M == 'Low' and risk in ['Low', 'Medium']):
        return 'New Customers'

    # Promising: Recent activity but low engagement
    if (R in ['High', 'Medium'] and F == 'Low' and M in ['Low', 'Medium'] and
        risk in ['Low', 'Medium']):
        return 'Promising'

    # Need Attention: Average across metrics, medium-high risk
    if (R == 'Medium' and F == 'Medium' and M == 'Medium' and
        risk in ['Medium', 'High']):
        return 'Need Attention'

    # About to Sleep: Low recency, but some history
    if (R == 'Low' and F in ['Medium', 'High'] and M in ['Medium', 'High'] and
        risk in ['High', 'Critical']):
        return 'About to Sleep'

    # Hibernating: Low activity, not high value
    if (R == 'Low' and F == 'Low' and M in ['Medium', 'Low'] and
        risk in ['High', 'Critical']):
        return 'Hibernating'

    # Lost: Low across the board
    if (R == 'Low' and F == 'Low' and M == 'Low' and risk == 'Critical'):
        return 'Lost'

    # Default fallback based on churn risk
    if risk == 'Critical':
        return 'At Risk'
    elif risk == 'High':
        return 'Need Attention'
    elif R == 'High':
        return 'Promising'
    else:
        return 'Hibernating'


def get_segment_metadata(segment: str) -> Dict[str, str]:
    """
    Get metadata for a given segment.

    Args:
        segment: Segment name

    Returns:
        Dictionary with description and recommended action
    """
    return SEGMENT_DEFINITIONS.get(segment, {
        'description': 'Unknown segment',
        'action': 'Review customer profile'
    })
