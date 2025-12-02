# Pulse - Backend API

## Setup Instructions

Follow these steps to set up and run the backend locally:

1. **Clone the Repository**

   ```bash
   git clone <REPO_URL>
   cd backend
   ```

2. **Create and Activate a Virtual Environment**

   - On Unix/macOS:

     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

   - On Windows:

     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```

3. **Install Requirements**

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Development Server**

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

SWAGGER UI of all APIS: visit `http://localhost:5000/docs`.

The API base url will be available at `http://localhost:5000`.
