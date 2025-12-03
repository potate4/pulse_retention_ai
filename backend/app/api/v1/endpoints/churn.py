"""
Churn Prediction API Endpoints
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import pandas as pd
import io

from app.api.deps import get_db
from app.db.models.organization import Organization
from app.db.models.customer import Customer
from app.db.models.data_processing_status import DataProcessingStatus
from app.db.models.model_metadata import ModelMetadata
from app.schemas.churn import (
    UploadStatusResponse,
    TrainingStatusResponse,
    ChurnPredictionResponse,
    BatchScoreResponse
)
from app.services.data_ingestion import (
    normalize_data,
    validate_data,
    store_transactions,
    update_processing_status,
    STANDARD_SCHEMA
)
from app.services.feature_engineering import batch_calculate_features
from app.services.churn_labeling import create_training_dataset
from app.services.ml_pipeline import (
    train_churn_model,
    save_model,
    store_model_metadata
)
from app.services.churn_predictor import (
    predict_churn,
    batch_predict,
    store_predictions
)

router = APIRouter()


def get_organization(org_id: uuid.UUID, db: Session) -> Organization:
    """Helper to get organization or raise 404."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization {org_id} not found"
        )
    return org


@router.post("/organizations/{org_id}/upload-data")
async def upload_data(
    org_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload CSV file following standard schema and process/store data.
    
    CSV must have these columns:
    - customer_id (required): Customer identifier
    - event_date (required): Transaction/activity date (YYYY-MM-DD format)
    - amount (optional): Transaction value
    - event_type (optional): Type of event ('purchase', 'login', etc.)
    - Any other columns will be stored in metadata
    """
    org = get_organization(org_id, db)
    
    # Update status
    update_processing_status(db, org_id, "processing", 0)
    
    try:
        # Read CSV
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Normalize data (assumes CSV follows standard schema)
        normalized = normalize_data(df, org_id)
        
        # Validate
        validation = validate_data(normalized)
        if not validation["valid"]:
            update_processing_status(
                db, org_id, "error", 
                validation["record_count"],
                validation["errors"]
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation failed: {validation['errors']}"
            )
        
        # Store transactions
        def status_callback(status_str, records):
            update_processing_status(db, org_id, status_str, records)
        
        result = store_transactions(db, org_id, normalized, status_callback)
        
        # Calculate features
        feature_result = batch_calculate_features(db, org_id)
        
        # Update status to ready
        update_processing_status(db, org_id, "ready", result["records_stored"])
        
        return {
            "success": True,
            "records_stored": result["records_stored"],
            "features_calculated": feature_result["processed"],
            "errors": result.get("errors", [])
        }
        
    except Exception as e:
        update_processing_status(
            db, org_id, "error", 0, [str(e)]
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing data: {str(e)}"
        )


@router.get("/organizations/{org_id}/data/status", response_model=UploadStatusResponse)
async def get_data_status(
    org_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get data processing status.
    """
    get_organization(org_id, db)
    
    status_obj = db.query(DataProcessingStatus).filter(
        DataProcessingStatus.organization_id == org_id
    ).first()
    
    if not status_obj:
        return UploadStatusResponse(
            status="not_started",
            records_processed=0,
            updated_at=datetime.utcnow()
        )
    
    return UploadStatusResponse(
        status=status_obj.status,
        records_processed=status_obj.records_processed,
        errors=status_obj.errors,
        updated_at=status_obj.updated_at
    )


@router.post("/organizations/{org_id}/train")
async def train_model(
    org_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Trigger model training for organization.
    """
    org = get_organization(org_id, db)
    
    try:
        # Train model
        model, metrics = train_churn_model(org_id, db)
        
        # Save model
        model_path = save_model(org_id, model, metrics)
        
        # Store metadata
        store_model_metadata(db, org_id, model_path, metrics)
        
        return {
            "success": True,
            "model_path": model_path,
            "metrics": metrics
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error training model: {str(e)}"
        )


@router.get("/organizations/{org_id}/model/status", response_model=TrainingStatusResponse)
async def get_model_status(
    org_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get model training status and metrics.
    """
    get_organization(org_id, db)
    
    metadata = db.query(ModelMetadata).filter(
        ModelMetadata.organization_id == org_id
    ).order_by(ModelMetadata.trained_at.desc()).first()
    
    if not metadata:
        return TrainingStatusResponse(
            status="not_trained",
            trained_at=None
        )
    
    return TrainingStatusResponse(
        status="trained",
        accuracy=float(metadata.accuracy) if metadata.accuracy else None,
        precision=float(metadata.precision) if metadata.precision else None,
        recall=float(metadata.recall) if metadata.recall else None,
        roc_auc=float(metadata.roc_auc) if metadata.roc_auc else None,
        trained_at=metadata.trained_at
    )


@router.get("/organizations/{org_id}/customers/{customer_id}/churn-risk", response_model=ChurnPredictionResponse)
async def get_customer_churn_risk(
    org_id: uuid.UUID,
    customer_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get churn prediction for a specific customer.
    """
    get_organization(org_id, db)
    
    # Verify customer exists
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.organization_id == org_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customer_id} not found"
        )
    
    try:
        probability, risk_segment = predict_churn(customer_id, org_id, db)
        
        return ChurnPredictionResponse(
            customer_id=customer_id,
            external_customer_id=customer.external_customer_id,
            churn_probability=probability,
            risk_segment=risk_segment
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error predicting churn: {str(e)}"
        )


@router.post("/organizations/{org_id}/customers/batch-score", response_model=BatchScoreResponse)
async def batch_score_customers(
    org_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Batch score all customers and store predictions.
    """
    get_organization(org_id, db)

    try:
        # Batch predict
        predictions_df = batch_predict(org_id, db)

        # Store predictions
        result = store_predictions(db, org_id, predictions_df)

        return BatchScoreResponse(
            success=True,
            predictions_stored=result["stored"],
            errors=result.get("errors")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in batch scoring: {str(e)}"
        )


@router.post("/organizations/{org_id}/customers/{customer_id}/analyze-churn-reason")
async def analyze_customer_churn_reason(
    org_id: uuid.UUID,
    customer_id: str,
    churn_probability: float,
    risk_level: str,
    db: Session = Depends(get_db)
):
    """
    Use LLM to analyze WHY a customer has their churn risk based on transaction patterns.
    """
    from app.services.behavior_analysis.llm_suggestions import analyze_churn_reason

    get_organization(org_id, db)

    try:
        result = analyze_churn_reason(
            customer_id=customer_id,
            organization_id=str(org_id),
            churn_probability=churn_probability,
            risk_level=risk_level,
            db=db
        )

        if result:
            return {"success": True, **result}
        else:
            return {
                "success": False,
                "analysis": "Unable to generate analysis. Please ensure OPENAI_API_KEY is set.",
                "key_patterns": [],
                "retention_tips": []
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing churn reason: {str(e)}"
        )


@router.post("/organizations/{org_id}/customers/{customer_id}/generate-personalized-email")
async def generate_personalized_email_endpoint(
    org_id: uuid.UUID,
    customer_id: str,
    churn_probability: float,
    risk_level: str,
    db: Session = Depends(get_db)
):
    """
    Use LLM to generate personalized retention email HTML for a customer.
    """
    from app.services.behavior_analysis.llm_suggestions import generate_personalized_email

    get_organization(org_id, db)

    try:
        result = generate_personalized_email(
            customer_id=customer_id,
            organization_id=str(org_id),
            churn_probability=churn_probability,
            risk_level=risk_level,
            db=db
        )

        if result:
            return {"success": True, **result}
        else:
            return {
                "success": False,
                "subject": "We'd Love to Have You Back!",
                "html_body": "<html><body><p>Unable to generate personalized email.</p></body></html>"
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating personalized email: {str(e)}"
        )


