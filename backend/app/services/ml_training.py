"""
ML Training Service
Trains churn prediction models from DataFrames (no database required).
"""
import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Tuple, Any
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    roc_auc_score,
    f1_score,
    classification_report
)
from sklearn.model_selection import train_test_split


# Feature columns for model training (8 features)
FEATURE_COLUMNS = [
    "recency_score",
    "frequency_score",
    "monetary_score",
    "engagement_score",
    "tenure_days",
    "activity_trend",
    "avg_transaction_value",
    "days_between_transactions"
]


def train_churn_model_from_dataframe(
    training_df: pd.DataFrame,
    model_type: str = "logistic_regression",
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[Any, Dict[str, Any]]:
    """
    Train churn prediction model from a DataFrame.

    Args:
        training_df: DataFrame with features and churn_label column
        model_type: Type of model to train ('logistic_regression', 'random_forest', 'gradient_boosting')
        test_size: Proportion of data for testing
        random_state: Random seed for reproducibility

    Returns:
        Tuple of (trained_model, metrics_dict)
    """
    # Validate DataFrame
    if "churn_label" not in training_df.columns:
        raise ValueError("training_df must contain 'churn_label' column")

    for col in FEATURE_COLUMNS:
        if col not in training_df.columns:
            raise ValueError(f"training_df missing required feature column: {col}")

    if len(training_df) < 10:
        raise ValueError(f"Insufficient data for training. Need at least 10 samples, got {len(training_df)}")

    # Prepare features and labels
    X = training_df[FEATURE_COLUMNS].values
    y = training_df["churn_label"].values

    # Split into train and test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y if len(np.unique(y)) > 1 else None
    )

    # Train model based on type
    if model_type == "logistic_regression":
        model = LogisticRegression(
            random_state=random_state,
            max_iter=1000,
            class_weight='balanced'
        )
    elif model_type == "random_forest":
        model = RandomForestClassifier(
            n_estimators=100,
            random_state=random_state,
            class_weight='balanced',
            max_depth=10
        )
    elif model_type == "gradient_boosting":
        model = GradientBoostingClassifier(
            n_estimators=100,
            random_state=random_state,
            max_depth=5,
            learning_rate=0.1
        )
    else:
        raise ValueError(f"Unknown model_type: {model_type}")

    # Train
    model.fit(X_train, y_train)

    # Evaluate
    metrics = evaluate_model(model, X_test, y_test, model_type)

    # Add training info
    metrics["model_type"] = model_type
    metrics["train_samples"] = len(X_train)
    metrics["test_samples"] = len(X_test)
    metrics["total_samples"] = len(training_df)
    metrics["churn_rate"] = round(float(y.mean()), 4)

    return model, metrics


def evaluate_model(
    model: Any,
    X_test: np.ndarray,
    y_test: np.ndarray,
    model_type: str
) -> Dict[str, Any]:
    """
    Evaluate model performance.

    Args:
        model: Trained model
        X_test: Test features
        y_test: Test labels
        model_type: Type of model

    Returns:
        Dictionary with evaluation metrics
    """
    # Predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]

    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    # ROC-AUC (handle case where only one class present)
    try:
        roc_auc = roc_auc_score(y_test, y_pred_proba)
    except ValueError:
        roc_auc = 0.0

    # Feature importance
    if hasattr(model, "coef_"):
        # Logistic Regression
        feature_importance = {
            col: float(coef) for col, coef in zip(FEATURE_COLUMNS, model.coef_[0])
        }
    elif hasattr(model, "feature_importances_"):
        # Tree-based models
        feature_importance = {
            col: float(imp) for col, imp in zip(FEATURE_COLUMNS, model.feature_importances_)
        }
    else:
        feature_importance = {}

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "feature_importance": feature_importance
    }


def save_model_to_disk(
    model: Any,
    organization_id: str,
    metadata: Dict[str, Any],
    base_path: str = "models"
) -> str:
    """
    Save trained model to disk.

    Args:
        model: Trained model object
        organization_id: Organization UUID (as string)
        metadata: Model metadata (metrics, etc.)
        base_path: Base directory for model storage

    Returns:
        Path to saved model file
    """
    # Create directory structure
    model_dir = Path(base_path) / str(organization_id)
    model_dir.mkdir(parents=True, exist_ok=True)

    # Save model
    model_path = model_dir / "churn_model.pkl"
    joblib.dump(model, model_path)

    # Save metadata
    metadata_path = model_dir / "model_metadata.json"
    import json
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    return str(model_path)


def load_model_from_disk(
    organization_id: str,
    base_path: str = "models"
) -> Any:
    """
    Load trained model from disk.

    Args:
        organization_id: Organization UUID (as string)
        base_path: Base directory for model storage

    Returns:
        Loaded model object
    """
    model_path = Path(base_path) / str(organization_id) / "churn_model.pkl"

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found for organization {organization_id} at {model_path}")

    return joblib.load(model_path)


def predict_from_features(
    model: Any,
    features_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Generate predictions from a features DataFrame.

    Args:
        model: Trained model
        features_df: DataFrame with customer features

    Returns:
        DataFrame with customer_id, churn_probability, risk_segment
    """
    # Validate features
    for col in FEATURE_COLUMNS:
        if col not in features_df.columns:
            raise ValueError(f"features_df missing required column: {col}")

    # Extract features
    X = features_df[FEATURE_COLUMNS].values

    # Predict probabilities
    churn_probabilities = model.predict_proba(X)[:, 1]

    # Calculate risk segments
    def get_risk_segment(prob):
        if prob < 0.3:
            return "Low"
        elif prob < 0.5:
            return "Medium"
        elif prob < 0.7:
            return "High"
        else:
            return "Critical"

    risk_segments = [get_risk_segment(prob) for prob in churn_probabilities]

    # Build results DataFrame
    results = pd.DataFrame({
        "customer_id": features_df["customer_id"],
        "churn_probability": [round(prob, 4) for prob in churn_probabilities],
        "risk_segment": risk_segments
    })

    return results
