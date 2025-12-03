import pandas as pd
import numpy as np

# 1. Load the dataset
try:
    df = pd.read_csv('D:\\pulse_retention_ai\\backend\\datasets\\telco_churn_normalized.csv')
    print("Successfully loaded 'telco_churn_normalized.csv'")
except FileNotFoundError:
    print("Error: The file 'telco_churn_normalized.csv' was not found.")
    exit()

# 2. Define the event types
event_types = [
    'login',
    'transaction',
    'transfer',
    'bill_pay',
    'mobile_deposit',
    'balance_check',
    'support_contact'
]

# 3. Randomly assign event types and churn labels
np.random.seed(42) # For reproducibility
df['event_type'] = np.random.choice(event_types, size=len(df))
df['churn_label'] = np.random.randint(0, 2, size=len(df))

# 4. Save to CSV
output_filename = 'telco_churn_with_events_and_labels.csv'
df.to_csv(output_filename, index=False)

print(f"Success! Generated '{output_filename}' with new columns.")
print(df.head())