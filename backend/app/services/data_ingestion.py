"""
Data Ingestion Service
Handles CSV upload and data normalization.
Assumes uploaded CSV follows the standard schema.
"""
import pandas as pd
import io
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid

from app.db.models.organization import Organization
from app.db.models.customer import Customer
from app.db.models.transaction import Transaction
from app.db.models.data_processing_status import DataProcessingStatus


# Standard schema that uploaded CSV must follow
STANDARD_SCHEMA = {
    "customer_id": str,      # Required: Customer identifier
    "event_date": "date",   # Required: Transaction/activity date
    "amount": float,         # Optional: Transaction value
    "event_type": str,       # Optional: Type of event ('purchase', 'login', etc.)
    "extra_data": dict         # Optional: Additional fields (will be stored as JSON)
}


def normalize_data(
    df: pd.DataFrame,
    organization_id: uuid.UUID
) -> pd.DataFrame:
    """
    Normalize data assuming CSV follows standard schema.
    
    Args:
        df: Raw DataFrame from CSV (must have standard column names)
        organization_id: Organization UUID
        
    Returns:
        Normalized DataFrame with proper data types
    """
    normalized = df.copy()
    
    # Ensure required fields exist
    if "customer_id" not in normalized.columns:
        raise ValueError("Required column 'customer_id' not found in CSV. CSV must follow standard schema.")
    if "event_date" not in normalized.columns:
        raise ValueError("Required column 'event_date' not found in CSV. CSV must follow standard schema.")
    
    # Convert data types
    normalized["customer_id"] = normalized["customer_id"].astype(str)
    
    # Parse dates
    normalized["event_date"] = pd.to_datetime(normalized["event_date"], errors="coerce")
    normalized = normalized.dropna(subset=["event_date"])  # Remove rows with invalid dates
    
    # Convert amount to float if present
    if "amount" in normalized.columns:
        normalized["amount"] = pd.to_numeric(normalized["amount"], errors="coerce")
    else:
        normalized["amount"] = None
    
    # Handle event_type if present
    if "event_type" in normalized.columns:
        normalized["event_type"] = normalized["event_type"].astype(str)
    else:
        normalized["event_type"] = None
    
    # Store any additional columns as extra_data
    standard_cols = ["customer_id", "event_date", "amount", "event_type"]
    other_cols = [col for col in df.columns if col not in standard_cols]
    
    if other_cols:
        # Convert additional columns to JSON records
        normalized["extra_data"] = df[other_cols].to_dict(orient="records")
    else:
        normalized["extra_data"] = None
    
    return normalized


def validate_data(normalized_data: pd.DataFrame) -> Dict[str, Any]:
    """
    Validate normalized data.
    
    Args:
        normalized_data: Normalized DataFrame
        
    Returns:
        Validation result dictionary
    """
    errors = []
    warnings = []
    
    # Check required fields
    if "customer_id" not in normalized_data.columns:
        errors.append("customer_id field is missing")
    if "event_date" not in normalized_data.columns:
        errors.append("event_date field is missing")
    
    # Check for empty data
    if len(normalized_data) == 0:
        errors.append("No valid records found after normalization")
    
    # Check for duplicate customer_id + event_date combinations
    if len(normalized_data) > 0:
        duplicates = normalized_data.duplicated(subset=["customer_id", "event_date"]).sum()
        if duplicates > 0:
            warnings.append(f"Found {duplicates} duplicate records (same customer_id + event_date)")
    
    # Check date range
    if "event_date" in normalized_data.columns and len(normalized_data) > 0:
        min_date = normalized_data["event_date"].min()
        max_date = normalized_data["event_date"].max()
        if pd.isna(min_date) or pd.isna(max_date):
            errors.append("Invalid date range in event_date")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "record_count": len(normalized_data)
    }


def store_transactions(
    db: Session,
    organization_id: uuid.UUID,
    normalized_data: pd.DataFrame,
    status_callback: Optional[callable] = None
) -> Dict[str, Any]:
    """
    Store normalized transactions in database.
    
    Args:
        db: Database session
        organization_id: Organization UUID
        normalized_data: Normalized DataFrame
        status_callback: Optional callback to update processing status
        
    Returns:
        Status dictionary with records stored
    """
    try:
        # Update status to processing
        if status_callback:
            status_callback("processing", 0)
        
        # Get or create customers
        customer_map = {}  # external_customer_id -> Customer object
        records_stored = 0
        errors = []
        
        # Process in batches
        batch_size = 1000
        for i in range(0, len(normalized_data), batch_size):
            batch = normalized_data.iloc[i:i+batch_size]
            
            for _, row in batch.iterrows():
                try:
                    external_customer_id = str(row["customer_id"])
                    
                    # Get or create customer
                    if external_customer_id not in customer_map:
                        customer = db.query(Customer).filter(
                            and_(
                                Customer.organization_id == organization_id,
                                Customer.external_customer_id == external_customer_id
                            )
                        ).first()
                        
                        if not customer:
                            customer = Customer(
                                id=uuid.uuid4(),
                                organization_id=organization_id,
                                external_customer_id=external_customer_id
                            )
                            db.add(customer)
                            db.flush()
                        
                        customer_map[external_customer_id] = customer
                    
                    customer = customer_map[external_customer_id]
                    
                    # Create transaction
                    transaction = Transaction(
                        id=uuid.uuid4(),
                        customer_id=customer.id,
                        organization_id=organization_id,
                        event_date=row["event_date"].date() if hasattr(row["event_date"], "date") else row["event_date"],
                        amount=float(row["amount"]) if "amount" in row and pd.notna(row["amount"]) else None,
                        event_type=str(row["event_type"]) if "event_type" in row and pd.notna(row["event_type"]) else None,
                        extra_data=row.get("extra_data")
                    )
                    db.add(transaction)
                    records_stored += 1
                    
                except Exception as e:
                    errors.append(f"Error processing row {i}: {str(e)}")
            
            # Commit batch
            db.commit()
            
            # Update status
            if status_callback:
                status_callback("processing", records_stored)
        
        return {
            "success": True,
            "records_stored": records_stored,
            "errors": errors
        }
        
    except Exception as e:
        db.rollback()
        raise Exception(f"Error storing transactions: {str(e)}")


def update_processing_status(
    db: Session,
    organization_id: uuid.UUID,
    status: str,
    records_processed: int = 0,
    errors: Optional[List[str]] = None
) -> DataProcessingStatus:
    """
    Update or create data processing status.
    
    Args:
        db: Database session
        organization_id: Organization UUID
        status: Status string ('uploaded', 'processing', 'features_calculated', 'ready', 'error')
        records_processed: Number of records processed
        errors: List of error messages
        
    Returns:
        DataProcessingStatus object
    """
    processing_status = db.query(DataProcessingStatus).filter(
        DataProcessingStatus.organization_id == organization_id
    ).first()
    
    if not processing_status:
        processing_status = DataProcessingStatus(
            id=uuid.uuid4(),
            organization_id=organization_id,
            status=status,
            records_processed=records_processed,
            errors=errors or []
        )
        db.add(processing_status)
    else:
        processing_status.status = status
        processing_status.records_processed = records_processed
        if errors:
            processing_status.errors = errors
    
    db.commit()
    db.refresh(processing_status)
    return processing_status

