"""
Churn Prediction Service
Loads trained models and generates churn predictions for customers.
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from sqlalchemy.dialects.postgresql import UUID

from app.db.models.customer import Customer
from app.db.models.customer_feature import CustomerFeature
from app.db.models.churn_prediction import ChurnPrediction
from app.services.ml_pipeline import load_model, FEATURE_COLUMNS
from app.services.feature_engineering import create_feature_vector


def get_churn_risk_segment(probability: float) -> str:
    """
    Convert churn probability to risk segment.
    
    Args:
        probability: Churn probability (0.0 to 1.0)
        
    Returns:
        Risk segment string: 'Low', 'Medium', 'High', 'Critical'
    """
    if probability < 0.3:
        return "Low"
    elif probability < 0.5:
        return "Medium"
    elif probability < 0.7:
        return "High"
    else:
        return "Critical"


def predict_churn(
    customer_id: UUID,
    organization_id: UUID,
    db: Session,
    model_base_path: str = "models"
) -> Tuple[float, str]:
    """
    Predict churn probability for a single customer.
    
    Args:
        customer_id: Customer UUID
        organization_id: Organization UUID
        db: Database session
        model_base_path: Base path for model storage
        
    Returns:
        Tuple of (churn_probability, risk_segment)
    """
    # Load model
    try:
        model = load_model(organization_id, model_base_path)
    except FileNotFoundError:
        raise ValueError(f"No trained model found for organization {organization_id}")
    
    # Get feature vector
    feature_vector = create_feature_vector(customer_id, db)
    
    if feature_vector is None or len(feature_vector) == 0:
        raise ValueError(f"No features found for customer {customer_id}")
    
    # Reshape for prediction (sklearn expects 2D array)
    feature_vector = feature_vector.reshape(1, -1)
    
    # Predict probability
    churn_probability = float(model.predict_proba(feature_vector)[0, 1])
    
    # Get risk segment
    risk_segment = get_churn_risk_segment(churn_probability)
    
    return churn_probability, risk_segment


def batch_predict(
    organization_id: UUID,
    db: Session,
    model_base_path: str = "models"
) -> pd.DataFrame:
    """
    Batch predict churn for all customers in an organization.
    
    Args:
        organization_id: Organization UUID
        db: Database session
        model_base_path: Base path for model storage
        
    Returns:
        DataFrame with customer_id, churn_probability, risk_segment
    """
    # Load model
    try:
        model = load_model(organization_id, model_base_path)
    except FileNotFoundError:
        raise ValueError(f"No trained model found for organization {organization_id}")
    
    # Get all customers with features
    customers = db.query(Customer).filter(
        Customer.organization_id == organization_id
    ).all()
    
    predictions = []
    
    for customer in customers:
        try:
            # Get feature vector
            feature_vector = create_feature_vector(customer.id, db)
            
            if feature_vector is None or len(feature_vector) == 0:
                continue
            
            # Reshape for prediction
            feature_vector = feature_vector.reshape(1, -1)
            
            # Predict
            churn_probability = float(model.predict_proba(feature_vector)[0, 1])
            risk_segment = get_churn_risk_segment(churn_probability)
            
            predictions.append({
                "customer_id": str(customer.id),
                "external_customer_id": customer.external_customer_id,
                "churn_probability": churn_probability,
                "risk_segment": risk_segment
            })
        except Exception as e:
            # Skip customers with errors
            continue
    
    return pd.DataFrame(predictions)


def store_predictions(
    db: Session,
    organization_id: UUID,
    predictions_df: pd.DataFrame
) -> Dict[str, Any]:
    """
    Store churn predictions in database.
    
    Args:
        db: Database session
        organization_id: Organization UUID
        predictions_df: DataFrame with predictions
        
    Returns:
        Status dictionary
    """
    stored = 0
    errors = []
    
    for _, row in predictions_df.iterrows():
        try:
            customer_id = UUID(row["customer_id"])
            
            # Get or create prediction record
            prediction = db.query(ChurnPrediction).filter(
                ChurnPrediction.customer_id == customer_id
            ).first()
            
            if prediction:
                # Update existing
                prediction.churn_probability = row["churn_probability"]
                prediction.risk_segment = row["risk_segment"]
                prediction.last_updated = datetime.utcnow()
            else:
                # Create new
                prediction = ChurnPrediction(
                    customer_id=customer_id,
                    organization_id=organization_id,
                    churn_probability=row["churn_probability"],
                    risk_segment=row["risk_segment"]
                )
                db.add(prediction)
            
            stored += 1
            
            # Commit every 100 records
            if stored % 100 == 0:
                db.commit()
                
        except Exception as e:
            errors.append(f"Error storing prediction for {row.get('customer_id')}: {str(e)}")
            continue
    
    # Final commit
    db.commit()
    
    return {
        "success": True,
        "stored": stored,
        "errors": errors
    }

