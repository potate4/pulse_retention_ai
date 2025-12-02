"""
Banking Industry Behavior Analyzer
Analyzes transactional feature usage patterns for banking customers
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime, timedelta


def analyze_banking_behavior(timeline: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze banking customer behavior patterns.

    Key patterns tracked:
    - Login frequency decline
    - Transaction volume drop
    - Feature abandonment (bill pay, transfers, mobile deposit)
    - Balance checking without action
    - Cross-product usage
    - Support contact spike

    Args:
        timeline: DataFrame with event_date, event_type, amount, metadata

    Returns:
        Dictionary with trends, risk signals, and industry metrics
    """
    if len(timeline) == 0:
        return {
            'activity_trend': 'unknown',
            'value_trend': 'unknown',
            'engagement_trend': 'unknown',
            'engagement_level': 0,
            'risk_signals': ['no_transaction_history'],
            'industry_metrics': {}
        }

    risk_signals = []
    industry_metrics = {}

    # Define time periods
    now = datetime.now()
    last_7_days = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)
    last_90_days = now - timedelta(days=90)

    # Convert event_date to datetime if not already
    timeline['event_date'] = pd.to_datetime(timeline['event_date'])

    # 1. Login Frequency Analysis
    login_events = timeline[timeline['event_type'] == 'login']
    if len(login_events) > 0:
        logins_last_7 = len(login_events[login_events['event_date'] >= last_7_days])
        logins_prev_7 = len(login_events[(login_events['event_date'] >= last_7_days - timedelta(days=7)) &
                                          (login_events['event_date'] < last_7_days)])

        industry_metrics['logins_last_7_days'] = logins_last_7
        industry_metrics['logins_prev_7_days'] = logins_prev_7

        # Detect login decline
        if logins_prev_7 > 0 and logins_last_7 < logins_prev_7 * 0.5:
            risk_signals.append('login_frequency_decline')

    # 2. Transaction Volume Analysis
    transaction_events = timeline[timeline['event_type'].isin(['transaction', 'transfer', 'bill_pay'])]
    if len(transaction_events) > 0:
        txns_last_30 = len(transaction_events[transaction_events['event_date'] >= last_30_days])
        txns_prev_30 = len(transaction_events[(transaction_events['event_date'] >= last_30_days - timedelta(days=30)) &
                                               (transaction_events['event_date'] < last_30_days)])

        industry_metrics['transactions_last_30_days'] = txns_last_30
        industry_metrics['transactions_prev_30_days'] = txns_prev_30

        # Detect transaction drop
        if txns_prev_30 > 0 and txns_last_30 < txns_prev_30 * 0.5:
            risk_signals.append('transaction_volume_drop')

    # 3. Feature Usage Analysis
    feature_types = ['bill_pay', 'transfer', 'mobile_deposit']
    features_used_last_30 = timeline[
        (timeline['event_date'] >= last_30_days) &
        (timeline['event_type'].isin(feature_types))
    ]['event_type'].nunique()

    features_used_prev_30 = timeline[
        (timeline['event_date'] >= last_30_days - timedelta(days=30)) &
        (timeline['event_date'] < last_30_days) &
        (timeline['event_type'].isin(feature_types))
    ]['event_type'].nunique()

    industry_metrics['features_used_last_30_days'] = features_used_last_30
    industry_metrics['features_used_prev_30_days'] = features_used_prev_30

    # Detect feature abandonment
    if features_used_prev_30 > features_used_last_30:
        risk_signals.append('feature_abandonment')

    # 4. Balance Check Analysis (view-only behavior)
    balance_checks = timeline[timeline['event_type'] == 'balance_check']
    transactions_post_check = 0
    if len(balance_checks) > 0:
        recent_balance_checks = len(balance_checks[balance_checks['event_date'] >= last_30_days])
        industry_metrics['balance_checks_last_30_days'] = recent_balance_checks

        # Check if balance checks not followed by transactions
        if recent_balance_checks > 10 and txns_last_30 < 3:
            risk_signals.append('balance_checking_without_action')

    # 5. Cross-Product Usage
    unique_products = timeline[timeline['extra_data'].apply(
        lambda x: 'product_type' in x if isinstance(x, dict) else False
    )]
    if len(unique_products) > 0:
        product_types = set()
        for meta in unique_products['extra_data']:
            if isinstance(meta, dict) and 'product_type' in meta:
                product_types.add(meta['product_type'])
        industry_metrics['products_used'] = len(product_types)

        # Single product usage is a risk
        if len(product_types) == 1:
            risk_signals.append('single_product_usage')

    # 6. Support Contact Analysis
    support_events = timeline[timeline['event_type'] == 'support_contact']
    if len(support_events) > 0:
        support_last_30 = len(support_events[support_events['event_date'] >= last_30_days])
        support_prev_30 = len(support_events[(support_events['event_date'] >= last_30_days - timedelta(days=30)) &
                                              (support_events['event_date'] < last_30_days)])

        industry_metrics['support_contacts_last_30_days'] = support_last_30

        # Detect support spike
        if support_last_30 > support_prev_30 * 2 and support_last_30 > 2:
            risk_signals.append('support_contact_spike')

    # Calculate trends
    activity_trend = calculate_trend(timeline, 'activity', last_30_days)
    value_trend = calculate_trend(timeline, 'value', last_30_days)

    # Engagement level
    engagement_level = calculate_engagement_level(timeline, last_30_days)

    return {
        'activity_trend': activity_trend,
        'value_trend': value_trend,
        'engagement_trend': activity_trend,  # Use activity as proxy
        'engagement_level': engagement_level,
        'risk_signals': risk_signals,
        'industry_metrics': industry_metrics
    }


def calculate_trend(timeline: pd.DataFrame, metric_type: str, lookback_date: datetime) -> str:
    """Calculate trend (increasing, stable, declining) for a metric."""
    recent_data = timeline[timeline['event_date'] >= lookback_date]

    if len(recent_data) < 2:
        return 'unknown'

    if metric_type == 'activity':
        # Daily activity count trend
        daily_counts = recent_data.groupby(recent_data['event_date'].dt.date).size()
        if len(daily_counts) < 2:
            return 'stable'

        # Simple linear regression slope
        x = np.arange(len(daily_counts))
        y = daily_counts.values
        if len(x) > 1:
            slope = np.polyfit(x, y, 1)[0]
            if slope > 0.1:
                return 'increasing'
            elif slope < -0.1:
                return 'declining'
        return 'stable'

    elif metric_type == 'value':
        # Transaction value trend
        daily_values = recent_data.groupby(recent_data['event_date'].dt.date)['amount'].sum()
        if len(daily_values) < 2:
            return 'stable'

        x = np.arange(len(daily_values))
        y = daily_values.values
        if len(x) > 1:
            slope = np.polyfit(x, y, 1)[0]
            if slope > 10:
                return 'increasing'
            elif slope < -10:
                return 'declining'
        return 'stable'

    return 'stable'


def calculate_engagement_level(timeline: pd.DataFrame, lookback_date: datetime) -> float:
    """Calculate engagement level (0-100) based on activity."""
    recent_data = timeline[timeline['event_date'] >= lookback_date]

    if len(recent_data) == 0:
        return 0.0

    # Factors: activity count, feature diversity, recency
    activity_count = len(recent_data)
    feature_diversity = recent_data['event_type'].nunique()
    days_since_last = (datetime.now() - recent_data['event_date'].max()).days

    # Score components
    activity_score = min(100, activity_count * 2)
    diversity_score = min(100, feature_diversity * 20)
    recency_score = max(0, 100 - (days_since_last * 3))

    engagement = (activity_score * 0.4 + diversity_score * 0.3 + recency_score * 0.3)
    return round(engagement, 2)
