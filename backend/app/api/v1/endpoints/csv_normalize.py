"""
Dynamic CSV Normalization API Endpoint

This endpoint allows users to upload a CSV file and specify a custom schema.
The LLM will generate a normalization script, execute it, and return the
normalized CSV uploaded to Supabase.
"""

import os
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
import pandas as pd
import json

from app.schemas.csv_normalization import NormalizeResponse, SchemaField
from app.services.dynamic_llm_normalizer import normalize_with_dynamic_llm
from app.services.storage import upload_dataframe_to_supabase

router = APIRouter()


@router.post("/normalize", response_model=NormalizeResponse)
async def normalize_csv(
    file: UploadFile = File(..., description="CSV file to normalize"),
    expected_schema: str = Form(..., description="JSON array of schema fields: [{\"column_name\": \"...\", \"description\": \"...\"}]"),
    max_attempts: int = Form(default=5, ge=1, le=10, description="Maximum LLM retry attempts")
):
    """
    Normalize a CSV file to a custom expected schema using LLM-generated code.

    **How it works:**
    1. Upload a CSV file with any columns
    2. Provide the expected schema as a JSON array of objects with column_name and description
    3. The LLM generates a Python script to transform your CSV to match the schema
    4. The script is executed and validated
    5. The normalized CSV is uploaded to Supabase
    6. You receive a public URL to download the normalized CSV

    **Example expected_schema:**
    ```json
    [
        {"column_name": "customer_id", "description": "Unique customer identifier (string)"},
        {"column_name": "purchase_date", "description": "Date of purchase in YYYY-MM-DD format"},
        {"column_name": "total_amount", "description": "Total purchase amount (numeric, non-negative)"},
        {"column_name": "product_category", "description": "Category of the purchased product (string)"}
    ]
    ```

    **Returns:**
    - success: Whether normalization succeeded
    - output_csv_url: Public URL of the normalized CSV in Supabase
    - attempts: Number of LLM attempts taken
    - generated_script: The Python script used for normalization
    """

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported"
        )

    # Parse expected_schema JSON
    try:
        schema_data = json.loads(expected_schema)
        schema_fields = [SchemaField(**field) for field in schema_data]
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON in expected_schema: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid schema format: {str(e)}"
        )

    if len(schema_fields) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expected_schema must contain at least one field"
        )

    # Convert schema to list of tuples for the normalizer
    expected_schema_tuples: List[tuple] = [
        (field.column_name, field.description) for field in schema_fields
    ]

    # Create temp directory for processing
    with tempfile.TemporaryDirectory() as tmpdir:
        # Save uploaded file
        input_path = Path(tmpdir) / f"input_{file.filename}"
        output_path = Path(tmpdir) / f"output_{file.filename}"

        try:
            contents = await file.read()
            input_path.write_bytes(contents)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save uploaded file: {str(e)}"
            )

        # Validate input CSV can be read
        try:
            df_test = pd.read_csv(str(input_path))
            if len(df_test) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Input CSV is empty (0 rows)"
                )
        except pd.errors.EmptyDataError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Input CSV is empty or malformed"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read input CSV: {str(e)}"
            )

        # Run LLM normalization
        try:
            success, metadata = normalize_with_dynamic_llm(
                input_csv=str(input_path),
                output_csv=str(output_path),
                expected_schema=expected_schema_tuples,
                max_attempts=max_attempts,
                gemini_timeout_sec=60,
                script_timeout_sec=60,
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LLM normalization failed: {str(e)}"
            )

        # Handle failure
        if not success:
            return NormalizeResponse(
                success=False,
                message="Failed to normalize CSV after maximum attempts",
                attempts=metadata.get("attempts"),
                error_details={
                    "last_error_text": metadata.get("last_error_text"),
                    "last_error_list": metadata.get("last_error_list"),
                    "last_script": metadata.get("last_script"),
                }
            )

        # At this point, the CSV has been successfully normalized AND validated
        # Now upload the validated output CSV to Supabase
        try:
            # Read the validated output CSV as bytes
            output_csv_bytes = output_path.read_bytes()

            # Generate unique filename with timestamp
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"{timestamp}_{unique_id}_{file.filename}"

            # Upload to Supabase using the storage service
            bucket_name = "csv-files"
            upload_result = await upload_dataframe_to_supabase(
                df_csv_bytes=output_csv_bytes,
                bucket_name=bucket_name,
                folder="normalized_csv",
                filename=filename
            )

            # Extract the public URL from the upload result
            public_url = upload_result["file_url"]

        except Exception as e:
            # Even if upload fails, normalization succeeded
            # Return success with error note
            return NormalizeResponse(
                success=True,
                message=f"CSV normalized successfully, but failed to upload to Supabase: {str(e)}",
                attempts=metadata.get("attempts"),
                generated_script=metadata.get("generated_script"),
                error_details={"upload_error": str(e)}
            )

        # Complete success - CSV normalized, validated, and uploaded!
        return NormalizeResponse(
            success=True,
            message="CSV normalized, validated, and uploaded successfully to Supabase",
            output_csv_url=public_url,
            attempts=metadata.get("attempts"),
            generated_script=metadata.get("generated_script")
        )
