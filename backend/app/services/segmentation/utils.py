"""
Segmentation Utility Functions
Helper functions for RFM categorization and churn risk mapping
"""
from typing import Dict, Literal


def categorize_rfm_score(score: float) -> Literal['High', 'Medium', 'Low']:
    """
    Categorize RFM score (0-100) into High/Medium/Low.

    Args:
        score: RFM score from 0 to 100

    Returns:
        'High', 'Medium', or 'Low'
    """
    if score >= 70:
        return 'High'
    elif score >= 30:
        return 'Medium'
    else:
        return 'Low'


def categorize_churn_probability(probability: float) -> Literal['Low', 'Medium', 'High', 'Critical']:
    """
    Convert churn probability to risk level.

    Args:
        probability: Churn probability from 0.0 to 1.0

    Returns:
        'Low', 'Medium', 'High', or 'Critical'
    """
    if probability < 0.3:
        return "Low"
    elif probability < 0.5:
        return "Medium"
    elif probability < 0.7:
        return "High"
    else:
        return "Critical"


def calculate_segment_score(
    recency_score: float,
    frequency_score: float,
    monetary_score: float,
    engagement_score: float,
    churn_probability: float
) -> float:
    """
    Calculate composite segment score (0-100).
    Combines RFM metrics with inverse of churn probability.

    Args:
        recency_score: Recency score (0-100)
        frequency_score: Frequency score (0-100)
        monetary_score: Monetary score (0-100)
        engagement_score: Engagement score (0-100)
        churn_probability: Churn probability (0-1)

    Returns:
        Composite score from 0 to 100
    """
    # Weight RFM scores
    rfm_score = (
        recency_score * 0.25 +
        frequency_score * 0.25 +
        monetary_score * 0.25 +
        engagement_score * 0.25
    )

    # Invert churn probability (high churn = low score)
    churn_penalty = (1 - churn_probability) * 100

    # Combine with 70% RFM, 30% churn penalty
    composite_score = (rfm_score * 0.7) + (churn_penalty * 0.3)

    return round(composite_score, 2)


def get_rfm_category_dict(
    recency_score: float,
    frequency_score: float,
    monetary_score: float,
    engagement_score: float
) -> Dict[str, str]:
    """
    Get RFM category dictionary.

    Args:
        recency_score: Recency score (0-100)
        frequency_score: Frequency score (0-100)
        monetary_score: Monetary score (0-100)
        engagement_score: Engagement score (0-100)

    Returns:
        Dictionary with R, F, M, E categories
    """
    return {
        'R': categorize_rfm_score(recency_score),
        'F': categorize_rfm_score(frequency_score),
        'M': categorize_rfm_score(monetary_score),
        'E': categorize_rfm_score(engagement_score)
    }
