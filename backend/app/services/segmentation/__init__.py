"""
Customer Segmentation Service
Provides RFM-based customer segmentation with churn risk integration
"""
from .segment_engine import segment_customer, batch_segment_customers
from .rules import SEGMENT_DEFINITIONS, assign_segment
from .utils import categorize_rfm_score, categorize_churn_probability

__all__ = [
    'segment_customer',
    'batch_segment_customers',
    'SEGMENT_DEFINITIONS',
    'assign_segment',
    'categorize_rfm_score',
    'categorize_churn_probability'
]
