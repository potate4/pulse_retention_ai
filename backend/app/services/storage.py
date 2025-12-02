"""
Supabase Storage Service
Handles file uploads and downloads to/from Supabase storage buckets.
"""
import os
import io
import uuid
from typing import Dict, Any, BinaryIO, Optional
from pathlib import Path
from fastapi import UploadFile
from app.core.supabase import supabase


async def upload_to_supabase(
    file: UploadFile,
    bucket_name: str,
    folder: str = "",
    custom_filename: Optional[str] = None
) -> Dict[str, str]:
    """
    Upload a file to Supabase storage bucket.

    Args:
        file: FastAPI UploadFile object
        bucket_name: Name of the Supabase bucket
        folder: Optional folder path within bucket
        custom_filename: Optional custom filename (uses original if not provided)

    Returns:
        Dictionary with file_path, file_url, bucket_name, filename

    Raises:
        Exception: If upload fails
    """
    try:
        # Generate unique filename if not provided
        if custom_filename:
            filename = custom_filename
        else:
            # Keep original extension, add UUID prefix
            ext = Path(file.filename).suffix
            filename = f"{uuid.uuid4()}{ext}"

        # Build file path
        if folder:
            file_path = f"{folder}/{filename}"
        else:
            file_path = filename

        # Read file content
        content = await file.read()

        # Upload to Supabase
        response = supabase.storage.from_(bucket_name).upload(
            file_path,
            content,
            file_options={
                "content-type": file.content_type or "text/csv",
                "upsert": "false"
            }
        )

        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

        return {
            "file_path": file_path,
            "file_url": public_url,
            "bucket_name": bucket_name,
            "filename": file.filename,
            "size": len(content)
        }

    except Exception as e:
        raise Exception(f"Failed to upload file to Supabase: {str(e)}")


async def upload_dataframe_to_supabase(
    df_csv_bytes: bytes,
    bucket_name: str,
    folder: str = "",
    filename: Optional[str] = None
) -> Dict[str, str]:
    """
    Upload a DataFrame (as CSV bytes) to Supabase storage bucket.

    Args:
        df_csv_bytes: CSV content as bytes
        bucket_name: Name of the Supabase bucket
        folder: Optional folder path within bucket
        filename: Optional custom filename (generates one if not provided)

    Returns:
        Dictionary with file_path, file_url, bucket_name, filename

    Raises:
        Exception: If upload fails
    """
    try:
        # Generate filename if not provided
        if not filename:
            filename = f"{uuid.uuid4()}.csv"

        # Build file path
        if folder:
            file_path = f"{folder}/{filename}"
        else:
            file_path = filename

        # Upload to Supabase
        response = supabase.storage.from_(bucket_name).upload(
            file_path,
            df_csv_bytes,
            file_options={
                "content-type": "text/csv",
                "upsert": "false"
            }
        )

        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

        return {
            "file_path": file_path,
            "file_url": public_url,
            "bucket_name": bucket_name,
            "filename": filename,
            "size": len(df_csv_bytes)
        }

    except Exception as e:
        raise Exception(f"Failed to upload DataFrame to Supabase: {str(e)}")


def download_from_supabase(
    bucket_name: str,
    file_path: str
) -> bytes:
    """
    Download a file from Supabase storage bucket.

    Args:
        bucket_name: Name of the Supabase bucket
        file_path: Path to file within bucket

    Returns:
        File content as bytes

    Raises:
        Exception: If download fails
    """
    try:
        response = supabase.storage.from_(bucket_name).download(file_path)
        return response

    except Exception as e:
        raise Exception(f"Failed to download file from Supabase: {str(e)}")


async def save_local_copy(
    file_content: bytes,
    local_dir: str,
    filename: str
) -> str:
    """
    Save a file locally (for processing).

    Args:
        file_content: File content as bytes
        local_dir: Local directory to save file
        filename: Filename to use

    Returns:
        Full path to saved file

    Raises:
        Exception: If save fails
    """
    try:
        # Create directory if doesn't exist
        Path(local_dir).mkdir(parents=True, exist_ok=True)

        # Save file
        file_path = Path(local_dir) / filename
        with open(file_path, "wb") as f:
            f.write(file_content)

        return str(file_path)

    except Exception as e:
        raise Exception(f"Failed to save file locally: {str(e)}")


def delete_from_supabase(
    bucket_name: str,
    file_path: str
) -> bool:
    """
    Delete a file from Supabase storage bucket.

    Args:
        bucket_name: Name of the Supabase bucket
        file_path: Path to file within bucket

    Returns:
        True if successful

    Raises:
        Exception: If deletion fails
    """
    try:
        supabase.storage.from_(bucket_name).remove([file_path])
        return True

    except Exception as e:
        raise Exception(f"Failed to delete file from Supabase: {str(e)}")
