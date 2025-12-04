"""
Quick test script for the CSV normalization endpoint
"""

import requests
import json
from pathlib import Path
import tempfile

# Configuration
API_URL = "http://localhost:8000/api/v1/csv/normalize"

# Create a sample CSV file for testing
def create_sample_csv():
    """Create a sample messy CSV file"""
    csv_content = """CustomerNumber,TransactionDate,PurchaseValue,ItemCategory,CustomerEmail
C001,2024-01-15,150.50,Electronics,john@example.com
C002,15/01/2024,75.00,Clothing,jane@example.com
C003,2024-01-16,200.99,Electronics,bob@example.com
C004,16-Jan-2024,50.25,Books,alice@example.com
C005,2024/01/17,125.75,Clothing,charlie@example.com
"""

    # Write to temp file
    temp_file = Path(tempfile.gettempdir()) / "test_sample.csv"
    temp_file.write_text(csv_content)
    return temp_file


def test_normalization():
    """Test the CSV normalization endpoint"""

    print("=" * 60)
    print("Testing CSV Normalization Endpoint")
    print("=" * 60)

    # Create sample CSV
    print("\n1. Creating sample CSV file...")
    csv_file = create_sample_csv()
    print(f"   ✓ Created: {csv_file}")

    # Define expected schema
    expected_schema = [
        {
            "column_name": "customer_id",
            "description": "Unique customer identifier (string)"
        },
        {
            "column_name": "purchase_date",
            "description": "Transaction date in YYYY-MM-DD format"
        },
        {
            "column_name": "amount",
            "description": "Purchase amount in dollars (numeric, non-negative)"
        },
        {
            "column_name": "category",
            "description": "Product category (string)"
        },
        {
            "column_name": "email",
            "description": "Customer email address (string)"
        }
    ]

    print("\n2. Preparing request...")
    print(f"   Expected schema: {len(expected_schema)} columns")
    for field in expected_schema:
        print(f"   - {field['column_name']}: {field['description']}")

    # Prepare the request
    files = {
        'file': ('test_sample.csv', open(csv_file, 'rb'), 'text/csv')
    }

    data = {
        'expected_schema': json.dumps(expected_schema),
        'max_attempts': 5
    }

    print("\n3. Sending request to API...")
    print(f"   URL: {API_URL}")

    try:
        response = requests.post(API_URL, files=files, data=data)

        print(f"\n4. Response received:")
        print(f"   Status Code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()

            print("\n" + "=" * 60)
            print("SUCCESS!")
            print("=" * 60)

            print(f"\nSuccess: {result.get('success')}")
            print(f"Message: {result.get('message')}")
            print(f"Attempts: {result.get('attempts')}")

            if result.get('output_csv_url'):
                print(f"\n✓ Output CSV URL:")
                print(f"  {result['output_csv_url']}")

            if result.get('generated_script'):
                print(f"\n✓ Generated Script (first 500 chars):")
                print(f"  {result['generated_script'][:500]}...")

            if result.get('error_details'):
                print(f"\n⚠ Error Details:")
                print(f"  {result['error_details']}")

        else:
            print("\n" + "=" * 60)
            print("FAILED!")
            print("=" * 60)
            print(f"\nError: {response.text}")

    except requests.exceptions.ConnectionError:
        print("\n" + "=" * 60)
        print("CONNECTION ERROR!")
        print("=" * 60)
        print("\n⚠ Could not connect to the API.")
        print("  Make sure the backend server is running:")
        print("  cd backend && uvicorn app.main:app --reload")

    except Exception as e:
        print("\n" + "=" * 60)
        print("UNEXPECTED ERROR!")
        print("=" * 60)
        print(f"\nError: {str(e)}")

    finally:
        # Cleanup
        if csv_file.exists():
            csv_file.unlink()
            print(f"\n✓ Cleaned up temp file")


if __name__ == "__main__":
    test_normalization()
