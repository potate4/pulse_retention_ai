"""
Generate Synthetic Churn Prediction Data
Creates realistic 10,000-row CSV with customer_id and churn_score
Distribution: 45% Low Risk, 30% Medium Risk, 18% High Risk, 7% Critical Risk
"""
import pandas as pd
import numpy as np
from scipy.stats import beta
import os


def generate_synthetic_churn_data(num_customers: int = 10000, output_path: str = None) -> pd.DataFrame:
    """
    Generate synthetic churn prediction data with realistic probability distributions.

    Args:
        num_customers: Number of customer records to generate
        output_path: Path to save CSV file (optional)

    Returns:
        DataFrame with customer_id and churn_score columns
    """
    print(f"Generating {num_customers} synthetic customer churn predictions...")

    # Generate customer IDs
    customer_ids = [f"CUST_{str(i).zfill(5)}" for i in range(1, num_customers + 1)]

    # Calculate distribution sizes
    low_risk_count = int(num_customers * 0.45)      # 4,500
    medium_risk_count = int(num_customers * 0.30)   # 3,000
    high_risk_count = int(num_customers * 0.18)     # 1,800
    critical_risk_count = num_customers - (low_risk_count + medium_risk_count + high_risk_count)  # 700

    scores = []

    # Low risk (0.0 - 0.3): Beta(2, 8) scaled to [0, 0.3]
    # This creates a right-skewed distribution with most values near 0
    low_risk_scores = beta.rvs(2, 8, size=low_risk_count) * 0.3
    scores.extend(low_risk_scores)
    print(f"  Generated {low_risk_count} low-risk customers (0.0-0.3)")

    # Medium risk (0.3 - 0.5): Beta(2, 2) scaled to [0.3, 0.5]
    # This creates a uniform-ish distribution
    medium_risk_scores = beta.rvs(2, 2, size=medium_risk_count) * 0.2 + 0.3
    scores.extend(medium_risk_scores)
    print(f"  Generated {medium_risk_count} medium-risk customers (0.3-0.5)")

    # High risk (0.5 - 0.7): Beta(2, 2) scaled to [0.5, 0.7]
    high_risk_scores = beta.rvs(2, 2, size=high_risk_count) * 0.2 + 0.5
    scores.extend(high_risk_scores)
    print(f"  Generated {high_risk_count} high-risk customers (0.5-0.7)")

    # Critical risk (0.7 - 1.0): Beta(2, 5) scaled to [0.7, 1.0]
    # This creates a left-skewed distribution with more values near 0.7
    critical_risk_scores = beta.rvs(2, 5, size=critical_risk_count) * 0.3 + 0.7
    scores.extend(critical_risk_scores)
    print(f"  Generated {critical_risk_count} critical-risk customers (0.7-1.0)")

    # Shuffle scores to randomize order
    np.random.shuffle(scores)

    # Clip to ensure all values are in [0, 1] range
    scores = np.clip(scores, 0.0, 1.0)

    # Round to 4 decimal places
    scores = np.round(scores, 4)

    # Create DataFrame
    df = pd.DataFrame({
        'customer_id': customer_ids,
        'churn_score': scores
    })

    # Print distribution statistics
    print("\nDistribution Statistics:")
    print(f"  Total customers: {len(df)}")
    print(f"  Low risk (0.0-0.3): {len(df[df['churn_score'] < 0.3])} ({len(df[df['churn_score'] < 0.3])/len(df)*100:.1f}%)")
    print(f"  Medium risk (0.3-0.5): {len(df[(df['churn_score'] >= 0.3) & (df['churn_score'] < 0.5)])} ({len(df[(df['churn_score'] >= 0.3) & (df['churn_score'] < 0.5)])/len(df)*100:.1f}%)")
    print(f"  High risk (0.5-0.7): {len(df[(df['churn_score'] >= 0.5) & (df['churn_score'] < 0.7)])} ({len(df[(df['churn_score'] >= 0.5) & (df['churn_score'] < 0.7)])/len(df)*100:.1f}%)")
    print(f"  Critical risk (0.7-1.0): {len(df[df['churn_score'] >= 0.7])} ({len(df[df['churn_score'] >= 0.7])/len(df)*100:.1f}%)")
    print(f"\n  Mean churn score: {df['churn_score'].mean():.4f}")
    print(f"  Median churn score: {df['churn_score'].median():.4f}")
    print(f"  Std deviation: {df['churn_score'].std():.4f}")

    # Save to CSV if output path provided
    if output_path:
        df.to_csv(output_path, index=False)
        print(f"\nSaved to: {output_path}")

    return df


if __name__ == "__main__":
    # Set random seed for reproducibility
    np.random.seed(42)

    # Determine output path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    output_path = os.path.join(backend_dir, "data", "synthetic_churn_predictions.csv")

    # Ensure data directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Generate data
    df = generate_synthetic_churn_data(num_customers=10000, output_path=output_path)

    print(f"\n✓ Successfully generated synthetic churn prediction data!")
    print(f"✓ File: {output_path}")
    print(f"✓ Rows: {len(df)}")
    print(f"\nSample data (first 10 rows):")
    print(df.head(10).to_string(index=False))
