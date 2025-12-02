"""
Telecom Industry Behavior Analyzer
Analyzes usage frequency and patterns for telecom customers
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime, timedelta


def analyze_telecom_behavior(timeline: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze telecom customer behavior patterns.

    Key patterns tracked:
    - Data usage decline
    - Call/SMS pattern changes
    - Plan underutilization
    - Customer service calls
    - Roaming charges (competitor exploration)
    - Payment delays

    Args:
        timeline: DataFrame with event_date, event_type, amount, extra_data

    Returns:
        Dictionary with trends, risk signals, and industry metrics
    """
    if len(timeline) == 0:
        return {
            'activity_trend': 'unknown',
            'value_trend': 'unknown',
            'engagement_trend': 'unknown',
            'engagement_level': 0,
            'risk_signals': ['no_usage_history'],
            'industry_metrics': {}
        }

    risk_signals = []
    industry_metrics = {}

    # Define time periods
    now = datetime.now()
    last_30_days = now - timedelta(days=30)
    last_90_days = now - timedelta(days=90)

    # Convert event_date to datetime
    timeline['event_date'] = pd.to_datetime(timeline['event_date'])

    # 1. Data Usage Analysis
    data_usage = timeline[timeline['event_type'] == 'data_usage']
    if len(data_usage) > 0:
        # Sum data usage (amount = MB/GB)
        usage_last_30 = data_usage[data_usage['event_date'] >= last_30_days]['amount'].sum()
        usage_prev_30 = data_usage[
            (data_usage['event_date'] >= last_30_days - timedelta(days=30)) &
            (data_usage['event_date'] < last_30_days)
        ]['amount'].sum()

        industry_metrics['data_usage_last_30_mb'] = usage_last_30
        industry_metrics['data_usage_prev_30_mb'] = usage_prev_30

        # Detect usage decline
        if usage_prev_30 > 0 and usage_last_30 < usage_prev_30 * 0.7:
            risk_signals.append('data_usage_decline')

    # 2. Call/SMS Pattern Analysis
    call_sms = timeline[timeline['event_type'].isin(['call', 'sms'])]
    if len(call_sms) > 0:
        count_last_30 = len(call_sms[call_sms['event_date'] >= last_30_days])
        count_prev_30 = len(call_sms[
            (call_sms['event_date'] >= last_30_days - timedelta(days=30)) &
            (call_sms['event_date'] < last_30_days)
        ])

        industry_metrics['call_sms_count_last_30'] = count_last_30
        industry_metrics['call_sms_count_prev_30'] = count_prev_30

        # Detect pattern shift
        if count_prev_30 > 10 and count_last_30 < count_prev_30 * 0.5:
            risk_signals.append('communication_pattern_change')

    # 3. Plan Utilization Analysis
    plan_data = timeline[timeline['extra_data'].apply(
        lambda x: 'plan_limit' in x and 'usage' in x if isinstance(x, dict) else False
    )]

    if len(plan_data) > 0:
        # Get most recent plan data
        recent_plan = plan_data.iloc[-1]
        if isinstance(recent_plan['extra_data'], dict):
            plan_limit = recent_plan['extra_data'].get('plan_limit', 0)
            usage = recent_plan['extra_data'].get('usage', 0)

            if plan_limit > 0:
                utilization = (usage / plan_limit) * 100
                industry_metrics['plan_utilization_percent'] = round(utilization, 2)

                # Detect underutilization
                if utilization < 30:
                    risk_signals.append('plan_underutilization')
                    industry_metrics['plan_fit'] = 'overserved'
                elif utilization > 90:
                    industry_metrics['plan_fit'] = 'underserved'
                else:
                    industry_metrics['plan_fit'] = 'well_matched'

    # 4. Customer Service Calls
    support_calls = timeline[timeline['event_type'] == 'support_call']
    if len(support_calls) > 0:
        support_last_30 = len(support_calls[support_calls['event_date'] >= last_30_days])
        industry_metrics['support_calls_last_30_days'] = support_last_30

        # Check for billing inquiries
        billing_issues = support_calls[support_calls['extra_data'].apply(
            lambda x: x.get('issue_type') == 'billing' if isinstance(x, dict) else False
        )]

        if len(billing_issues) > 2:
            risk_signals.append('billing_complaints')

    # 5. Roaming Analysis
    roaming = timeline[timeline['event_type'] == 'roaming']
    if len(roaming) > 0:
        roaming_last_30 = len(roaming[roaming['event_date'] >= last_30_days])
        roaming_charges = roaming[roaming['event_date'] >= last_30_days]['amount'].sum()

        industry_metrics['roaming_events_last_30'] = roaming_last_30
        industry_metrics['roaming_charges_last_30'] = roaming_charges

        # Frequent roaming might indicate competitor testing
        if roaming_last_30 > 5:
            risk_signals.append('frequent_roaming')

    # 6. Payment Analysis
    payments = timeline[timeline['event_type'] == 'bill_payment']
    if len(payments) > 0:
        late_payments = payments[payments['extra_data'].apply(
            lambda x: x.get('late_days', 0) > 0 if isinstance(x, dict) else False
        )]

        if len(late_payments) > 0:
            avg_late_days = np.mean([
                meta.get('late_days', 0)
                for meta in late_payments['extra_data']
                if isinstance(meta, dict)
            ])

            industry_metrics['late_payments_count'] = len(late_payments)
            industry_metrics['avg_late_days'] = round(avg_late_days, 1)

            if len(late_payments) > 2 or avg_late_days > 7:
                risk_signals.append('payment_delays')

    # Calculate trends
    activity_trend = calculate_usage_trend(timeline, last_30_days)
    value_trend = calculate_value_trend(timeline, last_30_days)

    # Engagement level
    engagement_level = calculate_engagement_level(timeline, last_30_days)

    return {
        'activity_trend': activity_trend,
        'value_trend': value_trend,
        'engagement_trend': activity_trend,
        'engagement_level': engagement_level,
        'risk_signals': risk_signals,
        'industry_metrics': industry_metrics
    }


def calculate_usage_trend(timeline: pd.DataFrame, lookback_date: datetime) -> str:
    """Calculate usage trend (increasing, stable, declining)."""
    recent_data = timeline[timeline['event_date'] >= lookback_date]

    if len(recent_data) < 2:
        return 'unknown'

    # Daily activity count
    daily_counts = recent_data.groupby(recent_data['event_date'].dt.date).size()

    if len(daily_counts) < 2:
        return 'stable'

    x = np.arange(len(daily_counts))
    y = daily_counts.values

    if len(x) > 1:
        slope = np.polyfit(x, y, 1)[0]
        if slope > 0.5:
            return 'increasing'
        elif slope < -0.5:
            return 'declining'

    return 'stable'


def calculate_value_trend(timeline: pd.DataFrame, lookback_date: datetime) -> str:
    """Calculate spending/usage value trend."""
    recent_data = timeline[timeline['event_date'] >= lookback_date]

    if len(recent_data) < 2:
        return 'unknown'

    # Daily sum of amounts
    daily_values = recent_data.groupby(recent_data['event_date'].dt.date)['amount'].sum()

    if len(daily_values) < 2:
        return 'stable'

    x = np.arange(len(daily_values))
    y = daily_values.values

    if len(x) > 1:
        slope = np.polyfit(x, y, 1)[0]
        if slope > 5:
            return 'increasing'
        elif slope < -5:
            return 'declining'

    return 'stable'


def calculate_engagement_level(timeline: pd.DataFrame, lookback_date: datetime) -> float:
    """Calculate engagement level (0-100) based on usage patterns."""
    recent_data = timeline[timeline['event_date'] >= lookback_date]

    if len(recent_data) == 0:
        return 0.0

    # Factors: usage count, service diversity, recency
    usage_count = len(recent_data)
    service_diversity = recent_data['event_type'].nunique()
    days_since_last = (datetime.now() - recent_data['event_date'].max()).days

    # Score components
    usage_score = min(100, usage_count * 1.5)
    diversity_score = min(100, service_diversity * 15)
    recency_score = max(0, 100 - (days_since_last * 5))

    engagement = (usage_score * 0.5 + diversity_score * 0.2 + recency_score * 0.3)
    return round(engagement, 2)
