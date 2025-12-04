# Dynamic CSV Normalization - Testing Guide

## Overview

This endpoint allows you to upload any CSV file and normalize it to a custom schema using LLM-generated Python code.

## Endpoint

**POST** `/api/v1/csv/normalize`

## How It Works

1. **Upload CSV**: You upload a raw CSV file with any column names
2. **Define Schema**: You specify what columns you want in the output and what they mean
3. **LLM Processing**: The system uses Gemini 2.5 Flash to:
   - Analyze your input CSV structure
   - Generate a Python script to map input columns to your expected schema
   - Handle null values, type conversions, and data cleaning
   - Execute the script with validation
   - Retry up to `max_attempts` times if errors occur
4. **Get Result**: You receive a Supabase URL with the normalized CSV

## Request Format

### Form Data Parameters

- `file` (required): The CSV file to normalize
- `expected_schema` (required): JSON array defining the output schema
- `max_attempts` (optional, default=5): Maximum LLM retry attempts (1-10)

### Expected Schema Format

JSON array of objects with:
- `column_name`: Name of the column in output CSV
- `description`: What the column represents (helps LLM map correctly)

## Example Usage

### Using cURL

```bash
curl -X POST "http://localhost:8000/api/v1/csv/normalize" \
  -F "file=@sample_data.csv" \
  -F 'expected_schema=[
    {"column_name": "customer_id", "description": "Unique customer identifier (string)"},
    {"column_name": "purchase_date", "description": "Date of purchase in YYYY-MM-DD format"},
    {"column_name": "total_amount", "description": "Total purchase amount (numeric, non-negative)"},
    {"column_name": "product_category", "description": "Category of the purchased product (string)"}
  ]' \
  -F "max_attempts=5"
```

### Using Python

```python
import requests

url = "http://localhost:8000/api/v1/csv/normalize"

# Define your expected schema
schema = [
    {
        "column_name": "customer_id",
        "description": "Unique customer identifier (string)"
    },
    {
        "column_name": "purchase_date",
        "description": "Date of purchase in YYYY-MM-DD format"
    },
    {
        "column_name": "total_amount",
        "description": "Total purchase amount (numeric, non-negative)"
    },
    {
        "column_name": "product_category",
        "description": "Category of the purchased product (string)"
    }
]

# Upload file
files = {
    'file': ('my_data.csv', open('my_data.csv', 'rb'), 'text/csv')
}

data = {
    'expected_schema': json.dumps(schema),
    'max_attempts': 5
}

response = requests.post(url, files=files, data=data)
print(response.json())
```

### Using JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const schema = [
  {
    column_name: "customer_id",
    description: "Unique customer identifier (string)"
  },
  {
    column_name: "purchase_date",
    description: "Date of purchase in YYYY-MM-DD format"
  },
  {
    column_name: "total_amount",
    description: "Total purchase amount (numeric, non-negative)"
  },
  {
    column_name: "product_category",
    description: "Category of the purchased product (string)"
  }
];

formData.append('expected_schema', JSON.stringify(schema));
formData.append('max_attempts', '5');

const response = await fetch('http://localhost:8000/api/v1/csv/normalize', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "CSV normalized and uploaded successfully",
  "output_csv_url": "https://your-supabase-url.com/storage/v1/object/public/csv-files/normalized_csv/20231204_123456_abcd1234_sample.csv",
  "attempts": 2,
  "generated_script": "import pandas as pd\nimport sys\n\ndef clean(input_path, output_path):\n    ...",
  "error_details": null
}
```

### Failure Response

```json
{
  "success": false,
  "message": "Failed to normalize CSV after maximum attempts",
  "output_csv_url": null,
  "attempts": 5,
  "generated_script": null,
  "error_details": {
    "last_error_text": "Validation failed: output CSV does not conform to EXPECTED_SCHEMA.",
    "last_error_list": ["Missing required columns: ['customer_id']"],
    "last_script": "..."
  }
}
```

## Environment Setup

Ensure these environment variables are set:

```bash
# .env file
GEMINI_API_KEY=your_gemini_api_key_here
# OR
GOOGLE_API_KEY=your_google_api_key_here  # Will be used as fallback

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Storage Setup

1. Create a bucket named `csv-files` in your Supabase project
2. Set the bucket to public or configure appropriate access policies
3. The normalized CSVs will be stored at path: `normalized_csv/{timestamp}_{id}_{filename}`

## Testing Scenarios

### Scenario 1: E-commerce Data Normalization

**Input CSV** (messy_sales.csv):
```csv
CustomerNumber,TransactionDate,PurchaseValue,ItemCategory
C001,2024-01-15,150.50,Electronics
C002,15/01/2024,75.00,Clothing
```

**Expected Schema**:
```json
[
  {"column_name": "customer_id", "description": "Customer identifier"},
  {"column_name": "date", "description": "Transaction date in YYYY-MM-DD"},
  {"column_name": "amount", "description": "Purchase amount in dollars"},
  {"column_name": "category", "description": "Product category"}
]
```

### Scenario 2: Telecom Churn Data

**Input CSV** (telecom.csv):
```csv
AccountID,MonthlyCharges,TotalCharges,Churned,ContractType
A123,45.50,1200.00,Yes,Monthly
A124,89.99,5400.00,No,Annual
```

**Expected Schema**:
```json
[
  {"column_name": "account_id", "description": "Account identifier"},
  {"column_name": "monthly_fee", "description": "Monthly recurring charge"},
  {"column_name": "lifetime_value", "description": "Total charges to date"},
  {"column_name": "churn_status", "description": "1 if churned, 0 if active"},
  {"column_name": "contract", "description": "Contract type"}
]
```

## Error Handling

The endpoint handles:
- Invalid CSV format
- Empty CSV files
- Malformed JSON schema
- LLM generation failures (with retry logic)
- Script execution errors
- Validation failures
- Supabase upload errors (still returns success with normalized CSV info)

## Best Practices

1. **Clear Descriptions**: Provide detailed descriptions in your schema to help the LLM understand the mapping
2. **Specify Types**: Mention data types in descriptions (string, numeric, date, boolean)
3. **Specify Formats**: For dates, mention the expected format (YYYY-MM-DD)
4. **Specify Constraints**: Mention constraints like "non-negative", "unique", "required"
5. **Start Small**: Test with a small CSV first (5-10 rows) before processing large files

## Limitations

1. Maximum script size: 40KB
2. Script timeout: 60 seconds
3. LLM timeout: 60 seconds per attempt
4. Forbidden operations: subprocess, network requests, eval/exec, file deletion

## Interactive Testing with Swagger UI

Visit `http://localhost:8000/docs` after starting the server to use the interactive API documentation:

1. Navigate to the "csv-normalization" section
2. Click on "POST /api/v1/csv/normalize"
3. Click "Try it out"
4. Upload your CSV file
5. Paste your schema JSON
6. Set max_attempts (optional)
7. Click "Execute"
