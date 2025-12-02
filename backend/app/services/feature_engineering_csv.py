"""
Feature Engineering from CSV
Calculates RFM (Recency, Frequency, Monetary) metrics directly from CSV DataFrames
without requiring database storage.
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional
from datetime import datetime, timedelta


def engineer_features_from_csv(
    df: pd.DataFrame,
    lookback_days: int = 90,
    current_date: Optional[datetime] = None,
    has_churn_label: bool = False
) -> pd.DataFrame:
    """
    Calculate RFM and engagement features from a customer transactions CSV.

    Expected CSV columns:
        - customer_id (required): Customer identifier
        - event_date (required): Transaction date
        - amount (optional): Transaction value
        - event_type (optional): Type of event
        - churn_label (optional): Churn label (0/1) if provided

    Args:
        df: DataFrame with customer transaction data
        lookback_days: Number of days to look back for frequency/monetary calculation
        current_date: Reference date for calculations (defaults to today)
        has_churn_label: Whether the CSV includes a churn_label column

    Returns:
        DataFrame with customer-level features and optional churn labels

    Features calculated (8 total):
        1. recency_score (0-100): Days since last activity
        2. frequency_score (0-100): Number of transactions in lookback period
        3. monetary_score (0-100): Total value in lookback period
        4. engagement_score (0-100): Composite engagement metric
        5. tenure_days: Days since first transaction
        6. activity_trend: Slope of activity over last 30 days
        7. avg_transaction_value: Average amount per transaction
        8. days_between_transactions: Average gap between activities
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
    df["event_date"] = pd.to_datetime(df["event_date"]).dt.date

    # Fill missing amounts with 0
    if "amount" not in df.columns:
        df["amount"] = 0.0
    else:
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)

    # Calculate lookback and trend dates
    lookback_date = current_date - timedelta(days=lookback_days)
    trend_date = current_date - timedelta(days=30)

    # Group by customer
    features_list = []

    for customer_id, customer_df in df.groupby("customer_id"):
        customer_df = customer_df.sort_values("event_date")

        # Basic metrics
        first_date = customer_df["event_date"].min()
        last_date = customer_df["event_date"].max()
        total_transactions = len(customer_df)

        # 1. Recency Score (0-100, higher = more recent)
        recency_days = (current_date - last_date).days
        max_recency = 365
        recency_score = max(0, 100 * (1 - min(recency_days, max_recency) / max_recency))

        # 2. Frequency Score (0-100, based on transactions in lookback period)
        recent_df = customer_df[customer_df["event_date"] >= lookback_date]
        frequency_count = len(recent_df)
        max_frequency = 100  # Assume 100 transactions = 100 score
        frequency_score = min(100, 100 * (frequency_count / max_frequency))

        # 3. Monetary Score (0-100, based on total value in lookback period)
        monetary_value = recent_df["amount"].sum()

        # 4. Engagement Score (composite metric)
        recent_30_df = customer_df[customer_df["event_date"] >= trend_date]
        recent_activity_count = len(recent_30_df)

        # 5. Tenure Days
        tenure_days = (last_date - first_date).days

        # 6. Activity Trend (slope of activity over last 30 days)
        if len(recent_30_df) > 1:
            daily_activity = recent_30_df.groupby("event_date").size().reset_index(name="count")
            if len(daily_activity) > 1:
                x = np.arange(len(daily_activity))
                y = daily_activity["count"].values
                activity_trend = float(np.polyfit(x, y, 1)[0])
            else:
                activity_trend = 0.0
        else:
            activity_trend = 0.0

        # 7. Average Transaction Value
        avg_transaction_value = customer_df["amount"].mean()

        # 8. Days Between Transactions
        if len(customer_df) > 1:
            date_diffs = customer_df["event_date"].diff().apply(lambda x: x.days if pd.notna(x) else 0)
            days_between_transactions = date_diffs[date_diffs > 0].mean()
            if pd.isna(days_between_transactions):
                days_between_transactions = 0.0
        else:
            days_between_transactions = 0.0

        # Engagement score (composite)
        engagement_score = (
            min(100, recent_activity_count * 10) +  # Recent activity
            min(50, tenure_days / 10) +  # Tenure bonus
            max(0, activity_trend * 10)  # Trend bonus
        ) / 2.5
        engagement_score = max(0, min(100, engagement_score))

        # Build feature dict
        feature_dict = {
            "customer_id": customer_id,
            "recency_score": round(recency_score, 2),
            "frequency_score": round(frequency_score, 2),
            "monetary_score": 0.0,  # Will normalize after collecting all monetary values
            "engagement_score": round(engagement_score, 2),
            "tenure_days": int(tenure_days),
            "activity_trend": round(activity_trend, 2),
            "avg_transaction_value": round(avg_transaction_value, 2),
            "days_between_transactions": round(days_between_transactions, 2),
            "_monetary_value": monetary_value  # Temporary for normalization
        }

        # Add churn label if present
        if has_churn_label and "churn_label" in df.columns:
            # Get the churn label for this customer (should be same across all rows)
            churn_label = customer_df["churn_label"].iloc[0]
            feature_dict["churn_label"] = int(churn_label)

        features_list.append(feature_dict)

    # Create features DataFrame
    features_df = pd.DataFrame(features_list)

    # Normalize monetary scores (0-100 scale)
    if len(features_df) > 0:
        max_monetary = features_df["_monetary_value"].quantile(0.95)
        if max_monetary == 0:
            max_monetary = 1
        features_df["monetary_score"] = features_df["_monetary_value"].apply(
            lambda x: round(min(100, 100 * (x / max_monetary)), 2)
        )
        features_df = features_df.drop(columns=["_monetary_value"])

    return features_df


def generate_churn_labels(
    df: pd.DataFrame,
    churn_threshold_days: int = 30,
    current_date: Optional[datetime] = None
) -> pd.DataFrame:
    """
    Generate churn labels for customers based on inactivity threshold.

    Args:
        df: DataFrame with customer transaction data (must have customer_id, event_date)
        churn_threshold_days: Number of days of inactivity to consider churned
        current_date: Reference date (defaults to today)

    Returns:
        DataFrame with customer_id and churn_label columns
    """
    if current_date is None:
        current_date = datetime.now().date()
    elif isinstance(current_date, datetime):
        current_date = current_date.date()

    # Convert event_date to datetime
    df = df.copy()
    df["event_date"] = pd.to_datetime(df["event_date"]).dt.date

    # Get last transaction date for each customer
    last_dates = df.groupby("customer_id")["event_date"].max().reset_index()
    last_dates.columns = ["customer_id", "last_transaction_date"]

    # Calculate days since last activity
    last_dates["days_since_last"] = last_dates["last_transaction_date"].apply(
        lambda x: (current_date - x).days
    )

    # Label as churned if inactive >= threshold
    last_dates["churn_label"] = (last_dates["days_since_last"] >= churn_threshold_days).astype(int)

    return last_dates[["customer_id", "churn_label"]]


def create_training_dataset_from_csv(
    raw_csv_df: pd.DataFrame,
    churn_threshold_days: int = 30,
    current_date: Optional[datetime] = None
) -> pd.DataFrame:
    """
    Create a complete training dataset with features and labels from raw CSV.

    Args:
        raw_csv_df: Raw customer transactions CSV
        churn_threshold_days: Threshold for labeling churned customers
        current_date: Reference date (defaults to today)

    Returns:
        DataFrame with features and churn labels ready for training
    """
    # Generate churn labels
    churn_labels_df = generate_churn_labels(raw_csv_df, churn_threshold_days, current_date)

    # Engineer features
    features_df = engineer_features_from_csv(raw_csv_df, current_date=current_date, has_churn_label=False)

    # Merge features with labels
    training_df = features_df.merge(churn_labels_df, on="customer_id", how="left")

    # Fill any missing labels with 0 (active)
    training_df["churn_label"] = training_df["churn_label"].fillna(0).astype(int)

    return training_df
