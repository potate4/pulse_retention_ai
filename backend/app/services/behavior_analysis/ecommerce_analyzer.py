"""
Ecommerce Industry Behavior Analyzer
Analyzes purchase behavior and patterns for ecommerce customers
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime, timedelta


def analyze_ecommerce_behavior(timeline: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze ecommerce customer behavior patterns.

    Key patterns tracked:
    - Cart abandonment rate
    - Category shift (high-margin to low-margin)
    - Discount dependency
    - Basket size decline
    - Browse-to-buy ratio
    - Return rate increase

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
            'risk_signals': ['no_purchase_history'],
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

    # 1. Cart Abandonment Analysis
    cart_adds = timeline[timeline['event_type'] == 'cart_add']
    cart_abandons = timeline[timeline['event_type'] == 'cart_abandon']
    purchases = timeline[timeline['event_type'] == 'purchase']

    if len(cart_adds) > 0:
        cart_adds_last_30 = len(cart_adds[cart_adds['event_date'] >= last_30_days])
        cart_abandons_last_30 = len(cart_abandons[cart_abandons['event_date'] >= last_30_days])
        purchases_last_30 = len(purchases[purchases['event_date'] >= last_30_days])

        if cart_adds_last_30 > 0:
            abandonment_rate = (cart_abandons_last_30 / cart_adds_last_30) * 100
            industry_metrics['cart_abandonment_rate'] = round(abandonment_rate, 2)

            # High abandonment is a risk
            if abandonment_rate > 70:
                risk_signals.append('high_cart_abandonment')

    # 2. Category Shift Analysis
    purchases_with_category = purchases[purchases['extra_data'].apply(
        lambda x: 'category' in x if isinstance(x, dict) else False
    )]

    if len(purchases_with_category) > 0:
        # Get categories from last 30 and previous 30 days
        recent_purchases = purchases_with_category[purchases_with_category['event_date'] >= last_30_days]
        prev_purchases = purchases_with_category[
            (purchases_with_category['event_date'] >= last_30_days - timedelta(days=30)) &
            (purchases_with_category['event_date'] < last_30_days)
        ]

        if len(recent_purchases) > 0 and len(prev_purchases) > 0:
            recent_categories = set([
                meta['category']
                for meta in recent_purchases['extra_data']
                if isinstance(meta, dict) and 'category' in meta
            ])

            prev_categories = set([
                meta['category']
                for meta in prev_purchases['extra_data']
                if isinstance(meta, dict) and 'category' in meta
            ])

            industry_metrics['categories_last_30'] = list(recent_categories)
            industry_metrics['categories_prev_30'] = list(prev_categories)

            # Detect category shift
            if len(recent_categories - prev_categories) > 2:
                risk_signals.append('category_shift')

    # 3. Discount Dependency Analysis
    purchases_with_discount = purchases[purchases['extra_data'].apply(
        lambda x: x.get('discount_used', False) if isinstance(x, dict) else False
    )]

    if len(purchases) > 0:
        discount_rate = (len(purchases_with_discount) / len(purchases)) * 100
        industry_metrics['discount_dependency_rate'] = round(discount_rate, 2)

        # Only buying with discounts
        if discount_rate > 80 and len(purchases) > 3:
            risk_signals.append('discount_dependency')

    # 4. Basket Size Analysis
    if len(purchases) > 0:
        purchases_last_30 = purchases[purchases['event_date'] >= last_30_days]
        purchases_prev_30 = purchases[
            (purchases['event_date'] >= last_30_days - timedelta(days=30)) &
            (purchases['event_date'] < last_30_days)
        ]

        if len(purchases_last_30) > 0:
            avg_order_value_last_30 = purchases_last_30['amount'].mean()
            industry_metrics['avg_order_value_last_30'] = round(avg_order_value_last_30, 2)

            if len(purchases_prev_30) > 0:
                avg_order_value_prev_30 = purchases_prev_30['amount'].mean()
                industry_metrics['avg_order_value_prev_30'] = round(avg_order_value_prev_30, 2)

                # Detect basket size decline
                if avg_order_value_last_30 < avg_order_value_prev_30 * 0.7:
                    risk_signals.append('basket_size_decline')

        # Items per order
        purchases_with_items = purchases[purchases['extra_data'].apply(
            lambda x: 'items_count' in x if isinstance(x, dict) else False
        )]

        if len(purchases_with_items) > 0:
            avg_items = np.mean([
                meta.get('items_count', 1)
                for meta in purchases_with_items['extra_data']
                if isinstance(meta, dict)
            ])
            industry_metrics['avg_items_per_order'] = round(avg_items, 2)

    # 5. Browse-to-Buy Ratio
    product_views = timeline[timeline['event_type'] == 'product_view']
    if len(product_views) > 0 and len(purchases) > 0:
        views_last_30 = len(product_views[product_views['event_date'] >= last_30_days])
        purchases_last_30_count = len(purchases[purchases['event_date'] >= last_30_days])

        if views_last_30 > 0:
            browse_to_buy_ratio = (purchases_last_30_count / views_last_30) * 100
            industry_metrics['browse_to_buy_ratio'] = round(browse_to_buy_ratio, 2)

            # High browsing, low buying
            if browse_to_buy_ratio < 5 and views_last_30 > 20:
                risk_signals.append('low_browse_to_buy')

    # 6. Return Rate Analysis
    returns = timeline[timeline['event_type'] == 'return']
    if len(returns) > 0 and len(purchases) > 0:
        returns_last_30 = len(returns[returns['event_date'] >= last_30_days])
        purchases_last_30_count = len(purchases[purchases['event_date'] >= last_30_days])

        if purchases_last_30_count > 0:
            return_rate = (returns_last_30 / purchases_last_30_count) * 100
            industry_metrics['return_rate'] = round(return_rate, 2)

            # High return rate
            if return_rate > 30:
                risk_signals.append('high_return_rate')

    # Calculate trends
    activity_trend = calculate_purchase_velocity(timeline, last_30_days)
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


def calculate_purchase_velocity(timeline: pd.DataFrame, lookback_date: datetime) -> str:
    """Calculate purchase velocity trend (accelerating, stable, decelerating)."""
    purchases = timeline[timeline['event_type'] == 'purchase']
    recent_purchases = purchases[purchases['event_date'] >= lookback_date]

    if len(recent_purchases) < 2:
        return 'unknown'

    # Weekly purchase counts
    weekly_counts = recent_purchases.groupby(
        pd.Grouper(key='event_date', freq='W')
    ).size()

    if len(weekly_counts) < 2:
        return 'stable'

    x = np.arange(len(weekly_counts))
    y = weekly_counts.values

    if len(x) > 1:
        slope = np.polyfit(x, y, 1)[0]
        if slope > 0.5:
            return 'increasing'
        elif slope < -0.5:
            return 'declining'

    return 'stable'


def calculate_value_trend(timeline: pd.DataFrame, lookback_date: datetime) -> str:
    """Calculate spending value trend."""
    purchases = timeline[timeline['event_type'] == 'purchase']
    recent_purchases = purchases[purchases['event_date'] >= lookback_date]

    if len(recent_purchases) < 2:
        return 'unknown'

    # Weekly purchase values
    weekly_values = recent_purchases.groupby(
        pd.Grouper(key='event_date', freq='W')
    )['amount'].sum()

    if len(weekly_values) < 2:
        return 'stable'

    x = np.arange(len(weekly_values))
    y = weekly_values.values

    if len(x) > 1:
        slope = np.polyfit(x, y, 1)[0]
        if slope > 10:
            return 'increasing'
        elif slope < -10:
            return 'declining'

    return 'stable'


def calculate_engagement_level(timeline: pd.DataFrame, lookback_date: datetime) -> float:
    """Calculate engagement level (0-100) based on shopping behavior."""
    recent_data = timeline[timeline['event_date'] >= lookback_date]

    if len(recent_data) == 0:
        return 0.0

    # Factors: purchase count, browsing activity, recency
    purchases = len(recent_data[recent_data['event_type'] == 'purchase'])
    views = len(recent_data[recent_data['event_type'] == 'product_view'])
    days_since_last = (datetime.now() - recent_data['event_date'].max()).days

    # Score components
    purchase_score = min(100, purchases * 10)
    browsing_score = min(100, views * 2)
    recency_score = max(0, 100 - (days_since_last * 4))

    engagement = (purchase_score * 0.5 + browsing_score * 0.2 + recency_score * 0.3)
    return round(engagement, 2)
