"""
Behavior Analysis Service
Provides industry-specific behavior analysis and risk signal detection
"""
from .analyzer import analyze_customer, batch_analyze_behaviors
from .insights_generator import generate_recommendations

__all__ = [
    'analyze_customer',
    'batch_analyze_behaviors',
    'generate_recommendations'
]
