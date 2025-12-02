"""
CSV Processing Helper Functions
Modular functions for renaming, dropping, and operating on CSV columns.
Includes standardized preprocessing pipeline for unseen datasets.
"""
import pandas as pd
from datetime import datetime, timedelta
from typing import Union, List, Tuple, Any, Optional, Dict
import numpy as np


def rename_column(df: pd.DataFrame, old_col_name: str, new_col_name: str) -> pd.DataFrame:
    """
    Rename a column in the DataFrame.
    
    Args:
        df: Input DataFrame
        old_col_name: Current column name
        new_col_name: New column name
        
    Returns:
        DataFrame with renamed column
        
    Raises:
        ValueError: If old_col_name doesn't exist
    """
    if old_col_name not in df.columns:
        raise ValueError(f"Column '{old_col_name}' not found in DataFrame")
    
    df = df.copy()  # Avoid modifying original
    df.rename(columns={old_col_name: new_col_name}, inplace=True)
    return df


def drop_column(df: pd.DataFrame, col_name: str, ignore_missing: bool = False) -> pd.DataFrame:
    """
    Drop a column from the DataFrame.

    Args:
        df: Input DataFrame
        col_name: Column name to drop
        ignore_missing: If True, silently skip if column doesn't exist

    Returns:
        DataFrame with column dropped

    Raises:
        ValueError: If col_name doesn't exist and ignore_missing=False
    """
    if col_name not in df.columns:
        if ignore_missing:
            return df
        raise ValueError(f"Column '{col_name}' not found in DataFrame")

    df = df.copy()  # Avoid modifying original
    df.drop(columns=[col_name], inplace=True)
    return df


def operate_column(
    df: pd.DataFrame,
    col_name: str,
    operation: str,
    value: Union[int, float]
) -> pd.DataFrame:
    """
    Apply mathematical operation to column values.
    
    Args:
        df: Input DataFrame
        col_name: Column name to operate on
        operation: Operation type ('add', 'subtract', 'multiply', 'divide')
        value: Value to use in operation
        
    Returns:
        DataFrame with modified column values
        
    Raises:
        ValueError: If col_name doesn't exist or operation is invalid
    """
    if col_name not in df.columns:
        raise ValueError(f"Column '{col_name}' not found in DataFrame")
    
    valid_operations = ['add', 'subtract', 'multiply', 'divide']
    if operation not in valid_operations:
        raise ValueError(f"Invalid operation '{operation}'. Must be one of: {valid_operations}")
    
    df = df.copy()  # Avoid modifying original
    
    # Convert column to numeric if possible
    df[col_name] = pd.to_numeric(df[col_name], errors='coerce')
    
    # Apply operation
    if operation == 'add':
        df[col_name] = df[col_name] + value
    elif operation == 'subtract':
        df[col_name] = df[col_name] - value
    elif operation == 'multiply':
        df[col_name] = df[col_name] * value
    elif operation == 'divide':
        if value == 0:
            raise ValueError("Cannot divide by zero")
        df[col_name] = df[col_name] / value
    
    return df


def days_to_date_operation(df: pd.DataFrame, col_name: str, base_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Convert 'days since' column to date format.

    Args:
        df: Input DataFrame
        col_name: Column containing days since value
        base_date: Base date to subtract from (defaults to today)

    Returns:
        DataFrame with dates in YYYY-MM-DD format
    """
    if col_name not in df.columns:
        raise ValueError(f"Column '{col_name}' not found in DataFrame")

    df = df.copy()
    base = base_date or datetime.now()

    def convert_days(days):
        if pd.isna(days):
            return None
        try:
            result_date = base - timedelta(days=int(days))
            return result_date.strftime('%Y-%m-%d')
        except:
            return None

    df[col_name] = df[col_name].apply(convert_days)
    return df


def months_to_date_operation(df: pd.DataFrame, col_name: str, base_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Convert 'months since' column to date format.

    Args:
        df: Input DataFrame
        col_name: Column containing months since value
        base_date: Base date to subtract from (defaults to today)

    Returns:
        DataFrame with dates in YYYY-MM-DD format
    """
    if col_name not in df.columns:
        raise ValueError(f"Column '{col_name}' not found in DataFrame")

    df = df.copy()
    base = base_date or datetime.now()

    def convert_months(months):
        if pd.isna(months):
            return None
        try:
            days = int(months) * 30  # Approximate
            result_date = base - timedelta(days=days)
            return result_date.strftime('%Y-%m-%d')
        except:
            return None

    df[col_name] = df[col_name].apply(convert_months)
    return df


def cast_type_operation(df: pd.DataFrame, col_name: str, target_type: str) -> pd.DataFrame:
    """
    Cast column to specified type with null handling.

    Args:
        df: Input DataFrame
        col_name: Column to cast
        target_type: One of 'int', 'float', 'str'

    Returns:
        DataFrame with casted column
    """
    if col_name not in df.columns:
        raise ValueError(f"Column '{col_name}' not found in DataFrame")

    df = df.copy()

    if target_type == 'int':
        df[col_name] = pd.to_numeric(df[col_name], errors='coerce').fillna(0).astype(int)
    elif target_type == 'float':
        df[col_name] = pd.to_numeric(df[col_name], errors='coerce').fillna(0.0).astype(float)
    elif target_type == 'str':
        df[col_name] = df[col_name].astype(str)
    else:
        raise ValueError(f"Invalid target_type '{target_type}'. Must be 'int', 'float', or 'str'")

    return df


def add_constant_column(df: pd.DataFrame, col_name: str, value: Any) -> pd.DataFrame:
    """
    Add a new column with a constant value.

    Args:
        df: Input DataFrame
        col_name: Name of new column
        value: Constant value for all rows

    Returns:
        DataFrame with new column
    """
    df = df.copy()
    df[col_name] = value
    return df


def process_standardized_csv(
    input_csv: Union[pd.DataFrame, str],
    mapping: List[Tuple[str, str, Any]],
    base_date: Optional[datetime] = None
) -> pd.DataFrame:
    """
    Process CSV according to mapping specifications.

    Args:
        input_csv: Input CSV as DataFrame or file path (str)
        mapping: List of tuples with format (column_name, operation, operation_args)
                 - For 'rename': (old_col_name, 'rename', new_col_name)
                 - For 'drop': (col_name, 'drop', None)
                 - For 'operate': (col_name, 'operate', (operation_type, value))
                                 where operation_type is 'add', 'subtract', 'multiply', or 'divide'
                 - For 'days_to_date': (col_name, 'days_to_date', None)
                 - For 'months_to_date': (col_name, 'months_to_date', None)
                 - For 'cast': (col_name, 'cast', target_type) where target_type is 'int', 'float', or 'str'
                 - For 'add_constant': (col_name, 'add_constant', value)
        base_date: Optional base date for date operations (defaults to now)

    Returns:
        Processed DataFrame

    Example:
        mapping = [
            ('old_name', 'rename', 'new_name'),
            ('unwanted_col', 'drop', None),
            ('amount', 'operate', ('multiply', 1.1)),  # Increase by 10%
            ('days_since_order', 'days_to_date', None),  # Convert days to date
            ('MonthlyCharges', 'cast', 'float'),  # Ensure float type
            ('event_type', 'add_constant', 'purchase')  # Add constant column
        ]
    """
    # Load CSV if string path provided
    if isinstance(input_csv, str):
        df = pd.read_csv(input_csv)
    elif isinstance(input_csv, pd.DataFrame):
        df = input_csv.copy()
    else:
        raise TypeError("input_csv must be a pandas DataFrame or file path string")

    # Process each mapping instruction
    for instruction in mapping:
        if len(instruction) < 2:
            raise ValueError(f"Invalid mapping instruction: {instruction}. Must have at least (column_name, operation)")

        column_name = instruction[0]
        operation = instruction[1].lower()
        operation_args = instruction[2] if len(instruction) > 2 else None

        if operation == 'rename':
            if operation_args is None:
                raise ValueError(f"Rename operation requires new column name as third argument")
            new_col_name = operation_args
            df = rename_column(df, column_name, new_col_name)

        elif operation == 'drop':
            df = drop_column(df, column_name, ignore_missing=True)

        elif operation == 'operate':
            if operation_args is None:
                raise ValueError(f"Operate operation requires (operation_type, value) tuple as third argument")

            # operation_args should be a tuple: (operation_type, value)
            if not isinstance(operation_args, (tuple, list)) or len(operation_args) != 2:
                raise ValueError(f"Operate operation args must be tuple/list of (operation_type, value)")

            operation_type, value = operation_args
            df = operate_column(df, column_name, operation_type, value)

        elif operation == 'days_to_date':
            df = days_to_date_operation(df, column_name, base_date)

        elif operation == 'months_to_date':
            df = months_to_date_operation(df, column_name, base_date)

        elif operation == 'cast':
            if operation_args is None:
                raise ValueError(f"Cast operation requires target type ('int', 'float', 'str') as third argument")
            df = cast_type_operation(df, column_name, operation_args)

        elif operation == 'add_constant':
            if operation_args is None:
                raise ValueError(f"Add_constant operation requires value as third argument")
            df = add_constant_column(df, column_name, operation_args)

        else:
            raise ValueError(f"Unknown operation: '{operation}'. Must be one of: 'rename', 'drop', 'operate', 'days_to_date', 'months_to_date', 'cast', 'add_constant'")

    return df


# Standard schema for churn prediction
STANDARD_SCHEMA = {
    'customer_id': str,
    'event_date': str,  # YYYY-MM-DD format
    'amount': float,
    'event_type': str,
    'churn_label': int  # 0 or 1
}


def validate_standard_schema(df: pd.DataFrame, strict: bool = True) -> Tuple[bool, List[str]]:
    """
    Validate DataFrame against standard schema.

    Args:
        df: DataFrame to validate
        strict: If True, raises error on validation failure. If False, returns status.

    Returns:
        (is_valid, list_of_errors)

    Raises:
        ValueError: If strict=True and validation fails
    """
    errors = []

    # Check required columns
    required_cols = set(STANDARD_SCHEMA.keys())
    actual_cols = set(df.columns)
    missing_cols = required_cols - actual_cols

    if missing_cols:
        errors.append(f"Missing required columns: {missing_cols}")

    # Check for extra columns (warning, not error)
    extra_cols = actual_cols - required_cols
    if extra_cols:
        errors.append(f"Extra columns found (will be ignored): {extra_cols}")

    # Validate data in required columns
    if 'customer_id' in df.columns:
        # Handle potential duplicate 'customer_id' columns by flattening to numpy
        # so we always get a scalar count instead of a Series.
        null_count = df['customer_id'].isna().to_numpy().sum()
        if null_count > 0:
            errors.append(f"Found {null_count} null values in customer_id column")

    if 'amount' in df.columns:
        negative_count = (df['amount'] < 0).sum()
        if negative_count > 0:
            errors.append(f"Found {negative_count} negative values in amount column")

    if 'churn_label' in df.columns:
        invalid_labels = df[~df['churn_label'].isin([0, 1])]
        if len(invalid_labels) > 0:
            errors.append(f"Found {len(invalid_labels)} invalid churn_label values (must be 0 or 1)")

    if 'event_date' in df.columns:
        # Try to parse dates (accept any parseable date, then we normalize later)
        parsed = pd.to_datetime(df['event_date'], errors='coerce')
        invalid_count = parsed.isna().sum()
        if invalid_count > 0:
            errors.append(
                f"event_date column contains {invalid_count} invalid dates "
                f"(must be parseable to a date that we can convert to YYYY-MM-DD)"
            )

    is_valid = len(errors) == 0

    if strict and not is_valid:
        raise ValueError(f"Schema validation failed:\n" + "\n".join(errors))

    return is_valid, errors


def standardize_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    """
    Final standardization and cleaning step.
    Ensures data quality after preprocessing.

    Args:
        df: DataFrame to clean

    Returns:
        Cleaned DataFrame
    """
    df = df.copy()

    # Ensure all standard columns exist; if missing, create with safe defaults
    for col, col_type in STANDARD_SCHEMA.items():
        if col not in df.columns:
            if col == 'customer_id':
                df[col] = ''
            elif col == 'event_date':
                df[col] = ''
            elif col == 'amount':
                df[col] = 0.0
            elif col == 'event_type':
                df[col] = 'unknown'
            elif col == 'churn_label':
                df[col] = 0
            else:
                df[col] = None

    # Select only standard schema columns (now guaranteed to exist)
    df = df[list(STANDARD_SCHEMA.keys())]

    # Remove rows with null customer_id
    df = df[df['customer_id'].notna() & (df['customer_id'] != '')]

    # Ensure proper types
    df['customer_id'] = df['customer_id'].astype(str)

    # Normalize event_date:
    # - parse anything pandas understands
    # - drop rows where event_date cannot be parsed
    # - format as YYYY-MM-DD
    parsed_dates = pd.to_datetime(df['event_date'], errors='coerce')
    df = df[parsed_dates.notna()].copy()
    df['event_date'] = parsed_dates[parsed_dates.notna()].dt.strftime('%Y-%m-%d')

    # Amount: numeric, non-negative
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0).clip(lower=0)
    df['event_type'] = df['event_type'].astype(str)
    df['churn_label'] = pd.to_numeric(df['churn_label'], errors='coerce').fillna(0).astype(int).clip(0, 1)

    # Remove duplicates
    df = df.drop_duplicates()

    # Reset index
    df = df.reset_index(drop=True)

    return df


def preprocess_to_standard(
    input_csv: Union[pd.DataFrame, str],
    mapping: List[Tuple[str, str, Any]],
    base_date: Optional[datetime] = None,
    validate: bool = True
) -> pd.DataFrame:
    """
    Complete preprocessing pipeline: process mappings → validate → clean.

    This is the main entry point for preprocessing any dataset to standard schema.

    Args:
        input_csv: Input CSV as DataFrame or file path
        mapping: List of processing instructions
        base_date: Optional base date for date operations
        validate: Whether to validate schema (default: True)

    Returns:
        Preprocessed DataFrame in standard schema

    Example:
        # Telco dataset preprocessing
        telco_mapping = [
            # Operations (apply to source column names)
            ('tenure', 'months_to_date', None),
            ('MonthlyCharges', 'cast', 'float'),
            ('churned', 'cast', 'int'),

            # Renames (apply after operations)
            ('customerID', 'rename', 'customer_id'),
            ('tenure', 'rename', 'event_date'),
            ('MonthlyCharges', 'rename', 'amount'),
            ('churned', 'rename', 'churn_label'),

            # Drops (remove unnecessary columns)
            ('gender', 'drop', None),
            ('Contract', 'drop', None),

            # Constants (add new columns)
            ('event_type', 'add_constant', 'monthly_charge')
        ]

        df = preprocess_to_standard('telco.csv', telco_mapping)
    """
    # Step 1: Apply mappings
    df = process_standardized_csv(input_csv, mapping, base_date)

    # Step 2: Validate schema
    if validate:
        is_valid, errors = validate_standard_schema(df, strict=False)
        if not is_valid:
            print("Warning: Schema validation issues found:")
            for error in errors:
                print(f"  - {error}")

    # Step 3: Final cleaning
    df = standardize_and_clean(df)

    # Step 4: Final validation
    if validate:
        validate_standard_schema(df, strict=True)

    return df

