"""
Churn Prediction API Endpoints - V2
New simplified flow using Supabase storage without database transactions.
"""
import uuid
import pandas as pd
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db
from app.db.models.organization import Organization
from app.db.models.dataset import Dataset
from app.db.models.model_metadata import ModelMetadata
from app.db.models.prediction_batch import PredictionBatch, CustomerPrediction
from app.services.storage import (
    upload_to_supabase,
    upload_dataframe_to_supabase,
    download_from_supabase
)
from app.services.feature_engineering_csv import (
    engineer_features_from_csv,
    create_training_dataset_from_csv
)
from app.services.ml_training import (
    train_churn_model_from_dataframe,
    save_model_to_disk,
    load_model_from_disk,
    predict_from_features,
    FEATURE_COLUMNS
)

# V2 Enhanced services for better accuracy (AUTO-ENABLED)
from app.services.feature_engineering_v2 import (
    engineer_features_from_csv_v2,
    get_feature_columns_v2
)
from app.services.ml_training_v2 import (
    train_churn_model_v2,
    save_model_v2,
    load_model_v2,
    predict_v2
)

# USE V2 BY DEFAULT
USE_V2_ENHANCED = True  # Set to False to use original methods

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


@router.post("/organizations/{org_id}/upload-dataset")
async def upload_dataset(
    org_id: uuid.UUID,
    file: UploadFile = File(...),
    has_churn_label: bool = False,
    db: Session = Depends(get_db)
):
    """
    Step 1: Upload customer transaction CSV to Supabase storage.

    CSV must have these columns:
        - customer_id (required): Customer identifier
        - event_date (required): Transaction date (YYYY-MM-DD)
        - amount (optional): Transaction value
        - event_type (optional): Type of event
        - churn_label (optional): 0 or 1 if has_churn_label=True

    The CSV is uploaded to Supabase bucket 'datasets' and the URL is stored in the database.

    Args:
        org_id: Organization UUID
        file: CSV file
        has_churn_label: Whether the CSV includes churn labels (default: False)
        db: Database session

    Returns:
        dataset_id, file_url, status
    """
    org = get_organization(org_id, db)

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )

    try:
        # Upload to Supabase
        upload_result = await upload_to_supabase(
            file=file,
            bucket_name="datasets",
            folder=f"org_{org_id}/raw",
            custom_filename=None  # Auto-generate unique filename
        )

        # Read CSV to get row count
        file.file.seek(0)
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        row_count = len(df)

        # Create dataset record
        dataset = Dataset(
            id=uuid.uuid4(),
            organization_id=org_id,
            dataset_type="raw",
            file_url=upload_result["file_url"],
            bucket_name=upload_result["bucket_name"],
            file_path=upload_result["file_path"],
            filename=upload_result["filename"],
            file_size=upload_result["size"],
            row_count=row_count,
            has_churn_label=str(has_churn_label),
            status="uploaded"
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return {
            "success": True,
            "dataset_id": str(dataset.id),
            "file_url": dataset.file_url,
            "row_count": row_count,
            "status": "uploaded",
            "message": "Dataset uploaded successfully to Supabase storage"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading dataset: {str(e)}"
        )


async def process_features_background(
    org_id: uuid.UUID,
    dataset_id: uuid.UUID,
    db_session: Session
):
    """
    Background task: Download CSV, engineer features, upload features CSV to Supabase.
    """
    try:
        # Get dataset
        dataset = db_session.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            return

        # Update status
        dataset.status = "processing"
        db_session.commit()

        # Download CSV from Supabase
        csv_bytes = download_from_supabase(dataset.bucket_name, dataset.file_path)
        df = pd.read_csv(io.BytesIO(csv_bytes))

        # Engineer features (V2 enhanced or original)
        has_churn = dataset.has_churn_label == "True"
        if USE_V2_ENHANCED:
            features_df = engineer_features_from_csv_v2(df, has_churn_label=has_churn)
        else:
            features_df = engineer_features_from_csv(df, has_churn_label=has_churn)

        # Convert to CSV bytes
        features_csv = features_df.to_csv(index=False).encode('utf-8')

        # Upload features CSV to Supabase
        features_result = await upload_dataframe_to_supabase(
            df_csv_bytes=features_csv,
            bucket_name="utils",
            folder=f"org_{org_id}/features",
            filename=f"features_{dataset_id}.csv"
        )

        # Store features dataset record
        features_dataset = Dataset(
            id=uuid.uuid4(),
            organization_id=org_id,
            dataset_type="features",
            file_url=features_result["file_url"],
            bucket_name=features_result["bucket_name"],
            file_path=features_result["file_path"],
            filename=features_result["filename"],
            file_size=features_result["size"],
            row_count=len(features_df),
            has_churn_label=dataset.has_churn_label,
            status="ready"
        )
        db_session.add(features_dataset)

        # Update raw dataset status
        dataset.status = "features_ready"
        db_session.commit()

    except Exception as e:
        dataset.status = "error"
        db_session.commit()
        print(f"Error processing features: {str(e)}")


@router.post("/organizations/{org_id}/datasets/{dataset_id}/process-features")
async def process_features(
    org_id: uuid.UUID,
    dataset_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Step 2: Download CSV, engineer features, and upload features CSV to Supabase 'utils' bucket.

    This is a background task. The features will be calculated from the raw CSV and
    a new features CSV will be uploaded to Supabase.

    Args:
        org_id: Organization UUID
        dataset_id: Dataset UUID from Step 1
        background_tasks: FastAPI background tasks
        db: Database session

    Returns:
        Status message
    """
    org = get_organization(org_id, db)

    # Get dataset
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.organization_id == org_id,
        Dataset.dataset_type == "raw"
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found"
        )

    # Add background task
    background_tasks.add_task(process_features_background, org_id, dataset_id, db)

    return {
        "success": True,
        "message": "Feature engineering started in background",
        "dataset_id": str(dataset_id)
    }


async def train_model_background(
    org_id: uuid.UUID,
    model_type: str,
    churn_threshold_days: int,
    db_session: Session
):
    """
    Background task: Train churn prediction model.
    """
    try:
        # Create model metadata record
        model_metadata = ModelMetadata(
            id=uuid.uuid4(),
            organization_id=org_id,
            model_path="",  # Will update after training
            model_type=model_type,
            status="training"
        )
        db_session.add(model_metadata)
        db_session.commit()
        db_session.refresh(model_metadata)

        # Get latest features dataset
        features_dataset = db_session.query(Dataset).filter(
            Dataset.organization_id == org_id,
            Dataset.dataset_type == "features",
            Dataset.status == "ready"
        ).order_by(Dataset.uploaded_at.desc()).first()

        if not features_dataset:
            model_metadata.status = "failed"
            model_metadata.error_message = "No features dataset found"
            db_session.commit()
            return

        # Download features CSV
        features_bytes = download_from_supabase(
            features_dataset.bucket_name,
            features_dataset.file_path
        )
        features_df = pd.read_csv(io.BytesIO(features_bytes))

        # If no churn label, get raw dataset and generate labels
        if features_dataset.has_churn_label != "True":
            # Get raw dataset
            raw_dataset = db_session.query(Dataset).filter(
                Dataset.organization_id == org_id,
                Dataset.dataset_type == "raw",
                Dataset.status.in_(["uploaded", "features_ready"])
            ).order_by(Dataset.uploaded_at.desc()).first()

            if not raw_dataset:
                model_metadata.status = "failed"
                model_metadata.error_message = "No raw dataset found for labeling"
                db_session.commit()
                return

            # Download raw CSV
            raw_bytes = download_from_supabase(raw_dataset.bucket_name, raw_dataset.file_path)
            raw_df = pd.read_csv(io.BytesIO(raw_bytes))

            # Generate training dataset with labels
            from app.services.feature_engineering_csv import create_training_dataset_from_csv
            training_df = create_training_dataset_from_csv(raw_df, churn_threshold_days)

        else:
            training_df = features_df

        # Train model (V2 enhanced or original)
        if USE_V2_ENHANCED:
            # V2: Use enhanced features and auto model selection
            feature_cols = get_feature_columns_v2()
            pipeline, metrics = train_churn_model_v2(
                training_df=training_df,
                feature_columns=feature_cols,
                model_type="auto",  # Auto-select best model
                enable_tuning=True,  # Enable hyperparameter tuning
                enable_scaling=True  # Enable feature scaling
            )
            # Save V2 model
            model_path = save_model_v2(pipeline, str(org_id), metrics)
        else:
            # Original method
            model, metrics = train_churn_model_from_dataframe(
                training_df=training_df,
                model_type=model_type
            )
            model_path = save_model_to_disk(model, str(org_id), metrics)

        # Update metadata
        model_metadata.model_path = model_path
        model_metadata.status = "completed"
        model_metadata.accuracy = metrics.get("accuracy")
        model_metadata.precision = metrics.get("precision")
        model_metadata.recall = metrics.get("recall")
        model_metadata.f1_score = metrics.get("f1_score")
        model_metadata.roc_auc = metrics.get("roc_auc")
        model_metadata.feature_importance = metrics.get("feature_importance")
        model_metadata.training_samples = metrics.get("total_samples")
        model_metadata.churn_rate = metrics.get("churn_rate")
        db_session.commit()

    except Exception as e:
        model_metadata.status = "failed"
        model_metadata.error_message = str(e)
        db_session.commit()
        print(f"Error training model: {str(e)}")


@router.post("/organizations/{org_id}/train")
async def train_model(
    org_id: uuid.UUID,
    model_type: str = "logistic_regression",
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Step 3: Train churn prediction model (background task).

    Downloads the latest features dataset, trains a model, and saves it locally.
    If the dataset doesn't have churn labels, it will auto-generate them based on
    the organization's churn threshold.

    Args:
        org_id: Organization UUID
        model_type: Model type ('logistic_regression', 'random_forest', 'gradient_boosting')
        background_tasks: FastAPI background tasks
        db: Database session

    Returns:
        Training job status
    """
    org = get_organization(org_id, db)

    # Validate model type
    valid_models = ["logistic_regression", "random_forest", "gradient_boosting"]
    if model_type not in valid_models:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid model_type. Must be one of: {', '.join(valid_models)}"
        )

    # Add background task
    background_tasks.add_task(
        train_model_background,
        org_id,
        model_type,
        org.churn_threshold_days,
        db
    )

    return {
        "success": True,
        "message": "Model training started in background",
        "model_type": model_type
    }


@router.get("/organizations/{org_id}/training-status")
async def get_training_status(
    org_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get training status and metrics.

    Returns the latest model training status for the organization.
    """
    org = get_organization(org_id, db)

    metadata = db.query(ModelMetadata).filter(
        ModelMetadata.organization_id == org_id
    ).order_by(ModelMetadata.trained_at.desc()).first()

    if not metadata:
        return {
            "status": "not_started",
            "message": "No training job found"
        }

    return {
        "status": metadata.status,
        "model_type": metadata.model_type,
        "accuracy": float(metadata.accuracy) if metadata.accuracy else None,
        "precision": float(metadata.precision) if metadata.precision else None,
        "recall": float(metadata.recall) if metadata.recall else None,
        "f1_score": float(metadata.f1_score) if metadata.f1_score else None,
        "roc_auc": float(metadata.roc_auc) if metadata.roc_auc else None,
        "training_samples": metadata.training_samples,
        "churn_rate": float(metadata.churn_rate) if metadata.churn_rate else None,
        "trained_at": metadata.trained_at,
        "error_message": metadata.error_message
    }


@router.post("/organizations/{org_id}/predict")
async def predict_churn(
    org_id: uuid.UUID,
    customer_data: dict,
    db: Session = Depends(get_db)
):
    """
    Step 4: Get churn prediction for a customer.

    Provide customer transaction data and get back churn probability.

    Expected input format:
    {
        "customer_id": "CUST-001",
        "transactions": [
            {"event_date": "2024-01-15", "amount": 150.50, "event_type": "purchase"},
            {"event_date": "2024-01-20", "amount": 200.00, "event_type": "purchase"}
        ]
    }

    Returns:
        {
            "customer_id": "CUST-001",
            "churn_probability": 0.23,
            "risk_segment": "Low"
        }
    """
    org = get_organization(org_id, db)

    try:
        # Convert input to DataFrame
        customer_id = customer_data.get("customer_id")
        transactions = customer_data.get("transactions", [])

        if not customer_id or not transactions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must provide customer_id and transactions"
            )

        # Build transactions DataFrame
        trans_df = pd.DataFrame(transactions)
        trans_df["customer_id"] = customer_id

        # Load model and predict (V2 or original)
        if USE_V2_ENHANCED:
            pipeline = load_model_v2(str(org_id))
            features_df = engineer_features_from_csv_v2(trans_df, has_churn_label=False)
            predictions = predict_v2(pipeline, features_df)
        else:
            model = load_model_from_disk(str(org_id))
            features_df = engineer_features_from_csv(trans_df, has_churn_label=False)
            predictions = predict_from_features(model, features_df)

        return predictions.to_dict(orient="records")[0]

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No trained model found for organization {org_id}. Please train a model first."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error predicting churn: {str(e)}"
        )


async def process_bulk_predictions_background(
    org_id: uuid.UUID,
    batch_id: uuid.UUID,
    csv_content: bytes,
    db_session: Session
):
    """
    Background task: Process bulk predictions from uploaded CSV.
    """
    try:
        # Get batch
        batch = db_session.query(PredictionBatch).filter(PredictionBatch.id == batch_id).first()
        if not batch:
            return

        batch.status = "processing"
        db_session.commit()

        # Read CSV
        df = pd.read_csv(io.BytesIO(csv_content))

        # Load model and predict (V2 or original)
        if USE_V2_ENHANCED:
            pipeline = load_model_v2(str(org_id))
            features_df = engineer_features_from_csv_v2(df, has_churn_label=False)
            predictions_df = predict_v2(pipeline, features_df)
            feature_cols = get_feature_columns_v2()
        else:
            model = load_model_from_disk(str(org_id))
            features_df = engineer_features_from_csv(df, has_churn_label=False)
            predictions_df = predict_from_features(model, features_df)
            feature_cols = FEATURE_COLUMNS

        # Store predictions in database
        risk_distribution = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}

        for _, row in predictions_df.iterrows():
            # Get features for this customer
            customer_features_df = features_df[features_df["customer_id"] == row["customer_id"]]
            if len(customer_features_df) > 0:
                feature_dict = {
                    col: float(customer_features_df[col].values[0])
                    for col in feature_cols
                    if col in customer_features_df.columns
                }
            else:
                feature_dict = None

            # Store individual prediction
            customer_pred = CustomerPrediction(
                id=uuid.uuid4(),
                batch_id=batch_id,
                organization_id=org_id,
                external_customer_id=str(row["customer_id"]),
                churn_probability=str(row["churn_probability"]),
                risk_segment=row["risk_segment"],
                features=feature_dict
            )
            db_session.add(customer_pred)

            # Update risk distribution
            risk_distribution[row["risk_segment"]] += 1

        # Upload predictions CSV to Supabase
        predictions_csv = predictions_df.to_csv(index=False).encode('utf-8')
        output_result = await upload_dataframe_to_supabase(
            df_csv_bytes=predictions_csv,
            bucket_name="utils",
            folder=f"org_{org_id}/predictions",
            filename=f"predictions_{batch_id}.csv"
        )

        # Update batch with results
        batch.status = "completed"
        batch.output_file_url = output_result["file_url"]
        batch.avg_churn_probability = str(predictions_df["churn_probability"].mean())
        batch.risk_distribution = risk_distribution
        batch.completed_at = datetime.utcnow()
        db_session.commit()

    except Exception as e:
        batch.status = "failed"
        batch.error_message = str(e)
        db_session.commit()
        print(f"Error in bulk predictions: {str(e)}")


@router.post("/organizations/{org_id}/predict-bulk")
async def predict_bulk(
    org_id: uuid.UUID,
    file: UploadFile = File(...),
    batch_name: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Bulk inference: Upload CSV with customer data and get predictions for all customers.

    This endpoint:
    1. Uploads CSV to Supabase storage
    2. Engineers features from customer transaction data
    3. Runs inference on all customers
    4. Stores predictions in database
    5. Returns predictions CSV

    Expected CSV format:
    ```csv
    customer_id,event_date,amount,event_type
    CUST-001,2024-01-15,150.50,purchase
    CUST-001,2024-01-20,200.00,purchase
    CUST-002,2024-01-16,75.00,login
    ```

    Returns:
        - batch_id: ID to track this prediction batch
        - Status and download URL when ready

    Args:
        org_id: Organization UUID
        file: CSV file with customer transaction data
        batch_name: Optional name for this batch
        background_tasks: FastAPI background tasks
        db: Database session
    """
    org = get_organization(org_id, db)

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )

    try:
        # Read CSV content
        csv_content = await file.read()
        df = pd.read_csv(io.BytesIO(csv_content))

        # Validate CSV has required columns
        if "customer_id" not in df.columns or "event_date" not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV must contain 'customer_id' and 'event_date' columns"
            )

        # Count unique customers
        total_customers = df["customer_id"].nunique()

        # Upload input CSV to Supabase
        file.file.seek(0)
        upload_result = await upload_to_supabase(
            file=file,
            bucket_name="utils",
            folder=f"org_{org_id}/inference_inputs",
            custom_filename=None
        )

        # Create prediction batch record
        batch = PredictionBatch(
            id=uuid.uuid4(),
            organization_id=org_id,
            batch_name=batch_name or f"Batch {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            total_customers=total_customers,
            input_file_url=upload_result["file_url"],
            status="processing"
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)

        # Process predictions in background
        background_tasks.add_task(
            process_bulk_predictions_background,
            org_id,
            batch.id,
            csv_content,
            db
        )

        return {
            "success": True,
            "batch_id": str(batch.id),
            "batch_name": batch.batch_name,
            "total_customers": total_customers,
            "status": "processing",
            "message": "Predictions are being generated in background. Use /prediction-batches/{batch_id} to check status."
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing bulk predictions: {str(e)}"
        )


@router.get("/organizations/{org_id}/prediction-batches/{batch_id}")
async def get_prediction_batch(
    org_id: uuid.UUID,
    batch_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Get status and results of a prediction batch.

    Returns:
        - Batch status
        - Download URL for predictions CSV
        - Summary statistics (risk distribution, avg probability)
        - Individual predictions
    """
    org = get_organization(org_id, db)

    batch = db.query(PredictionBatch).filter(
        PredictionBatch.id == batch_id,
        PredictionBatch.organization_id == org_id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction batch {batch_id} not found"
        )

    # Get predictions count
    predictions_count = db.query(CustomerPrediction).filter(
        CustomerPrediction.batch_id == batch_id
    ).count()

    response = {
        "batch_id": str(batch.id),
        "batch_name": batch.batch_name,
        "status": batch.status,
        "total_customers": batch.total_customers,
        "predictions_generated": predictions_count,
        "input_file_url": batch.input_file_url,
        "output_file_url": batch.output_file_url,
        "avg_churn_probability": batch.avg_churn_probability,
        "risk_distribution": batch.risk_distribution,
        "created_at": batch.created_at,
        "completed_at": batch.completed_at,
        "error_message": batch.error_message
    }

    return response


@router.get("/organizations/{org_id}/prediction-batches/{batch_id}/predictions")
async def get_batch_predictions(
    org_id: uuid.UUID,
    batch_id: uuid.UUID,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get individual customer predictions from a batch with segmentation and behavior data.

    Args:
        org_id: Organization UUID
        batch_id: Batch UUID
        limit: Number of predictions to return (default: 100)
        offset: Offset for pagination (default: 0)

    Returns:
        List of predictions with customer_id, probability, risk segment, segment, and recommendations
    """
    from app.db.models.customer_segment import CustomerSegment
    from app.db.models.behavior_analysis import BehaviorAnalysis
    
    org = get_organization(org_id, db)

    # Verify batch exists
    batch = db.query(PredictionBatch).filter(
        PredictionBatch.id == batch_id,
        PredictionBatch.organization_id == org_id
    ).first()

    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction batch {batch_id} not found"
        )

    # Get predictions with joined segmentation and behavior data
    # Note: customer_id in CustomerSegment and BehaviorAnalysis now stores external_customer_id directly
    predictions = db.query(
        CustomerPrediction,
        CustomerSegment,
        BehaviorAnalysis
    ).outerjoin(
        CustomerSegment,
        CustomerSegment.customer_id == CustomerPrediction.external_customer_id
    ).outerjoin(
        BehaviorAnalysis,
        BehaviorAnalysis.customer_id == CustomerPrediction.external_customer_id
    ).filter(
        CustomerPrediction.batch_id == batch_id
    ).limit(limit).offset(offset).all()

    total = db.query(CustomerPrediction).filter(CustomerPrediction.batch_id == batch_id).count()

    return {
        "batch_id": str(batch_id),
        "total": total,
        "limit": limit,
        "offset": offset,
        "predictions": [
            {
                "customer_id": pred.external_customer_id,
                "churn_probability": pred.churn_probability,
                "risk_segment": pred.risk_segment,
                "segment": segment.segment if segment else None,
                "recommendations": behavior.recommendations if behavior else None,
                "features": pred.features,
                "predicted_at": pred.predicted_at
            }
            for pred, segment, behavior in predictions
        ]
    }


@router.get("/organizations/{org_id}/prediction-batches")
async def list_prediction_batches(
    org_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    List all prediction batches for an organization.

    Returns:
        List of batches with summary info
    """
    org = get_organization(org_id, db)

    batches = db.query(PredictionBatch).filter(
        PredictionBatch.organization_id == org_id
    ).order_by(PredictionBatch.created_at.desc()).limit(limit).offset(offset).all()

    total = db.query(PredictionBatch).filter(
        PredictionBatch.organization_id == org_id
    ).count()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "batches": [
            {
                "batch_id": str(batch.id),
                "batch_name": batch.batch_name,
                "status": batch.status,
                "total_customers": batch.total_customers,
                "avg_churn_probability": batch.avg_churn_probability,
                "risk_distribution": batch.risk_distribution,
                "created_at": batch.created_at,
                "completed_at": batch.completed_at,
                "output_file_url": batch.output_file_url
            }
            for batch in batches
        ]
    }


@router.get("/organizations/{org_id}/prediction-customers")
async def get_prediction_customers(
    org_id: uuid.UUID,
    risk_segment: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get all customers from prediction batches with optional risk segment filtering.
    
    Args:
        org_id: Organization UUID
        risk_segment: Optional filter by risk segment (Low, Medium, High, Critical)
        limit: Number of customers to return (default: 100)
        offset: Pagination offset (default: 0)
    
    Returns:
        List of customers with prediction data from all batches
    """
    org = get_organization(org_id, db)
    
    # Build query for CustomerPrediction with join to PredictionBatch
    query = db.query(CustomerPrediction, PredictionBatch).join(
        PredictionBatch,
        CustomerPrediction.batch_id == PredictionBatch.id
    ).filter(
        CustomerPrediction.organization_id == org_id
    )
    
    # Apply risk segment filter if provided
    if risk_segment:
        query = query.filter(CustomerPrediction.risk_segment == risk_segment)
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination and ordering
    results = query.order_by(
        CustomerPrediction.predicted_at.desc()
    ).limit(limit).offset(offset).all()
    
    # Format response
    customers = []
    for pred, batch in results:
        customers.append({
            "customer_id": pred.external_customer_id,
            "churn_probability": float(pred.churn_probability),
            "risk_segment": pred.risk_segment,
            "batch_id": str(pred.batch_id),
            "batch_name": batch.batch_name,
            "predicted_at": pred.predicted_at.isoformat() if pred.predicted_at else None
        })
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "customers": customers
    }


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

    Args:
        org_id: Organization UUID
        customer_id: External customer ID
        churn_probability: Churn probability (0-1)
        risk_level: Risk level (Low/Medium/High/Critical)

    Returns:
        {
            "success": bool,
            "analysis": str,
            "key_patterns": [str],
            "retention_tips": [str]
        }
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
            return {
                "success": True,
                **result
            }
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

