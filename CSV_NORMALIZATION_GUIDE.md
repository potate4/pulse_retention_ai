# CSV Normalization Feature - Complete Guide

## Overview

The CSV Normalization feature allows users to upload any CSV file and transform it to match a custom schema using AI-powered code generation. The system uses Gemini 2.5 Flash to intelligently map columns, handle data cleaning, and produce validated output.

## Features

✅ **Dynamic Schema Definition** - Define any output schema you need
✅ **Intelligent Column Mapping** - LLM analyzes and maps input columns automatically
✅ **Data Preprocessing** - Handles nulls, type conversions, and data cleaning
✅ **Self-Healing** - Automatically retries and fixes errors (up to 10 attempts)
✅ **Validation** - Ensures output matches expected schema
✅ **Cloud Storage** - Uploads result to Supabase with public URL
✅ **Full Transparency** - View the generated Python script

## Architecture

### Backend
- **Endpoint**: `POST /api/v1/csv/normalize`
- **Service**: [dynamic_llm_normalizer.py](backend/app/services/dynamic_llm_normalizer.py)
- **LLM**: Gemini 2.5 Flash via OpenAI-compatible API
- **Storage**: Supabase bucket `csv-files/normalized_csv/`

### Frontend
- **Page**: [CSVNormalization.jsx](frontend/src/pages/CSVNormalization.jsx)
- **Route**: `/csv-normalization`
- **API Module**: [csvNormalization.js](frontend/src/api/csvNormalization.js)

## How to Use

### 1. Access the Page

Navigate to the CSV Normalization page:
- From Dashboard: Click "CSV Normalization" quick action
- From Sidebar: Click "CSV Normalization" menu item
- Direct URL: `http://localhost:5173/csv-normalization`

### 2. Upload Your CSV

Click "Upload CSV File" and select a CSV file from your computer.

**Example Input CSV** (messy_sales.csv):
```csv
CustomerNumber,TransactionDate,PurchaseValue,ItemCategory,ContactEmail
C001,2024-01-15,150.50,Electronics,john@example.com
C002,15/01/2024,75.00,Clothing,jane@example.com
C003,2024-01-16,200.99,Electronics,bob@example.com
```

### 3. Define Expected Schema

Add fields to describe your desired output schema. Each field needs:
- **Column Name**: The exact name you want in the output CSV
- **Description**: Clear description including data type and format

**Example Schema**:
```
Column Name: customer_id
Description: Unique customer identifier (string)

Column Name: purchase_date
Description: Transaction date in YYYY-MM-DD format

Column Name: amount
Description: Purchase amount in dollars (numeric, non-negative)

Column Name: category
Description: Product category (string)

Column Name: email
Description: Customer email address (string)
```

### 4. Set Max Attempts (Optional)

Choose how many times the LLM should retry if it encounters errors (1-10, default: 5).

### 5. Click "Normalize CSV"

The system will:
1. ⏳ Analyze your CSV structure
2. 🤖 Generate a Python normalization script
3. ▶️ Execute the script
4. ✅ Validate the output
5. ☁️ Upload to Supabase

This typically takes 30-60 seconds.

### 6. Download Your Normalized CSV

Once complete:
- Click "Download CSV" to open the file
- Or copy the URL to share or integrate with other tools
- View the generated Python script (optional)

## Tips for Best Results

### 1. **Be Specific in Descriptions**

❌ Bad:
```
Column Name: date
Description: date
```

✅ Good:
```
Column Name: purchase_date
Description: Transaction date in YYYY-MM-DD format
```

### 2. **Specify Data Types**

Always mention the expected data type:
- `(string)`, `(text)`, `(varchar)`
- `(numeric)`, `(float)`, `(integer)`
- `(date)`, `(datetime)`, `(timestamp)`
- `(boolean)`, `(0 or 1)`

### 3. **Mention Constraints**

Include important constraints:
- "non-negative" for amounts
- "unique" for IDs
- "required" / "cannot be null"
- "0 or 1" for binary flags

### 4. **Specify Formats**

For dates, times, and special formats:
- "YYYY-MM-DD" for dates
- "HH:MM:SS" for times
- "ISO 8601" for datetimes
- "lowercase" or "uppercase" for text

### 5. **Give Context**

Help the LLM understand your domain:
```
Column Name: churn_status
Description: Customer churn indicator (1 if churned, 0 if active).
Map 'Yes'/'Churned'/'Left' to 1, everything else to 0
```

## Use Cases

### 1. E-commerce Data Normalization

**Input**: Various e-commerce platforms with different schemas
**Output**: Standardized schema for analytics

```
customer_id: Customer identifier (string)
order_date: Order date YYYY-MM-DD
total_amount: Order total (numeric, non-negative)
product_sku: Product SKU (string)
quantity: Quantity ordered (integer, positive)
```

### 2. Telecom Churn Data

**Input**: CRM exports with inconsistent column names
**Output**: ML-ready churn dataset

```
account_id: Account identifier (string)
monthly_charge: Monthly recurring charge (numeric)
total_spent: Lifetime value (numeric, non-negative)
contract_type: Contract type (Monthly/Annual/TwoYear)
churn_label: Churn indicator (1=churned, 0=active)
```

### 3. Customer Database Merge

**Input**: Multiple customer databases to merge
**Output**: Unified customer schema

```
customer_id: Unique customer ID (string)
full_name: Customer full name (string)
email: Email address (string, lowercase)
phone: Phone number (string)
registration_date: Date registered YYYY-MM-DD
status: Account status (active/inactive)
```

## Troubleshooting

### Error: "Only CSV files are supported"
- Ensure your file has a `.csv` extension
- Open the file in a text editor to verify it's actually CSV format

### Error: "Input CSV is empty or malformed"
- Check that your CSV has headers and at least one data row
- Verify the CSV is properly formatted (commas as delimiters)
- Try opening in Excel/Google Sheets and re-exporting as CSV

### Error: "Failed to normalize CSV after maximum attempts"
- Your schema might be too complex or ambiguous
- Simplify field descriptions
- Check if input CSV has the data needed for your schema
- Increase max_attempts to give more retry opportunities

### Error: "Missing required columns: [...]"
- The LLM couldn't map input columns to your expected schema
- Make field descriptions more flexible
- Check if input CSV has relevant data for all fields
- Consider making some fields optional or providing defaults

### Upload to Supabase Failed
- The CSV was normalized successfully but upload failed
- Check Supabase bucket configuration
- Verify `csv-files` bucket exists and is public
- Check Supabase credentials in backend `.env`

## Technical Details

### Generated Script Structure

The LLM generates a Python script with:

```python
import pandas as pd
import sys

def clean(input_path: str, output_path: str) -> None:
    # Read input CSV
    df = pd.read_csv(input_path)

    # Map columns
    # Handle null values
    # Type conversions
    # Data cleaning

    # Write output CSV
    df.to_csv(output_path, index=False)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python script.py <input_csv> <output_csv>")
    clean(sys.argv[1], sys.argv[2])
```

### Security Measures

The generated scripts are validated for:
- ❌ No subprocess calls
- ❌ No network requests
- ❌ No eval/exec
- ❌ No file deletion
- ❌ No system commands
- ✅ Only pandas, numpy, datetime, re allowed
- ✅ Size limit: 40KB
- ✅ Timeout: 60 seconds

### Validation Checks

Output CSV is validated for:
- ✅ All required columns present
- ✅ File is not empty
- ✅ Valid CSV format
- ✅ Columns match expected schema

## API Usage (Advanced)

For programmatic access:

```bash
curl -X POST "http://localhost:8000/api/v1/csv/normalize" \
  -F "file=@data.csv" \
  -F 'expected_schema=[
    {"column_name": "customer_id", "description": "Customer ID (string)"},
    {"column_name": "amount", "description": "Amount (numeric)"}
  ]' \
  -F "max_attempts=5"
```

Response:
```json
{
  "success": true,
  "message": "CSV normalized, validated, and uploaded successfully to Supabase",
  "output_csv_url": "https://[supabase-url]/storage/v1/object/public/csv-files/normalized_csv/20241204_123456_abc123_data.csv",
  "attempts": 2,
  "generated_script": "import pandas as pd\n..."
}
```

## Environment Setup

Ensure these are configured:

### Backend (.env)
```bash
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase
1. Create bucket named `csv-files`
2. Set bucket to public or configure access policies
3. Verify storage permissions

## Performance

- **Small CSVs** (<1MB, <1000 rows): 15-30 seconds
- **Medium CSVs** (1-10MB, 1000-10000 rows): 30-60 seconds
- **Large CSVs** (>10MB, >10000 rows): 60-120 seconds

**Note**: Processing time depends on:
- CSV size
- Schema complexity
- Number of retry attempts needed
- LLM API response time

## Limitations

- Max file size: No hard limit (browser/server constraints apply)
- Script size: 40KB max
- Execution timeout: 60 seconds
- Max retry attempts: 10
- Forbidden operations: subprocess, network, eval/exec

## Support

For issues or questions:
1. Check error messages in the UI
2. Review generated script for debugging
3. Verify input CSV format
4. Check backend logs for detailed errors
5. Report issues on GitHub

## Future Enhancements

Potential improvements:
- [ ] Support for Excel files (.xlsx)
- [ ] Preview input CSV before normalization
- [ ] Schema templates for common use cases
- [ ] Batch processing multiple files
- [ ] Schedule recurring normalizations
- [ ] Custom validation rules
- [ ] Column mapping preview before execution
