"""
Helper script to normalize Telco Churn dataset to standard schema.
Converts customer snapshot data to transaction-based format.
"""
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.helpers.csv_processor import process_standardized_csv


def normalize_telco_to_standard_schema(
    input_file: str,
    output_file: str,
    base_date: Optional[str] = None,
    generate_transactions: bool = True
) -> pd.DataFrame:
    """
    Convert Telco Churn dataset to standard schema format.
    
    Strategy:
    - This is a customer snapshot dataset (not transaction data)
    - We'll create monthly transaction events based on tenure
    - Each month of service = 1 transaction event
    - Use MonthlyCharges as amount for each transaction
    
    Args:
        input_file: Path to telco_churn.csv
        output_file: Path to save normalized CSV
        base_date: Base date for transactions (defaults to today)
        generate_transactions: If True, creates monthly transactions. If False, creates single snapshot event.
        
    Returns:
        Normalized DataFrame
    """
    # Read input CSV
    df = pd.read_csv(input_file)
    
    print(f"Loaded {len(df)} customers from {input_file}")
    print(f"Columns: {df.columns.tolist()}")
    
    # Set base date (default to today)
    if base_date is None:
        base_date = datetime.now().date()
    else:
        base_date = datetime.strptime(base_date, "%Y-%m-%d").date()
    
    # Prepare mapping for CSV processor
    # First, rename customerID to customer_id
    mapping = [
        ('customerID', 'rename', 'customer_id'),
    ]
    
    # Apply initial rename
    df_renamed = process_standardized_csv(df, mapping)
    
    # Now create transaction events
    transactions = []
    
    if generate_transactions:
        # Strategy: Create monthly transactions based on tenure
        # Each month of tenure = 1 transaction event
        for _, row in df_renamed.iterrows():
            customer_id = row['customer_id']
            tenure_months = int(row['tenure']) if pd.notna(row['tenure']) else 0
            monthly_charges = float(row['MonthlyCharges']) if pd.notna(row['MonthlyCharges']) else 0.0

            # Get churn label (use 'churned' column which is 0/1)
            churn_label = int(row['churned']) if 'churned' in row and pd.notna(row['churned']) else 0

            # Create one transaction per month of tenure
            # Most recent transaction = base_date
            # Go backwards in time for each month
            for month_offset in range(tenure_months):
                # Calculate transaction date (going backwards from base_date)
                transaction_date = base_date - timedelta(days=30 * (tenure_months - month_offset - 1))

                # Store other columns as metadata
                metadata = {
                    'gender': str(row.get('gender', '')),
                    'SeniorCitizen': int(row.get('SeniorCitizen', 0)) if pd.notna(row.get('SeniorCitizen')) else 0,
                    'Partner': str(row.get('Partner', '')),
                    'Dependents': str(row.get('Dependents', '')),
                    'PhoneService': str(row.get('PhoneService', '')),
                    'MultipleLines': str(row.get('MultipleLines', '')),
                    'InternetService': str(row.get('InternetService', '')),
                    'Contract': str(row.get('Contract', '')),
                    'PaymentMethod': str(row.get('PaymentMethod', '')),
                    'TotalCharges': float(row.get('TotalCharges', 0)) if pd.notna(row.get('TotalCharges')) else 0.0
                }

                transactions.append({
                    'customer_id': customer_id,
                    'event_date': transaction_date.strftime('%Y-%m-%d'),
                    'amount': monthly_charges,
                    'event_type': 'monthly_charge',
                    'churn_label': churn_label
                })

            # If tenure is 0, create at least one transaction
            if tenure_months == 0:
                transactions.append({
                    'customer_id': customer_id,
                    'event_date': base_date.strftime('%Y-%m-%d'),
                    'amount': monthly_charges,
                    'event_type': 'monthly_charge',
                    'churn_label': churn_label
                })
    else:
        # Alternative: Create single snapshot event per customer
        for _, row in df_renamed.iterrows():
            customer_id = row['customer_id']
            monthly_charges = float(row['MonthlyCharges']) if pd.notna(row['MonthlyCharges']) else 0.0
            tenure_months = int(row['tenure']) if pd.notna(row['tenure']) else 0

            # Get churn label (use 'churned' column which is 0/1)
            churn_label = int(row['churned']) if 'churned' in row and pd.notna(row['churned']) else 0

            # Calculate last transaction date based on tenure
            last_transaction_date = base_date - timedelta(days=30 * tenure_months) if tenure_months > 0 else base_date

            transactions.append({
                'customer_id': customer_id,
                'event_date': last_transaction_date.strftime('%Y-%m-%d'),
                'amount': monthly_charges,
                'event_type': 'monthly_charge',
                'churn_label': churn_label
            })

    # Create normalized DataFrame
    normalized_df = pd.DataFrame(transactions)

    # Ensure proper column order (include churn_label)
    normalized_df = normalized_df[['customer_id', 'event_date', 'amount', 'event_type', 'churn_label']]
    
    # Save to CSV
    normalized_df.to_csv(output_file, index=False)
    
    print(f"\nNormalized {len(normalized_df)} transactions from {len(df)} customers")
    print(f"Saved to {output_file}")
    print(f"\nSample output:")
    print(normalized_df.head(10))
    
    return normalized_df


def normalize_telco_simple(
    input_file: str,
    output_file: str
) -> pd.DataFrame:
    """
    Simple normalization: Creates one transaction per customer using last known date.
    Uses tenure to calculate when last transaction occurred.
    
    Args:
        input_file: Path to telco_churn.csv
        output_file: Path to save normalized CSV
        
    Returns:
        Normalized DataFrame
    """
    # Read input CSV
    df = pd.read_csv(input_file)
    
    print(f"Loaded {len(df)} customers from {input_file}")
    
    # Base date (today)
    base_date = datetime.now().date()
    
    transactions = []
    
    for _, row in df.iterrows():
        customer_id = str(row['customerID'])
        tenure_months = int(row['tenure']) if pd.notna(row['tenure']) else 0
        monthly_charges = float(row['MonthlyCharges']) if pd.notna(row['MonthlyCharges']) else 0.0

        # Get churn label (use 'churned' column which is 0/1)
        churn_label = int(row['churned']) if 'churned' in row and pd.notna(row['churned']) else 0

        # Calculate last transaction date
        # If tenure is 0, use base_date. Otherwise, go back by tenure months
        if tenure_months == 0:
            last_date = base_date
        else:
            # Approximate: tenure months ago
            last_date = base_date - timedelta(days=30 * tenure_months)

        transactions.append({
            'customer_id': customer_id,
            'event_date': last_date.strftime('%Y-%m-%d'),
            'amount': monthly_charges,
            'event_type': 'monthly_charge',
            'churn_label': churn_label
        })

    # Create DataFrame
    normalized_df = pd.DataFrame(transactions)
    
    # Save to CSV
    normalized_df.to_csv(output_file, index=False)
    
    print(f"\nCreated {len(normalized_df)} transactions from {len(df)} customers")
    print(f"Saved to {output_file}")
    print(f"\nSample output:")
    print(normalized_df.head(10))
    print(f"\nDate range: {normalized_df['event_date'].min()} to {normalized_df['event_date'].max()}")
    
    return normalized_df


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Normalize Telco Churn dataset to standard schema')
    parser.add_argument('--input', type=str, default='datasets/telco_churn.csv',
                        help='Input CSV file path')
    parser.add_argument('--output', type=str, default='datasets/telco_churn_normalized.csv',
                        help='Output CSV file path')
    parser.add_argument('--mode', type=str, choices=['simple', 'detailed'], default='simple',
                        help='Normalization mode: simple (one transaction per customer) or detailed (monthly transactions)')
    parser.add_argument('--base-date', type=str, default=None,
                        help='Base date for transactions (YYYY-MM-DD). Defaults to today.')
    
    args = parser.parse_args()
    
    if args.mode == 'simple':
        normalize_telco_simple(args.input, args.output)
    else:
        normalize_telco_to_standard_schema(
            args.input,
            args.output,
            base_date=args.base_date,
            generate_transactions=True
        )

