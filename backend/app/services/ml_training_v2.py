"""
Enhanced ML Training Service V2
Advanced training with hyperparameter tuning, cross-validation, and automated model selection.
"""
import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Tuple, Any, List, Optional
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV, StratifiedKFold
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    roc_auc_score,
    f1_score,
    classification_report,
    confusion_matrix
)


def train_churn_model_v2(
    training_df: pd.DataFrame,
    feature_columns: List[str],
    model_type: str = "auto",
    test_size: float = 0.2,
    random_state: int = 42,
    enable_tuning: bool = True,
    enable_scaling: bool = True
) -> Tuple[Any, Dict[str, Any]]:
    """
    Enhanced training with hyperparameter tuning and model selection.

    Args:
        training_df: DataFrame with features and churn_label column
        feature_columns: List of feature column names to use
        model_type: 'auto' (try all and pick best), 'logistic', 'random_forest', 'gradient_boosting', 'ensemble'
        test_size: Proportion of data for testing
        random_state: Random seed for reproducibility
        enable_tuning: Whether to perform hyperparameter tuning
        enable_scaling: Whether to scale features (recommended for logistic regression)

    Returns:
        Tuple of (trained_model_pipeline, metrics_dict)
    """
    # Validate DataFrame
    if "churn_label" not in training_df.columns:
        raise ValueError("training_df must contain 'churn_label' column")

    for col in feature_columns:
        if col not in training_df.columns:
            raise ValueError(f"training_df missing required feature column: {col}")

    if len(training_df) < 50:
        raise ValueError(f"Insufficient data for training. Need at least 50 samples, got {len(training_df)}")

    # Prepare features and labels
    X = training_df[feature_columns].copy()
    y = training_df["churn_label"].values

    # Handle missing values (fill with median)
    X = X.fillna(X.median())

    # Check class balance
    class_counts = np.bincount(y)
    if len(class_counts) < 2:
        raise ValueError("Training data must contain both churned and non-churned customers")

    minority_class_count = min(class_counts)
    if minority_class_count < 5:
        raise ValueError(f"Insufficient samples in minority class: {minority_class_count}. Need at least 5.")

    # Split into train and test with stratification
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    # Feature scaling (optional)
    scaler = None
    if enable_scaling:
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
    else:
        X_train_scaled = X_train.values
        X_test_scaled = X_test.values

    # Train model(s)
    if model_type == "auto":
        # Try multiple models and pick the best
        model, best_model_type, cv_scores = _auto_select_model(
            X_train_scaled, y_train, enable_tuning, random_state
        )
    else:
        # Train specific model
        model, cv_scores = _train_single_model(
            model_type, X_train_scaled, y_train, enable_tuning, random_state
        )
        best_model_type = model_type

    # Evaluate on test set
    metrics = _evaluate_model_v2(model, X_test_scaled, y_test, feature_columns)

    # Add training info
    metrics["model_type"] = best_model_type
    metrics["train_samples"] = len(X_train)
    metrics["test_samples"] = len(X_test)
    metrics["total_samples"] = len(training_df)
    metrics["churn_rate"] = round(float(y.mean()), 4)
    metrics["class_balance"] = {
        "non_churned": int(class_counts[0]),
        "churned": int(class_counts[1]) if len(class_counts) > 1 else 0
    }
    metrics["feature_scaling"] = enable_scaling
    metrics["hyperparameter_tuning"] = enable_tuning
    metrics["cv_scores"] = {
        "mean": round(float(np.mean(cv_scores)), 4),
        "std": round(float(np.std(cv_scores)), 4),
        "scores": [round(float(s), 4) for s in cv_scores]
    }

    # Create pipeline object
    pipeline = {
        'model': model,
        'scaler': scaler,
        'feature_columns': feature_columns
    }

    return pipeline, metrics


def _auto_select_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    enable_tuning: bool,
    random_state: int
) -> Tuple[Any, str, np.ndarray]:
    """
    Try multiple models and select the best based on cross-validation.
    """
    models_to_try = {
        "logistic_regression": LogisticRegression(
            random_state=random_state,
            max_iter=2000,
            class_weight='balanced'
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=100,
            random_state=random_state,
            class_weight='balanced',
            max_depth=10,
            min_samples_split=5
        ),
        "gradient_boosting": GradientBoostingClassifier(
            n_estimators=100,
            random_state=random_state,
            max_depth=5,
            learning_rate=0.1,
            min_samples_split=5
        )
    }

    best_score = -1
    best_model = None
    best_model_name = None
    best_cv_scores = None

    cv = StratifiedKFold(n_splits=min(5, len(y_train) // 10), shuffle=True, random_state=random_state)

    for model_name, model in models_to_try.items():
        # Train model
        if enable_tuning:
            model = _tune_hyperparameters(model_name, model, X_train, y_train, cv)

        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='roc_auc', n_jobs=-1)
        mean_score = np.mean(cv_scores)

        print(f"Model: {model_name}, CV ROC-AUC: {mean_score:.4f} (+/- {np.std(cv_scores):.4f})")

        if mean_score > best_score:
            best_score = mean_score
            best_model = model
            best_model_name = model_name
            best_cv_scores = cv_scores

    # Train best model on full training data
    best_model.fit(X_train, y_train)

    print(f"Selected model: {best_model_name} with CV ROC-AUC: {best_score:.4f}")

    return best_model, best_model_name, best_cv_scores


def _train_single_model(
    model_type: str,
    X_train: np.ndarray,
    y_train: np.ndarray,
    enable_tuning: bool,
    random_state: int
) -> Tuple[Any, np.ndarray]:
    """
    Train a specific model type.
    """
    # Initialize model
    if model_type == "logistic_regression" or model_type == "logistic":
        model = LogisticRegression(
            random_state=random_state,
            max_iter=2000,
            class_weight='balanced'
        )
    elif model_type == "random_forest":
        model = RandomForestClassifier(
            n_estimators=100,
            random_state=random_state,
            class_weight='balanced',
            max_depth=10,
            min_samples_split=5
        )
    elif model_type == "gradient_boosting":
        model = GradientBoostingClassifier(
            n_estimators=100,
            random_state=random_state,
            max_depth=5,
            learning_rate=0.1,
            min_samples_split=5
        )
    elif model_type == "ensemble":
        # Ensemble of multiple models
        lr = LogisticRegression(random_state=random_state, max_iter=2000, class_weight='balanced')
        rf = RandomForestClassifier(n_estimators=50, random_state=random_state, class_weight='balanced', max_depth=8)
        gb = GradientBoostingClassifier(n_estimators=50, random_state=random_state, max_depth=4, learning_rate=0.1)

        model = VotingClassifier(
            estimators=[('lr', lr), ('rf', rf), ('gb', gb)],
            voting='soft'
        )
    else:
        raise ValueError(f"Unknown model_type: {model_type}")

    # Hyperparameter tuning
    if enable_tuning and model_type != "ensemble":
        cv = StratifiedKFold(n_splits=min(5, len(y_train) // 10), shuffle=True, random_state=random_state)
        model = _tune_hyperparameters(model_type, model, X_train, y_train, cv)

    # Cross-validation
    cv = StratifiedKFold(n_splits=min(5, len(y_train) // 10), shuffle=True, random_state=random_state)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='roc_auc', n_jobs=-1)

    # Train on full training data
    model.fit(X_train, y_train)

    return model, cv_scores


def _tune_hyperparameters(
    model_type: str,
    model: Any,
    X_train: np.ndarray,
    y_train: np.ndarray,
    cv: Any
) -> Any:
    """
    Perform grid search for hyperparameter tuning.
    """
    param_grids = {
        "logistic_regression": {
            'C': [0.01, 0.1, 1.0, 10.0],
            'penalty': ['l2'],
            'solver': ['lbfgs', 'liblinear']
        },
        "random_forest": {
            'n_estimators': [50, 100, 200],
            'max_depth': [5, 10, 15, None],
            'min_samples_split': [2, 5, 10],
            'min_samples_leaf': [1, 2, 4]
        },
        "gradient_boosting": {
            'n_estimators': [50, 100, 200],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.01, 0.1, 0.2],
            'min_samples_split': [2, 5, 10]
        }
    }

    if model_type not in param_grids:
        return model

    param_grid = param_grids[model_type]

    grid_search = GridSearchCV(
        model,
        param_grid,
        cv=cv,
        scoring='roc_auc',
        n_jobs=-1,
        verbose=0
    )

    grid_search.fit(X_train, y_train)

    print(f"Best parameters for {model_type}: {grid_search.best_params_}")
    print(f"Best CV score: {grid_search.best_score_:.4f}")

    return grid_search.best_estimator_


def _evaluate_model_v2(
    model: Any,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_columns: List[str]
) -> Dict[str, Any]:
    """
    Enhanced model evaluation with additional metrics.
    """
    # Predictions
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]

    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)

    # ROC-AUC
    try:
        roc_auc = roc_auc_score(y_test, y_pred_proba)
    except ValueError:
        roc_auc = 0.0

    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)

    # Specificity (True Negative Rate)
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    # Feature importance
    feature_importance = _extract_feature_importance(model, feature_columns)

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "specificity": round(specificity, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp)
        },
        "feature_importance": feature_importance
    }


def _extract_feature_importance(model: Any, feature_columns: List[str]) -> Dict[str, float]:
    """
    Extract feature importance from model (handles different model types).
    """
    # Try to get base estimator from VotingClassifier
    if hasattr(model, 'estimators_'):
        # For VotingClassifier, use the first estimator (usually logistic regression)
        if len(model.estimators_) > 0:
            base_model = model.estimators_[0]
        else:
            return {}
    else:
        base_model = model

    # Extract importance
    if hasattr(base_model, "coef_"):
        # Logistic Regression
        importance = base_model.coef_[0]
    elif hasattr(base_model, "feature_importances_"):
        # Tree-based models
        importance = base_model.feature_importances_
    else:
        return {}

    return {
        col: round(float(imp), 4) for col, imp in zip(feature_columns, importance)
    }


def save_model_v2(
    pipeline: Dict[str, Any],
    organization_id: str,
    metadata: Dict[str, Any],
    base_path: str = "models"
) -> str:
    """
    Save trained model pipeline to disk.
    """
    # Create directory structure
    model_dir = Path(base_path) / str(organization_id)
    model_dir.mkdir(parents=True, exist_ok=True)

    # Save model pipeline
    model_path = model_dir / "churn_model_v2.pkl"
    joblib.dump(pipeline, model_path)

    # Save metadata
    metadata_path = model_dir / "model_metadata_v2.json"
    import json
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    return str(model_path)


def load_model_v2(
    organization_id: str,
    base_path: str = "models"
) -> Dict[str, Any]:
    """
    Load trained model pipeline from disk.
    """
    model_path = Path(base_path) / str(organization_id) / "churn_model_v2.pkl"

    if not model_path.exists():
        raise FileNotFoundError(f"Model V2 not found for organization {organization_id}")

    return joblib.load(model_path)


def predict_v2(
    pipeline: Dict[str, Any],
    features_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Generate predictions using model pipeline.
    """
    model = pipeline['model']
    scaler = pipeline.get('scaler')
    feature_columns = pipeline['feature_columns']

    # Validate features
    for col in feature_columns:
        if col not in features_df.columns:
            raise ValueError(f"features_df missing required column: {col}")

    # Extract and prepare features
    X = features_df[feature_columns].copy()
    X = X.fillna(X.median())  # Handle any missing values

    # Scale if scaler exists
    if scaler is not None:
        X_scaled = scaler.transform(X)
    else:
        X_scaled = X.values

    # Predict probabilities
    churn_probabilities = model.predict_proba(X_scaled)[:, 1]

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
