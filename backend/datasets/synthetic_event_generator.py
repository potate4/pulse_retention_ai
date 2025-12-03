import pandas as pd
import numpy as np

# 1. Load the dataset
# Ensure 'telco_churn_normalized.csv' is in your current working directory
try:
    df = pd.read_csv('D:\\pulse_retention_ai\\backend\\datasets\\telco_churn_normalized_with_labels.csv')
    print("Successfully loaded 'telco_churn_normalized.csv'")
except FileNotFoundError:
    print("Error: The file 'telco_churn_normalized.csv' was not found.")
    exit()

# 2. Define the event types extracted from the banking behavior code
event_types = [
    'login',
    'transaction',
    'transfer',
    'bill_pay',
    'mobile_deposit',
    'balance_check',
    'support_contact'
]

# 3. Randomly assign these event types to the 'event_type' column
# We use numpy to randomly select an event type for each row
np.random.seed(42) # Optional: Use a seed for reproducibility
df['event_type'] = np.random.choice(event_types, size=len(df))

# 4. Save the modified DataFrame to a new CSV file
output_filename = 'telco_churn_normalized_with_events_and_labels.csv'
df.to_csv(output_filename, index=False)

print(f"Success! Generated '{output_filename}' with the following event distribution:")
print(df['event_type'].value_counts())