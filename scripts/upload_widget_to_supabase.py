"""
Upload Pulse Retention Widget to Supabase Storage

This script uploads the widget JavaScript file to Supabase storage
so it can be accessed publicly via CDN.

Usage:
    python scripts/upload_widget_to_supabase.py

Requirements:
    - Supabase credentials in .env file
    - Widget file at: popup-widget/pulse-retention-widget.js
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.core.supabase import supabase
from app.core.config import settings


def upload_widget_to_supabase(
    bucket_name: str = "widgets",
    version: str = "v1",
    filename: str = "pulse-retention-widget.js"
):
    """
    Upload widget file to Supabase storage bucket.
    
    Args:
        bucket_name: Supabase bucket name (default: "widgets")
        version: Version folder (default: "v1")
        filename: Widget filename (default: "pulse-retention-widget.js")
    
    Returns:
        Public URL of uploaded file
    """
    # Get widget file path
    project_root = Path(__file__).parent.parent
    widget_path = project_root / "popup-widget" / filename
    
    if not widget_path.exists():
        raise FileNotFoundError(f"Widget file not found: {widget_path}")
    
    # Read widget file
    print(f"Reading widget file: {widget_path}")
    with open(widget_path, 'rb') as f:
        widget_content = f.read()
    
    # Build file path in bucket
    if version:
        file_path = f"{version}/{filename}"
    else:
        file_path = filename
    
    print(f"Uploading to Supabase: {bucket_name}/{file_path}")
    
    try:
        # Upload to Supabase
        response = supabase.storage.from_(bucket_name).upload(
            file_path,
            widget_content,
            file_options={
                "content-type": "application/javascript",
                "upsert": "true"  # Overwrite if exists
            }
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
        
        print(f"✅ Upload successful!")
        print(f"📦 Bucket: {bucket_name}")
        print(f"📁 Path: {file_path}")
        print(f"🔗 Public URL: {public_url}")
        print(f"\n💡 Use this URL in your HTML:")
        print(f'   <script src="{public_url}" ...></script>')
        
        return public_url
        
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        raise


def create_bucket_if_not_exists(bucket_name: str, public: bool = True):
    """
    Create Supabase bucket if it doesn't exist.
    
    Args:
        bucket_name: Bucket name
        public: Whether bucket should be public
    """
    try:
        # Try to list buckets
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        if bucket_name in bucket_names:
            print(f"✅ Bucket '{bucket_name}' already exists")
            return
        
        # Create bucket
        print(f"Creating bucket '{bucket_name}' (public: {public})...")
        supabase.storage.create_bucket(bucket_name, options={"public": public})
        print(f"✅ Bucket '{bucket_name}' created successfully")
        
    except Exception as e:
        print(f"⚠️  Could not create bucket (may already exist): {str(e)}")
        print(f"   Please create bucket '{bucket_name}' manually in Supabase Dashboard")


def main():
    """Main function."""
    print("=" * 60)
    print("Pulse Retention Widget - Supabase Upload")
    print("=" * 60)
    print()
    
    # Check Supabase credentials
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        print("❌ Error: Supabase credentials not found in .env file")
        print("   Please set SUPABASE_URL and SUPABASE_ANON_KEY")
        sys.exit(1)
    
    print(f"🔗 Supabase URL: {settings.SUPABASE_URL}")
    print()
    
    # Bucket name
    bucket_name = "widgets"
    
    # Create bucket if needed
    create_bucket_if_not_exists(bucket_name, public=True)
    print()
    
    # Upload widget
    try:
        public_url = upload_widget_to_supabase(
            bucket_name=bucket_name,
            version="v1",  # Change version for updates
            filename="pulse-retention-widget.js"
        )
        
        print()
        print("=" * 60)
        print("✅ Deployment Complete!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Test the widget URL in a browser")
        print("2. Update your customer installation guide with the URL")
        print("3. Test the widget on a test website")
        print()
        
    except Exception as e:
        print()
        print("=" * 60)
        print("❌ Deployment Failed")
        print("=" * 60)
        print(f"Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()

