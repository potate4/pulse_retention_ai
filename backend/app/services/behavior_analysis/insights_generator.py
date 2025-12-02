"""
Insights and Recommendations Generator
Maps risk signals to actionable retention recommendations
"""
from typing import List, Dict


# Industry-specific recommendation mappings
BANKING_RECOMMENDATIONS = {
    'login_frequency_decline': 'Send re-engagement email highlighting new mobile app features',
    'transaction_volume_drop': 'Reach out to understand if customer needs have changed',
    'feature_abandonment': 'Provide tutorials or webinars on abandoned features (bill pay, transfers)',
    'balance_checking_without_action': 'Offer personalized financial advice or incentives to increase transactions',
    'single_product_usage': 'Cross-sell additional banking products (credit card, savings account)',
    'support_contact_spike': 'Proactive customer success outreach to resolve ongoing issues',
    'no_transaction_history': 'Initiate onboarding campaign to educate on product features'
}

TELECOM_RECOMMENDATIONS = {
    'data_usage_decline': 'Investigate if customer is experiencing service issues or exploring competitors',
    'communication_pattern_change': 'Check for network quality issues, offer loyalty incentives',
    'plan_underutilization': 'Recommend downgrade to better-fitting plan to prevent overpaying',
    'billing_complaints': 'Urgent customer service intervention, review billing accuracy',
    'frequent_roaming': 'Customer may be testing competitor networks - offer retention deals',
    'payment_delays': 'Payment plan options, investigate financial difficulty',
    'no_usage_history': 'Verify account activation status, send activation reminder'
}

ECOMMERCE_RECOMMENDATIONS = {
    'high_cart_abandonment': 'Send abandoned cart email with incentive (discount, free shipping)',
    'category_shift': 'Analyze if shift is to lower-margin products, adjust marketing strategy',
    'discount_dependency': 'Gradually reduce discount frequency, emphasize product quality/value',
    'basket_size_decline': 'Bundle offers to increase average order value',
    'low_browse_to_buy': 'Improve product pages, add reviews, offer live chat support',
    'high_return_rate': 'Investigate product quality issues, improve product descriptions',
    'no_purchase_history': 'Welcome email series with first-purchase incentive'
}

# General recommendations (apply to all industries)
GENERAL_RECOMMENDATIONS = {
    'no_transaction_history': 'Review customer onboarding and activation process',
    'no_usage_history': 'Check account status and send engagement reminder',
    'no_purchase_history': 'Initiate welcome campaign with first-purchase offer'
}


def generate_recommendations(risk_signals: List[str], org_type: str) -> List[str]:
    """
    Generate actionable recommendations based on risk signals and org type.

    Args:
        risk_signals: List of detected risk signal identifiers
        org_type: Organization type ('banking', 'telecom', 'ecommerce')

    Returns:
        List of recommendation strings
    """
    if not risk_signals:
        return ['Customer behavior is healthy - continue monitoring']

    # Select appropriate recommendation mapping
    if org_type == 'banking':
        recommendations_map = BANKING_RECOMMENDATIONS
    elif org_type == 'telecom':
        recommendations_map = TELECOM_RECOMMENDATIONS
    elif org_type == 'ecommerce':
        recommendations_map = ECOMMERCE_RECOMMENDATIONS
    else:
        recommendations_map = {}

    recommendations = []

    for signal in risk_signals:
        # Check industry-specific recommendations first
        if signal in recommendations_map:
            recommendations.append(recommendations_map[signal])
        # Fall back to general recommendations
        elif signal in GENERAL_RECOMMENDATIONS:
            recommendations.append(GENERAL_RECOMMENDATIONS[signal])
        else:
            # Generic fallback
            recommendations.append(f'Investigate customer behavior pattern: {signal}')

    # Remove duplicates while preserving order
    seen = set()
    unique_recommendations = []
    for rec in recommendations:
        if rec not in seen:
            seen.add(rec)
            unique_recommendations.append(rec)

    return unique_recommendations


def get_priority_signal(risk_signals: List[str]) -> str:
    """
    Identify the highest priority risk signal for escalation.

    Args:
        risk_signals: List of detected risk signals

    Returns:
        Priority signal name
    """
    # Define priority ordering (highest to lowest)
    priority_order = [
        # Critical signals
        'payment_delays',
        'frequent_roaming',
        'billing_complaints',
        'support_contact_spike',

        # High-risk behavior signals
        'high_return_rate',
        'high_cart_abandonment',
        'transaction_volume_drop',
        'data_usage_decline',
        'communication_pattern_change',

        # Medium-risk signals
        'basket_size_decline',
        'feature_abandonment',
        'login_frequency_decline',
        'category_shift',
        'discount_dependency',

        # Low-risk signals
        'low_browse_to_buy',
        'balance_checking_without_action',
        'single_product_usage',
        'plan_underutilization',

        # Default
        'no_transaction_history',
        'no_usage_history',
        'no_purchase_history'
    ]

    # Return first matching signal from priority order
    for priority_signal in priority_order:
        if priority_signal in risk_signals:
            return priority_signal

    # If no match, return first signal
    return risk_signals[0] if risk_signals else 'none'


def get_action_urgency(risk_signals: List[str]) -> str:
    """
    Determine action urgency based on risk signals.

    Args:
        risk_signals: List of detected risk signals

    Returns:
        Urgency level: 'critical', 'high', 'medium', 'low'
    """
    critical_signals = [
        'payment_delays', 'frequent_roaming', 'billing_complaints',
        'support_contact_spike', 'high_return_rate'
    ]

    high_signals = [
        'high_cart_abandonment', 'transaction_volume_drop',
        'data_usage_decline', 'communication_pattern_change'
    ]

    medium_signals = [
        'basket_size_decline', 'feature_abandonment',
        'login_frequency_decline', 'category_shift', 'discount_dependency'
    ]

    # Check for critical signals
    if any(signal in critical_signals for signal in risk_signals):
        return 'critical'

    # Check for high-priority signals
    if any(signal in high_signals for signal in risk_signals):
        return 'high'

    # Check for medium-priority signals
    if any(signal in medium_signals for signal in risk_signals):
        return 'medium'

    return 'low'
