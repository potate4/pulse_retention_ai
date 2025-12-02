# Sheba Retention AI - MVP Execution Guide

## Team Member Assignments

Based on skills, assign tasks as follows:

- **Mehreen** (AI Engineer): ML Models (Churn + Segmentation), SHAP Explainability
- **Nowshin** (R&D/Model Training): Data Generation, Model Training Pipeline
- **Sumaiya** (Full-stack AI Engineer): Backend API (FastAPI), Integration, Intervention Engine
- **Nufsat** (Frontend Developer): React Dashboard, UI Components, Visualization

---

## Phase 1: Project Setup & Data Generation (Hours 0-4)

### Task 1.1: Project Setup
**Assigned to:** Sumaiya (can share screen/setup)

**Steps:**
1. Create project structure:
```bash
mkdir sheba-retention-ai
cd sheba-retention-ai
mkdir -p backend/data backend/ml frontend/src/components data
```

2. Setup Python virtual environment:
```bash
python -m venv env
# Windows:
env\Scripts\activate
# Linux/Mac:
source env/bin/activate
```

3. Create `backend/requirements.txt`:
```txt
fastapi==0.104.1
uvicorn==0.24.0
pandas==2.1.3
numpy==1.26.2
scikit-learn==1.3.2
xgboost==2.0.3
shap==0.43.0
python-multipart==0.0.6
python-dotenv==1.0.0
sqlalchemy==2.0.23
```

4. Install dependencies:
```bash
pip install -r backend/requirements.txt
```

5. Setup React frontend:
```bash
cd frontend
npx create-react-app . --template minimal
cd ..
```

6. Install frontend dependencies:
```bash
cd frontend
npm install axios recharts tailwindcss postcss autoprefixer
npm install -D @tailwindcss/forms
```

7. Initialize TailwindCSS:
```bash
npx tailwindcss init -p
```

8. Create `.gitignore`:
```
env/
__pycache__/
*.pyc
*.pkl
*.db
*.csv
node_modules/
.DS_Store
.env
frontend/build/
```

**✅ Acceptance Criteria:**
- Project folders created
- Virtual environment active
- All dependencies installed
- Frontend setup complete

**Handoff:** Share repository access with all team members

---

### Task 1.2: Data Generation
**Assigned to:** Nowshin (Data generation + validation)

**Steps:**

1. Create `backend/data/generator.py`:

```python
import pandas as pd
import numpy as np
from faker import Faker
from datetime import datetime, timedelta
import random

fake = Faker('bn_BD')  # Bangladeshi locale

def generate_customers(n=10000, seed=42):
    """Generate realistic Sheba customer data"""
    np.random.seed(seed)
    random.seed(seed)
    
    customers = []
    
    # Bangladesh locations
    locations = ['Dhaka', 'Gazipur', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna']
    service_types = ['AC', 'Cleaning', 'Electrician', 'Plumbing', 'Painting', 'Others']
    
    for i in range(n):
        customer_id = i + 1
        
        # Demographics
        name = fake.name()
        location = np.random.choice(locations, p=[0.4, 0.15, 0.15, 0.1, 0.1, 0.1])
        age = np.random.randint(25, 66)
        income = np.random.choice([15000, 25000, 40000, 60000, 90000, 120000], 
                                p=[0.15, 0.25, 0.25, 0.2, 0.1, 0.05])
        
        # Booking behavior
        num_bookings = np.random.negative_binomial(2, 0.3)  # Realistic distribution
        if num_bookings == 0:
            num_bookings = 1
        
        # Average spending per booking
        base_spend = np.random.choice([200, 400, 800, 1200, 2000], 
                                     p=[0.2, 0.3, 0.3, 0.15, 0.05])
        avg_spent = base_spend * (1 + np.random.normal(0, 0.2))
        avg_spent = max(100, int(avg_spent))
        
        # Last booking date (some customers are inactive)
        days_since_booking = np.random.exponential(30)  # Most recent, some old
        last_booking_date = datetime.now() - timedelta(days=int(days_since_booking))
        
        # Complaints (rare but impactful)
        complaints_count = np.random.poisson(0.3)  # Most have 0-1
        if complaints_count > 5:
            complaints_count = 5
        
        # Competitor search (correlates with churn)
        if days_since_booking > 45:
            searched_competitor = np.random.choice([True, False], p=[0.3, 0.7])
        else:
            searched_competitor = np.random.choice([True, False], p=[0.05, 0.95])
        
        # Service type preference
        service_type = np.random.choice(service_types, p=[0.3, 0.25, 0.2, 0.15, 0.05, 0.05])
        
        # Price sensitivity (inversely correlated with income)
        price_sensitivity_score = 1 - (income / 150000) + np.random.normal(0, 0.2)
        price_sensitivity_score = max(0, min(1, price_sensitivity_score))
        
        # Churn label (ground truth for training)
        is_churned = 0
        if days_since_booking > 60 and (searched_competitor or complaints_count >= 2):
            is_churned = 1
        
        # Payment method (Bangladesh specific)
        payment_method = np.random.choice(['bKash', 'Nagad', 'Bank', 'Cash'], 
                                        p=[0.65, 0.20, 0.10, 0.05])
        
        customer = {
            'customer_id': customer_id,
            'name': name,
            'location': location,
            'age': age,
            'income': income,
            'last_booking_date': last_booking_date.strftime('%Y-%m-%d'),
            'days_since_last_booking': int(days_since_booking),
            'num_bookings': num_bookings,
            'avg_spent': avg_spent,
            'complaints_count': complaints_count,
            'searched_competitor': 1 if searched_competitor else 0,
            'service_type': service_type,
            'price_sensitivity_score': round(price_sensitivity_score, 2),
            'payment_method': payment_method,
            'is_churned': is_churned
        }
        
        customers.append(customer)
    
    return pd.DataFrame(customers)

if __name__ == '__main__':
    print("Generating 10,000 customers...")
    df = generate_customers(n=10000)
    
    # Save to CSV
    df.to_csv('data/customers.csv', index=False)
    
    # Display summary
    print(f"\nGenerated {len(df)} customers")
    print(f"Churn rate: {df['is_churned'].mean():.2%}")
    print(f"\nFirst 5 rows:")
    print(df.head())
    print(f"\nData summary:")
    print(df.describe())
```

2. Create `data/` folder and run generator:
```bash
python backend/data/generator.py
```

3. Validate data quality:
```python
# Create backend/data/validate.py
import pandas as pd

df = pd.read_csv('data/customers.csv')
print(f"Total customers: {len(df)}")
print(f"Churn rate: {df['is_churned'].mean():.2%}")
print(f"Missing values:\n{df.isnull().sum()}")
print(f"\nData types:\n{df.dtypes}")
```

**✅ Acceptance Criteria:**
- 10,000 customers generated in `data/customers.csv`
- Churn rate between 60-70% (matches problem statement)
- No missing values in critical fields
- Data exported successfully

**Deliverable:** `data/customers.csv` file (commit to repo)

---

## Phase 2: ML Model Development (Hours 4-8)

### Task 2.1: Churn Prediction Model
**Assigned to:** Mehreen (XGBoost model)

**Steps:**

1. Create `backend/ml/churn_model.py`:

```python
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import os

def prepare_features(df):
    """Prepare features for churn prediction"""
    features = [
        'days_since_last_booking',
        'num_bookings',
        'avg_spent',
        'complaints_count',
        'searched_competitor',
        'price_sensitivity_score',
        'age',
        'income'
    ]
    
    # Create feature matrix
    X = df[features].copy()
    
    # One-hot encode categorical features
    if 'service_type' in df.columns:
        service_dummies = pd.get_dummies(df['service_type'], prefix='service')
        X = pd.concat([X, service_dummies], axis=1)
    
    if 'payment_method' in df.columns:
        payment_dummies = pd.get_dummies(df['payment_method'], prefix='payment')
        X = pd.concat([X, payment_dummies], axis=1)
    
    return X

def train_churn_model(df, save_path='backend/models/churn_model.pkl'):
    """Train XGBoost churn prediction model"""
    
    # Prepare features and target
    X = prepare_features(df)
    y = df['is_churned']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train XGBoost model
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric='logloss'
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    print(f"\nModel Performance:")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1-Score: {f1:.4f}")
    
    # Save model
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    joblib.dump(model, save_path)
    print(f"\nModel saved to {save_path}")
    
    # Save feature names for inference
    feature_names_path = save_path.replace('.pkl', '_features.pkl')
    joblib.dump(list(X.columns), feature_names_path)
    
    return model, X.columns

if __name__ == '__main__':
    # Load data
    df = pd.read_csv('data/customers.csv')
    
    # Train model
    model, feature_names = train_churn_model(df)
    
    # Test prediction
    sample_customer = prepare_features(df.iloc[[0]])
    prediction = model.predict_proba(sample_customer)[0]
    print(f"\nSample prediction (churn probability): {prediction[1]:.2%}")
```

2. Train the model:
```bash
python backend/ml/churn_model.py
```

**✅ Acceptance Criteria:**
- Model accuracy > 75%
- Model saved as `backend/models/churn_model.pkl`
- Feature names saved for inference
- Model can predict churn probability

**Deliverable:** Trained churn model + feature list

---

### Task 2.2: Customer Segmentation Model
**Assigned to:** Mehreen (K-Means clustering)

**Steps:**

1. Create `backend/ml/segmentation.py`:

```python
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import joblib

def prepare_segmentation_features(df):
    """Prepare features for customer segmentation"""
    features = [
        'avg_spent',
        'num_bookings',
        'days_since_last_booking',
        'price_sensitivity_score',
        'complaints_count',
        'income'
    ]
    
    X = df[features].copy()
    
    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    return X_scaled, features, scaler

def train_segmentation_model(df, n_clusters=4, save_path='backend/models/segmentation_model.pkl'):
    """Train K-Means segmentation model"""
    
    # Prepare features
    X_scaled, feature_names, scaler = prepare_segmentation_features(df)
    
    # Train K-Means
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)
    
    # Map clusters to segments
    cluster_profiles = {}
    for cluster_id in range(n_clusters):
        cluster_data = df[labels == cluster_id]
        
        avg_spent = cluster_data['avg_spent'].mean()
        num_bookings = cluster_data['num_bookings'].mean()
        price_sensitivity = cluster_data['price_sensitivity_score'].mean()
        
        # Assign segment name based on characteristics
        if avg_spent > 1000 and price_sensitivity < 0.4:
            segment_name = "High-Value"
        elif price_sensitivity > 0.6:
            segment_name = "Price-Sensitive"
        elif cluster_data['complaints_count'].mean() > 1:
            segment_name = "Quality-Focused"
        elif num_bookings > 5:
            segment_name = "Loyal"
        else:
            segment_name = "Occasional"
        
        cluster_profiles[cluster_id] = {
            'segment_name': segment_name,
            'avg_spent': avg_spent,
            'num_bookings': num_bookings,
            'size': len(cluster_data)
        }
        
        print(f"\nCluster {cluster_id} ({segment_name}):")
        print(f"  Size: {len(cluster_data)} customers")
        print(f"  Avg Spent: Tk {avg_spent:.0f}")
        print(f"  Avg Bookings: {num_bookings:.1f}")
    
    # Save model and scaler
    import os
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    joblib.dump(kmeans, save_path)
    joblib.dump(scaler, save_path.replace('.pkl', '_scaler.pkl'))
    joblib.dump(cluster_profiles, save_path.replace('.pkl', '_profiles.pkl'))
    
    return kmeans, scaler, cluster_profiles, labels

if __name__ == '__main__':
    # Load data
    df = pd.read_csv('data/customers.csv')
    
    # Train segmentation model
    model, scaler, profiles, labels = train_segmentation_model(df)
    
    # Add segments to dataframe
    df['segment'] = [profiles[label]['segment_name'] for label in labels]
    
    # Save updated data
    df.to_csv('data/customers_with_segments.csv', index=False)
    print("\nSegmented data saved to data/customers_with_segments.csv")
```

2. Train segmentation model:
```bash
python backend/ml/segmentation.py
```

**✅ Acceptance Criteria:**
- 3-5 distinct customer segments identified
- Segments make business sense (High-Value, Price-Sensitive, etc.)
- Model saved as `backend/models/segmentation_model.pkl`
- Customers have segment labels in CSV

**Deliverable:** Trained segmentation model + segmented customer data

---

### Task 2.3: SHAP Explainability
**Assigned to:** Mehreen (SHAP integration)

**Steps:**

1. Create `backend/ml/explainability.py`:

```python
import shap
import pandas as pd
import joblib
import numpy as np

def load_churn_model():
    """Load trained churn model"""
    model = joblib.load('backend/models/churn_model.pkl')
    feature_names = joblib.load('backend/models/churn_model_features.pkl')
    return model, feature_names

def explain_prediction(model, customer_data, feature_names):
    """Generate SHAP explanation for a single customer"""
    
    # Create SHAP explainer (use TreeExplainer for XGBoost)
    explainer = shap.TreeExplainer(model)
    
    # Get SHAP values
    shap_values = explainer.shap_values(customer_data)
    
    # Get feature contributions
    feature_importance = []
    for i, feature in enumerate(feature_names):
        importance = shap_values[0][i]  # For binary classification, use [0] for class 1
        feature_importance.append({
            'feature': feature,
            'importance': float(importance)
        })
    
    # Sort by absolute importance
    feature_importance.sort(key=lambda x: abs(x['importance']), reverse=True)
    
    # Get top 3 features
    top_features = feature_importance[:3]
    
    # Generate human-readable explanation
    explanation = "High churn risk due to: "
    reasons = []
    
    for feat in top_features:
        feat_name = feat['feature'].replace('_', ' ').title()
        importance = feat['importance']
        
        if importance > 0:
            reasons.append(f"{feat_name} (+{importance:.2f})")
        else:
            reasons.append(f"{feat_name} ({importance:.2f})")
    
    explanation += ", ".join(reasons)
    
    return {
        'explanation': explanation,
        'top_features': top_features[:5],
        'shap_values': shap_values[0].tolist()
    }

def explain_customer(customer_id, df):
    """Get explanation for a specific customer"""
    
    # Load model
    model, feature_names = load_churn_model()
    
    # Prepare customer data (use same preprocessing as training)
    from backend.ml.churn_model import prepare_features
    customer_data = prepare_features(df[df['customer_id'] == customer_id])
    
    if len(customer_data) == 0:
        return None
    
    # Get prediction
    churn_prob = model.predict_proba(customer_data)[0][1]
    
    # Get explanation
    explanation_data = explain_prediction(model, customer_data, feature_names)
    explanation_data['churn_probability'] = float(churn_prob)
    
    return explanation_data

if __name__ == '__main__':
    # Test with a sample customer
    df = pd.read_csv('data/customers_with_segments.csv')
    
    # Find a high-risk customer
    high_risk = df[df['days_since_last_booking'] > 50].iloc[0]
    
    explanation = explain_customer(high_risk['customer_id'], df)
    
    print(f"\nCustomer {high_risk['customer_id']} - {high_risk['name']}")
    print(f"Churn Probability: {explanation['churn_probability']:.2%}")
    print(f"\nExplanation:")
    print(explanation['explanation'])
```

**✅ Acceptance Criteria:**
- SHAP explanations generated for predictions
- Top 3 features identified per customer
- Human-readable explanations work
- Can explain why each customer is at risk

**Deliverable:** SHAP explainability module

---

## Phase 3: Backend API Development (Hours 8-12)

### Task 3.1: FastAPI Backend Setup
**Assigned to:** Sumaiya (FastAPI backend)

**Steps:**

1. Create `backend/main.py`:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import joblib
import numpy as np

# Load data and models
df = pd.read_csv('data/customers_with_segments.csv')
churn_model = joblib.load('backend/models/churn_model.pkl')
segmentation_model = joblib.load('backend/models/segmentation_model.pkl')
segmentation_scaler = joblib.load('backend/models/segmentation_model_scaler.pkl')
segmentation_profiles = joblib.load('backend/models/segmentation_model_profiles.pkl')

app = FastAPI(title="Sheba Retention AI API")

# CORS middleware (for React frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChurnPredictionRequest(BaseModel):
    customer_id: int

class ChurnPredictionResponse(BaseModel):
    customer_id: int
    churn_probability: float
    risk_category: str
    segment: str
    explanation: str

class AtRiskCustomer(BaseModel):
    customer_id: int
    name: str
    churn_probability: float
    risk_category: str
    segment: str
    days_since_last_booking: int
    suggested_action: str

class DashboardStats(BaseModel):
    total_customers: int
    at_risk_count: int
    critical_risk_count: int
    avg_churn_rate: float
    retention_rate: float

def predict_churn(customer_id: int):
    """Predict churn for a customer"""
    customer = df[df['customer_id'] == customer_id]
    if len(customer) == 0:
        return None
    
    # Prepare features
    from backend.ml.churn_model import prepare_features
    features = prepare_features(customer)
    
    # Predict
    churn_prob = churn_model.predict_proba(features)[0][1]
    
    return float(churn_prob)

def get_risk_category(churn_prob: float):
    """Get risk category from churn probability"""
    if churn_prob >= 0.7:
        return "Critical"
    elif churn_prob >= 0.5:
        return "High"
    elif churn_prob >= 0.3:
        return "Medium"
    else:
        return "Low"

def get_segment(customer_id: int):
    """Get customer segment"""
    customer = df[df['customer_id'] == customer_id]
    if len(customer) == 0:
        return None
    return customer['segment'].iloc[0]

def recommend_intervention(churn_prob: float, segment: str):
    """Simple rules-based intervention recommendation"""
    if churn_prob > 0.7 and segment == "Price-Sensitive":
        return "Tk 300 discount"
    elif churn_prob > 0.7 and segment == "High-Value":
        return "Tk 500 discount"
    elif churn_prob > 0.7:
        return "Tk 400 discount"
    elif churn_prob > 0.5:
        return "Maintenance reminder"
    else:
        return "No action needed"

@app.get("/")
def root():
    return {"message": "Sheba Retention AI API", "version": "1.0"}

@app.post("/predict/churn", response_model=ChurnPredictionResponse)
def predict_churn_api(request: ChurnPredictionRequest):
    """Get churn prediction for a customer"""
    
    customer_id = request.customer_id
    
    # Get churn probability
    churn_prob = predict_churn(customer_id)
    if churn_prob is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get segment
    segment = get_segment(customer_id)
    
    # Get risk category
    risk_category = get_risk_category(churn_prob)
    
    # Get explanation (simplified for MVP)
    customer = df[df['customer_id'] == customer_id].iloc[0]
    days = customer['days_since_last_booking']
    competitor = "Yes" if customer['searched_competitor'] else "No"
    
    explanation = f"High churn risk due to: {days} days inactive (+0.34), "
    if customer['searched_competitor']:
        explanation += "competitor search (+0.21), "
    explanation += f"price sensitivity ({customer['price_sensitivity_score']:.2f})"
    
    return ChurnPredictionResponse(
        customer_id=customer_id,
        churn_probability=churn_prob,
        risk_category=risk_category,
        segment=segment,
        explanation=explanation
    )

@app.get("/predictions/at-risk", response_model=List[AtRiskCustomer])
def get_at_risk_customers(limit: int = 50, min_risk: float = 0.5):
    """Get list of at-risk customers"""
    
    at_risk = []
    
    for _, customer in df.iterrows():
        churn_prob = predict_churn(customer['customer_id'])
        
        if churn_prob >= min_risk:
            segment = customer['segment']
            risk_category = get_risk_category(churn_prob)
            suggested_action = recommend_intervention(churn_prob, segment)
            
            at_risk.append(AtRiskCustomer(
                customer_id=int(customer['customer_id']),
                name=customer['name'],
                churn_probability=churn_prob,
                risk_category=risk_category,
                segment=segment,
                days_since_last_booking=int(customer['days_since_last_booking']),
                suggested_action=suggested_action
            ))
    
    # Sort by churn probability (highest first)
    at_risk.sort(key=lambda x: x.churn_probability, reverse=True)
    
    return at_risk[:limit]

@app.get("/predictions/dashboard", response_model=DashboardStats)
def get_dashboard_stats():
    """Get dashboard summary statistics"""
    
    # Predict churn for all customers
    churn_probs = []
    for _, customer in df.iterrows():
        churn_prob = predict_churn(customer['customer_id'])
        churn_probs.append(churn_prob)
    
    churn_probs = np.array(churn_probs)
    
    at_risk_count = int(np.sum(churn_probs >= 0.5))
    critical_risk_count = int(np.sum(churn_probs >= 0.7))
    avg_churn_rate = float(np.mean(churn_probs))
    retention_rate = 1 - avg_churn_rate
    
    return DashboardStats(
        total_customers=len(df),
        at_risk_count=at_risk_count,
        critical_risk_count=critical_risk_count,
        avg_churn_rate=avg_churn_rate,
        retention_rate=retention_rate
    )

@app.get("/customers/{customer_id}")
def get_customer(customer_id: int):
    """Get customer profile with predictions"""
    
    customer = df[df['customer_id'] == customer_id]
    if len(customer) == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer_data = customer.iloc[0].to_dict()
    
    # Add predictions
    churn_prob = predict_churn(customer_id)
    segment = get_segment(customer_id)
    risk_category = get_risk_category(churn_prob)
    suggested_action = recommend_intervention(churn_prob, segment)
    
    # Get explanation (simplified)
    explanation = f"{customer_data['days_since_last_booking']} days inactive, "
    if customer_data['searched_competitor']:
        explanation += "searched competitors, "
    explanation += f"price sensitivity: {customer_data['price_sensitivity_score']:.2f}"
    
    return {
        **customer_data,
        'churn_probability': churn_prob,
        'risk_category': risk_category,
        'segment': segment,
        'suggested_action': suggested_action,
        'explanation': explanation
    }

@app.get("/segments")
def get_segments():
    """Get customer segment distribution"""
    
    segment_counts = df['segment'].value_counts().to_dict()
    
    return {
        'segments': segment_counts,
        'total': len(df)
    }

@app.post("/interventions/recommend")
def recommend_intervention_api(request: ChurnPredictionRequest):
    """Get intervention recommendation for a customer"""
    
    customer_id = request.customer_id
    
    churn_prob = predict_churn(customer_id)
    if churn_prob is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    segment = get_segment(customer_id)
    suggested_action = recommend_intervention(churn_prob, segment)
    
    return {
        'customer_id': customer_id,
        'churn_probability': churn_prob,
        'segment': segment,
        'recommended_action': suggested_action,
        'priority': 'High' if churn_prob > 0.7 else 'Medium' if churn_prob > 0.5 else 'Low'
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

2. Test API:
```bash
python backend/main.py
# Then test: curl http://localhost:8000/
```

**✅ Acceptance Criteria:**
- FastAPI server starts on port 8000
- All 6 endpoints work
- CORS enabled for React frontend
- Can predict churn for any customer

**Deliverable:** Working FastAPI backend

---

## Phase 4: Frontend Dashboard (Hours 12-16)

### Task 4.1: React Dashboard Setup
**Assigned to:** Nufsat (Frontend UI)

**Steps:**

1. Update `frontend/src/index.css` with Tailwind:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

2. Update `frontend/tailwind.config.js`:
```js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

3. Create `frontend/src/services/api.js`:
```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getDashboardStats = async () => {
  const response = await api.get('/predictions/dashboard');
  return response.data;
};

export const getAtRiskCustomers = async (limit = 50) => {
  const response = await api.get(`/predictions/at-risk?limit=${limit}&min_risk=0.5`);
  return response.data;
};

export const getCustomer = async (customerId) => {
  const response = await api.get(`/customers/${customerId}`);
  return response.data;
};

export const getSegments = async () => {
  const response = await api.get('/segments');
  return response.data;
};

export const recommendIntervention = async (customerId) => {
  const response = await api.post('/interventions/recommend', { customer_id: customerId });
  return response.data;
};
```

4. Create `frontend/src/components/KPICards.jsx`:
```jsx
import React from 'react';

const KPICards = ({ stats }) => {
  if (!stats) return null;

  const kpis = [
    { label: 'Total Customers', value: stats.total_customers, color: 'blue' },
    { label: 'At Risk', value: stats.at_risk_count, color: 'orange' },
    { label: 'Critical Risk', value: stats.critical_risk_count, color: 'red' },
    { label: 'Retention Rate', value: `${(stats.retention_rate * 100).toFixed(1)}%`, color: 'green' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className={`bg-white rounded-lg shadow p-6 border-l-4 border-${kpi.color}-500`}
        >
          <p className="text-gray-600 text-sm font-medium">{kpi.label}</p>
          <p className={`text-2xl font-bold text-${kpi.color}-600 mt-2`}>
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export default KPICards;
```

5. Create `frontend/src/components/ChurnTable.jsx`:
```jsx
import React, { useState } from 'react';
import CustomerModal from './CustomerModal';

const ChurnTable = ({ customers, onRefresh }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const getRiskColor = (risk) => {
    if (risk === 'Critical') return 'bg-red-100 text-red-800';
    if (risk === 'High') return 'bg-orange-100 text-orange-800';
    if (risk === 'Medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">At-Risk Customers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Churn Risk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Since Booking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr
                  key={customer.customer_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleCustomerClick(customer)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.customer_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(customer.churn_probability * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(customer.risk_category)}`}>
                      {customer.risk_category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.segment}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.days_since_last_booking} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    {customer.suggested_action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default ChurnTable;
```

6. Create `frontend/src/components/SegmentChart.jsx`:
```jsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const SegmentChart = ({ segmentData }) => {
  if (!segmentData || !segmentData.segments) return null;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const data = Object.entries(segmentData.segments).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Segments</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SegmentChart;
```

7. Create `frontend/src/components/CustomerModal.jsx`:
```jsx
import React, { useState, useEffect } from 'react';
import { getCustomer } from '../services/api';

const CustomerModal = ({ customer, onClose }) => {
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getCustomer(customer.customer_id);
        setCustomerDetails(data);
      } catch (error) {
        console.error('Error fetching customer details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [customer.customer_id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Customer Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          {customerDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">{customerDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-semibold">{customerDetails.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Churn Probability</p>
                  <p className="font-semibold text-red-600">
                    {(customerDetails.churn_probability * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Risk Category</p>
                  <p className="font-semibold">{customerDetails.risk_category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Segment</p>
                  <p className="font-semibold">{customerDetails.segment}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Days Since Last Booking</p>
                  <p className="font-semibold">{customerDetails.days_since_last_booking}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">AI Explanation</p>
                <p className="text-gray-800 bg-blue-50 p-3 rounded">
                  {customerDetails.explanation}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">Recommended Action</p>
                <p className="text-lg font-semibold text-green-600">
                  {customerDetails.suggested_action}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;
```

8. Create main `frontend/src/App.jsx`:
```jsx
import React, { useState, useEffect } from 'react';
import { getDashboardStats, getAtRiskCustomers, getSegments } from './services/api';
import KPICards from './components/KPICards';
import ChurnTable from './components/ChurnTable';
import SegmentChart from './components/SegmentChart';

function App() {
  const [stats, setStats] = useState(null);
  const [atRiskCustomers, setAtRiskCustomers] = useState([]);
  const [segmentData, setSegmentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, customersData, segmentsData] = await Promise.all([
          getDashboardStats(),
          getAtRiskCustomers(50),
          getSegments(),
        ]);

        setStats(statsData);
        setAtRiskCustomers(customersData);
        setSegmentData(segmentsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Sheba Retention AI Dashboard</h1>

        <KPICards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <ChurnTable customers={atRiskCustomers} />
          </div>
          <div>
            <SegmentChart segmentData={segmentData} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
```

**✅ Acceptance Criteria:**
- Dashboard loads and displays data
- KPI cards show stats
- Table displays at-risk customers
- Pie chart shows segments
- Click customer opens modal with details
- UI is responsive and polished

**Deliverable:** Working React dashboard

---

## Phase 5: Integration & Testing (Hours 16-20)

### Task 5.1: End-to-End Integration
**Assigned to:** Sumaiya (Integration testing)

**Steps:**

1. Test complete workflow:
   - Backend API serves predictions
   - Frontend fetches and displays data
   - Customer modal shows explanations
   - All components work together

2. Fix any integration issues

3. Add error handling in frontend

**✅ Acceptance Criteria:**
- Complete flow works: Data → Models → API → Dashboard
- No console errors
- All API calls succeed
- UI updates properly

---

### Task 5.2: Polish & Demo Prep
**Assigned to:** All team members

**Steps:**

1. **UI Polish** (Nufsat):
   - Improve styling
   - Add loading states
   - Make responsive
   - Add hover effects

2. **Demo Data** (Nowshin):
   - Ensure interesting examples (high-risk, different segments)
   - Document sample customer IDs for demo

3. **README** (Sumaiya):
   - Setup instructions
   - How to run
   - API documentation
   - Demo guide

4. **Testing** (All):
   - Test all features
   - Fix bugs
   - Performance check

**✅ Acceptance Criteria:**
- Professional-looking UI
- Smooth demo flow
- Clear documentation
- No critical bugs

---

## Phase 6: Deployment (Hours 20-24)

### Task 6.1: Deploy to Railway/Heroku
**Assigned to:** Sumaiya (Deployment)

**Steps:**

1. **Backend Deployment:**
   - Create `Procfile`: `web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - Deploy to Railway/Heroku
   - Set environment variables

2. **Frontend Deployment:**
   - Update API URL to production
   - Build React app: `npm run build`
   - Deploy to Vercel/Netlify (free)

3. **Test deployment:**
   - Verify all endpoints work
   - Check CORS settings
   - Test from production URLs

**✅ Acceptance Criteria:**
- Backend accessible via public URL
- Frontend accessible via public URL
- Full functionality works in production
- Demo ready for presentation

---

## Quick Start Commands

```bash
# 1. Setup (one time)
python -m venv env
source env/bin/activate  # or env\Scripts\activate on Windows
pip install -r backend/requirements.txt
cd frontend && npm install && cd ..

# 2. Generate data
python backend/data/generator.py

# 3. Train models
python backend/ml/churn_model.py
python backend/ml/segmentation.py

# 4. Start backend
cd backend
python main.py

# 5. Start frontend (new terminal)
cd frontend
npm start

# 6. Open browser
# http://localhost:3000
```

---

## Handoff Points

1. **Data → Models:** Nowshin completes data generation, hands CSV to Mehreen
2. **Models → API:** Mehreen completes models, hands .pkl files to Sumaiya
3. **API → Frontend:** Sumaiya completes API, shares endpoints with Nufsat
4. **Integration:** All work together to integrate and test
5. **Demo:** All prepare demo together

---

## Tips for Parallel Work

- Use Git branches for each feature
- Commit frequently with clear messages
- Test your component independently before integration
- Communicate blockers immediately
- Review each other's code quickly

Good luck! 🚀

