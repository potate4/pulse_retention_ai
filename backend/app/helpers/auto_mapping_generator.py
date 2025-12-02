"""
Automated Column Mapping Generator using LLM.

Uses Gemini to automatically generate preprocessing mappings for any dataset,
and converts them into the tuple format expected by `csv_processor.py`.
"""

import pandas as pd
from typing import List, Tuple

from pydantic import BaseModel
from google import genai
from typing import Any, Optional
from app.core.config import settings


# Reuse the same pattern as `audio_transcriptions_gemini.py`
client = genai.Client(api_key=settings.GOOGLE_API_KEY)


class ColumnMapping(BaseModel):
    """
    Schema for a single column transformation suggested by the LLM.

    IMPORTANT: Gemini structured output works best when every field is always
    present and has a concrete JSON type. To keep things simple:
    - All fields are REQUIRED.
    - For "unused" string fields, the model should output "" (empty string).
    - For "unused" numeric fields, the model should output 0.

    Fields:
    - column_name: source column in the raw dataset
    - operation: one of:
      'rename', 'drop', 'operate', 'days_to_date',
      'months_to_date', 'cast', 'add_constant'
    - new_name: target column name for 'rename'
    - operation_type: 'add' | 'subtract' | 'multiply' | 'divide' for 'operate'
    - value: numeric value for 'operate' (e.g. 0.01 to convert cents to dollars)
    - cast_type: 'int' | 'float' | 'str' for 'cast'
    - constant_value: value to use for 'add_constant'
    - reason: natural language explanation of why this mapping was chosen
    """

    column_name: str
    operation: str
    new_name: str
    operation_type: str
    value: float
    cast_type: str
    constant_value: str
    reason: str


def generate_preprocessing_mappings(
    df: pd.DataFrame,
    sample_rows: int = 5,
) -> List[ColumnMapping]:
    """
    Use LLM to automatically generate preprocessing mappings for any dataset.

    The LLM returns a list[ColumnMapping] using structured output, just like
    `get_key_topics` in `audio_transcriptions_gemini.py`.

    Args:
        df: Input DataFrame to analyze.
        sample_rows: Number of sample rows to show to LLM.

    Returns:
        List[ColumnMapping] – one mapping object per input column.
    """
    columns = df.columns.tolist()
    sample_data = df.head(sample_rows).to_dict(orient="records")
    dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}

    prompt = f"""
You are a data preprocessing expert. Analyze this dataset and generate
preprocessing mappings to convert it to our standard schema.

STANDARD SCHEMA (target):
- customer_id (str)  : Unique customer identifier
- event_date (str)   : Date in YYYY-MM-DD format
- amount (float)     : Transaction/monetary value (≥ 0)
- event_type (str)   : Type of event (e.g., "purchase", "monthly_charge", "login")
- churn_label (int)  : 0 (active) or 1 (churned)

INPUT DATASET:
- Columns: {columns}
- Data types: {dtypes}
- Sample data (first {sample_rows} rows):
{sample_data}

YOUR TASK:
For each column in the input dataset, emit a ColumnMapping object describing
what should be done with that column so we can transform the data into the
standard schema.

OPERATION TYPES:

1. rename
   - Use when the column should stay but needs a new name.
   - Set new_name to one of: "customer_id", "event_date", "amount",
     "event_type", "churn_label" (or other intermediate names if needed).

2. drop
   - Use when the column is not needed for the standard schema.

3. operate
   - Use for numeric transforms like unit conversions.
   - Set operation_type to one of: "add", "subtract", "multiply", "divide".
   - Set value to the numeric value to use.

4. days_to_date
   - Use for "days since" columns (e.g. days_since_last_order).

5. months_to_date
   - Use for "months since" or tenure-style columns (e.g. tenure in months).

6. cast
   - Use to coerce data to the right type.
   - Set cast_type to "int", "float", or "str".

7. add_constant
   - Use to add or fill a column with a constant value
     (e.g. event_type="monthly_charge" when it's implicit).
   - Set constant_value to the value to use.

MAPPING HINTS:

- Customer ID:
  - Look for names like: customerID, customer_id, user_id, account_id, cust_id, id.
  - Usually operation="rename", new_name="customer_id".

- Event Date:
  - If "days since" or "days_inactive": use operation="days_to_date".
  - If "tenure" in months: use operation="months_to_date".
  - If already a date: operation="rename", new_name="event_date".

- Amount:
  - Revenue, charges, price, amount, MonthlyCharges, TotalCharges, etc.
  - If in cents, use "operate" with operation_type="divide" and value=100,
    then possibly "rename" to "amount" (you can just emit the operate step here,
    we will apply operations before renames).

- Event Type:
  - If there's a clear event/category column, operation="rename", new_name="event_type".
  - If there's no such column, you can suggest an "add_constant" on some
    dummy column name (e.g. "event_type") with a reasonable constant_value
    like "monthly_charge" (subscriptions), "order" (e-commerce), etc.

- Churn Label:
  - Look for churn, churned, is_churned, cancelled, is_active, etc.
  - If 0/1 but inverted (e.g. is_active): you may use operate + rename.

IMPORTANT (HARD CONSTRAINTS):
- After applying ALL mappings, the resulting dataset MUST contain
  ALL 5 standard columns: customer_id, event_date, amount, event_type, churn_label.
  - If there is no obvious source column for a standard field, you MUST synthesize it
    using a reasonable transformation or add_constant (for example, event_type="monthly_charge").
- Emit ONE ColumnMapping per input column (plus optional extra mappings ONLY when needed
  to create new standard columns, such as:
  - tenure → months_to_date  (operation="months_to_date", new_name="")
  - tenure → rename          (operation="rename", new_name="event_date")
  This ensures event_date is actually present in the final schema.
- EVERY ColumnMapping MUST include ALL fields from the schema above.
  - For unused string fields, output "" (empty string).
  - For unused numeric fields (like value), output 0.
- Provide a clear text explanation in "reason".

Return ONLY a JSON array of ColumnMapping objects.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "temperature": 0,
            "response_mime_type": "application/json",
            "response_schema": list[ColumnMapping],
        },
    )

    return response.parsed


def convert_mappings_to_csv_processor_format(
    column_mappings: List[ColumnMapping],
) -> List[Tuple[str, str, Any]]:
    """
    Convert a list of ColumnMapping objects to the tuple format expected by
    `csv_processor.process_standardized_csv` / `preprocess_to_standard`.

    Returns:
        List of tuples: (column_name, operation, operation_args)
    """
    mappings: List[Tuple[str, str, Any]] = []

    # 1. Drops first (to avoid conflicts)
    for mapping in column_mappings:
        if mapping.operation == "drop":
            mappings.append((mapping.column_name, "drop", None))

    # 2. Operations / transformations (before renames)
    for mapping in column_mappings:
        if mapping.operation == "operate" and mapping.operation_type and mapping.value is not None:
            mappings.append(
                (
                    mapping.column_name,
                    "operate",
                    (mapping.operation_type, mapping.value),
                )
            )
        elif mapping.operation == "days_to_date":
            mappings.append((mapping.column_name, "days_to_date", None))
        elif mapping.operation == "months_to_date":
            mappings.append((mapping.column_name, "months_to_date", None))
        elif mapping.operation == "cast" and mapping.cast_type:
            mappings.append((mapping.column_name, "cast", mapping.cast_type))

    # 3. Renames (after operations)
    for mapping in column_mappings:
        if mapping.operation == "rename" and mapping.new_name:
            mappings.append((mapping.column_name, "rename", mapping.new_name))

    # 4. Add constants
    for mapping in column_mappings:
        if mapping.operation == "add_constant" and mapping.constant_value is not None:
            mappings.append(
                (mapping.column_name, "add_constant", mapping.constant_value)
            )

    return mappings


def auto_preprocess_dataset(
    input_csv: str,
    output_csv: Optional[str] = None,
    show_plan: bool = True,
) -> pd.DataFrame:
    """
    Fully automated preprocessing: LLM generates mappings → csv_processor applies them.

    Args:
        input_csv: Path to input CSV file.
        output_csv: Optional path to save normalized CSV.
        show_plan: Whether to print the preprocessing plan.

    Returns:
        Normalized DataFrame ready for churn prediction.
    """
    from app.helpers.csv_processor import preprocess_to_standard

    df = pd.read_csv(input_csv)
    print(f"Loaded {len(df)} rows with {len(df.columns)} columns")
    print(f"Columns: {df.columns.tolist()}")

    print("\n🤖 Generating preprocessing mappings using AI...")
    column_mappings = generate_preprocessing_mappings(df)

    if show_plan:
        print("\n📋 Preprocessing Plan (per-column mappings):")
        print("=" * 80)
        for i, mapping in enumerate(column_mappings, start=1):
            print(f"{i}. Column: {mapping.column_name}")
            print(f"   Operation: {mapping.operation}")
            if mapping.new_name:
                print(f"   New name: {mapping.new_name}")
            if mapping.operation_type and mapping.value is not None:
                print(f"   Math operation: {mapping.operation_type} {mapping.value}")
            if mapping.cast_type:
                print(f"   Cast to: {mapping.cast_type}")
            if mapping.constant_value is not None:
                print(f"   Constant value: {mapping.constant_value}")
            if mapping.reason:
                print(f"   Reason: {mapping.reason}")
            print()
        print("=" * 80)

    mappings = convert_mappings_to_csv_processor_format(column_mappings)

    print(f"\n🔧 Applying {len(mappings)} transformations...")
    normalized_df = preprocess_to_standard(df, mappings, validate=True)

    print("✅ Preprocessing complete!")
    print(f"   Output: {len(normalized_df)} rows × {len(normalized_df.columns)} columns")
    print(f"   Columns: {normalized_df.columns.tolist()}")

    if output_csv:
        normalized_df.to_csv(output_csv, index=False)
        print(f"💾 Saved to: {output_csv}")

    return normalized_df


def get_preprocessing_plan_only(
    input_csv: str,
) -> Tuple[List[ColumnMapping], List[Tuple[str, str, Any]]]:
    """
    Generate preprocessing plan without applying it (for review).

    Returns:
        Tuple of (List[ColumnMapping], csv_processor_mappings)
    """
    df = pd.read_csv(input_csv)
    column_mappings = generate_preprocessing_mappings(df)
    mappings = convert_mappings_to_csv_processor_format(column_mappings)
    return column_mappings, mappings


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m app.helpers.auto_mapping_generator <input_csv> [output_csv]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    auto_preprocess_dataset(input_file, output_file)


