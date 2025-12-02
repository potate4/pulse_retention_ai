"""
Enhanced Feature Engineering V2
Improved RFM feature engineering with better null handling, edge cases, and additional features.
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')


def engineer_features_from_csv_v2(
    df: pd.DataFrame,
    lookback_days: int = 90,
    current_date: Optional[datetime] = None,
    has_churn_label: bool = False
) -> pd.DataFrame:
    """
    Enhanced feature engineering with improved null handling and additional features.

    Key improvements:
    - Better null handling with intelligent defaults
    - Additional behavioral features (velocity, consistency, lifecycle stage)
    - Improved edge case handling (single transaction, no recent activity, etc.)
    - Feature interactions and ratios
    - More robust normalization

    Args:
        df: DataFrame with customer transaction data
        lookback_days: Number of days to look back for frequency/monetary calculation
        current_date: Reference date for calculations (defaults to today)
        has_churn_label: Whether the CSV includes a churn_label column

    Returns:
        DataFrame with enhanced customer-level features (15 features total)
    """
    if current_date is None:
        current_date = datetime.now().date()
    elif isinstance(current_date, datetime):
        current_date = current_date.date()

    # Validate required columns
    if "customer_id" not in df.columns:
        raise ValueError("CSV must contain 'customer_id' column")
    if "event_date" not in df.columns:
        raise ValueError("CSV must contain 'event_date' column")

    # Convert event_date to datetime
    df = df.copy()
    df["event_date"] = pd.to_datetime(df["event_date"], errors='coerce')

    # Remove rows with invalid dates
    df = df[df["event_date"].notna()]
    df["event_date"] = df["event_date"].dt.date

    # Fill missing amounts with 0
    if "amount" not in df.columns:
        df["amount"] = 0.0
    else:
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0).clip(lower=0)

    # Calculate lookback and trend dates
    lookback_date = current_date - timedelta(days=lookback_days)
    trend_date_30 = current_date - timedelta(days=30)
    trend_date_60 = current_date - timedelta(days=60)

    # Group by customer
    features_list = []

    for customer_id, customer_df in df.groupby("customer_id"):
        customer_df = customer_df.sort_values("event_date")

        # Basic metrics
        first_date = customer_df["event_date"].min()
        last_date = customer_df["event_date"].max()
        total_transactions = len(customer_df)

        # Edge case: Single transaction customer
        is_single_transaction = total_transactions == 1

        # === Core RFM Features (with improvements) ===

        # 1. Recency Score (0-100, higher = more recent)
        recency_days = (current_date - last_date).days
        max_recency = 365
        recency_score = max(0, 100 * (1 - min(recency_days, max_recency) / max_recency))

        # 2. Frequency Score (0-100, based on transactions in lookback period)
        recent_df = customer_df[customer_df["event_date"] >= lookback_date]
        frequency_count = len(recent_df)
        max_frequency = 50  # Adjusted: more realistic max
        frequency_score = min(100, 100 * (frequency_count / max_frequency))

        # 3. Monetary Value (will normalize later)
        monetary_value = recent_df["amount"].sum()

        # 4. Tenure Days
        tenure_days = max(1, (last_date - first_date).days)  # Minimum 1 to avoid division by zero

        # === Advanced Behavioral Features ===

        # 5. Activity Trend (30-day slope)
        recent_30_df = customer_df[customer_df["event_date"] >= trend_date_30]
        if len(recent_30_df) > 1:
            daily_activity = recent_30_df.groupby("event_date").size()
            if len(daily_activity) > 1:
                x = np.arange(len(daily_activity))
                y = daily_activity.values
                activity_trend = float(np.polyfit(x, y, 1)[0])
            else:
                activity_trend = 0.0
        else:
            activity_trend = 0.0 if len(recent_30_df) == 0 else 0.01  # Slight positive for single recent

        # 6. Transaction Velocity (transactions per day of tenure)
        transaction_velocity = total_transactions / max(tenure_days, 1)

        # 7. Average Transaction Value
        avg_transaction_value = customer_df["amount"].mean() if total_transactions > 0 else 0.0

        # 8. Days Between Transactions (consistency metric)
        if total_transactions > 1:
            date_diffs = customer_df["event_date"].diff().apply(lambda x: x.days if pd.notna(x) else 0)
            valid_diffs = date_diffs[date_diffs > 0]
            days_between_transactions = valid_diffs.mean() if len(valid_diffs) > 0 else tenure_days
        else:
            days_between_transactions = tenure_days  # Use tenure for single transaction

        # 9. Transaction Consistency (std of days between transactions, lower = more consistent)
        if total_transactions > 2:
            date_diffs = customer_df["event_date"].diff().apply(lambda x: x.days if pd.notna(x) else 0)
            valid_diffs = date_diffs[date_diffs > 0]
            consistency_std = valid_diffs.std() if len(valid_diffs) > 1 else 0.0
            # Normalize: lower std = higher consistency score
            max_std = 90  # Assume 90 days std is very inconsistent
            consistency_score = max(0, 100 * (1 - min(consistency_std, max_std) / max_std))
        else:
            consistency_score = 50.0  # Neutral for insufficient data

        # 10. Recent Activity Ratio (last 30 days vs previous 30 days)
        recent_60_df = customer_df[customer_df["event_date"] >= trend_date_60]
        recent_30_count = len(recent_30_df)
        previous_30_df = recent_60_df[recent_60_df["event_date"] < trend_date_30]
        previous_30_count = len(previous_30_df)

        if previous_30_count > 0:
            activity_ratio = recent_30_count / previous_30_count
        elif recent_30_count > 0:
            activity_ratio = 2.0  # Growing
        else:
            activity_ratio = 0.0  # Inactive

        # 11. Monetary Trend (comparing recent vs historical average)
        if len(recent_df) > 0:
            recent_avg_amount = recent_df["amount"].mean()
            historical_avg_amount = customer_df["amount"].mean()
            if historical_avg_amount > 0:
                monetary_trend = (recent_avg_amount - historical_avg_amount) / historical_avg_amount
            else:
                monetary_trend = 0.0
        else:
            monetary_trend = -1.0  # No recent monetary activity

        # 12. Lifecycle Stage (based on tenure and activity)
        if tenure_days < 30:
            lifecycle_stage = 0  # New customer
        elif tenure_days < 90:
            lifecycle_stage = 1  # Growing customer
        elif recency_days < 30:
            lifecycle_stage = 2  # Mature active customer
        elif recency_days < 90:
            lifecycle_stage = 3  # Mature declining customer
        else:
            lifecycle_stage = 4  # At-risk/dormant customer

        # 13. Engagement Score (composite, improved formula)
        engagement_score = (
            recency_score * 0.4 +  # Recent activity is important
            frequency_score * 0.3 +  # Frequency matters
            consistency_score * 0.2 +  # Consistency bonus
            min(100, transaction_velocity * 1000) * 0.1  # Velocity bonus
        )
        engagement_score = max(0, min(100, engagement_score))

        # 14. Recency-Frequency Ratio (RFM interaction)
        # High recency + low frequency = new customer
        # High recency + high frequency = loyal customer
        # Low recency + high frequency = at-risk customer
        rf_ratio = (recency_score / 100) * (frequency_score / 100) * 100

        # 15. Average Days Since Last Transaction (normalized)
        avg_days_since_last = recency_days / max(total_transactions, 1)

        # Build feature dict
        feature_dict = {
            "customer_id": customer_id,
            # Core RFM
            "recency_score": round(recency_score, 2),
            "frequency_score": round(frequency_score, 2),
            "monetary_score": 0.0,  # Will normalize after collecting all
            "tenure_days": int(tenure_days),
            "avg_transaction_value": round(avg_transaction_value, 2),

            # Behavioral features
            "activity_trend": round(activity_trend, 4),
            "transaction_velocity": round(transaction_velocity, 4),
            "days_between_transactions": round(days_between_transactions, 2),
            "consistency_score": round(consistency_score, 2),
            "activity_ratio": round(activity_ratio, 2),

            # Advanced metrics
            "monetary_trend": round(monetary_trend, 4),
            "lifecycle_stage": int(lifecycle_stage),
            "engagement_score": round(engagement_score, 2),
            "rf_ratio": round(rf_ratio, 2),
            "avg_days_since_last": round(avg_days_since_last, 2),

            # Metadata
            "total_transactions": int(total_transactions),
            "_monetary_value": monetary_value  # Temporary for normalization
        }

        # Add churn label if present
        if has_churn_label and "churn_label" in df.columns:
            churn_label = customer_df["churn_label"].iloc[0]
            feature_dict["churn_label"] = int(churn_label)

        features_list.append(feature_dict)

    # Create features DataFrame
    features_df = pd.DataFrame(features_list)

    # Normalize monetary scores (0-100 scale, using quantile to handle outliers)
    if len(features_df) > 0:
        max_monetary = features_df["_monetary_value"].quantile(0.95)
        if max_monetary == 0:
            max_monetary = 1
        features_df["monetary_score"] = features_df["_monetary_value"].apply(
            lambda x: round(min(100, 100 * (x / max_monetary)), 2)
        )
        features_df = features_df.drop(columns=["_monetary_value"])

    return features_df


def get_feature_columns_v2() -> List[str]:
    """
    Get the list of feature columns for V2 (15 features).
    """
    return [
        "recency_score",
        "frequency_score",
        "monetary_score",
        "tenure_days",
        "avg_transaction_value",
        "activity_trend",
        "transaction_velocity",
        "days_between_transactions",
        "consistency_score",
        "activity_ratio",
        "monetary_trend",
        "lifecycle_stage",
        "engagement_score",
        "rf_ratio",
        "avg_days_since_last"
    ]


def create_training_dataset_from_csv_v2(
    raw_csv_df: pd.DataFrame,
    churn_threshold_days: int = 30,
    current_date: Optional[datetime] = None
) -> pd.DataFrame:
    """
    Create a complete training dataset with V2 features and labels from raw CSV.

    Args:
        raw_csv_df: Raw customer transactions CSV
        churn_threshold_days: Threshold for labeling churned customers
        current_date: Reference date (defaults to today)

    Returns:
        DataFrame with V2 features and churn labels ready for training
    """
    # Import generate_churn_labels from the original module
    from app.services.feature_engineering_csv import generate_churn_labels
    
    # Generate churn labels
    churn_labels_df = generate_churn_labels(raw_csv_df, churn_threshold_days, current_date)

    # Engineer features using V2
    features_df = engineer_features_from_csv_v2(raw_csv_df, has_churn_label=False, current_date=current_date)

    # Merge features with labels
    training_df = features_df.merge(churn_labels_df, on="customer_id", how="left")

    # Fill any missing labels with 0 (active)
    training_df["churn_label"] = training_df["churn_label"].fillna(0).astype(int)

    return training_df