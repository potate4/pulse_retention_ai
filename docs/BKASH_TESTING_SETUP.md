# bKash Testing Setup - Minimal Configuration

## ✅ For Testing, You Only Need 4 Variables

For **sandbox testing**, you only need these **4 required** environment variables:

```env
BKASH_APP_KEY=your_app_key_here
BKASH_APP_SECRET=your_app_secret_here
BKASH_USERNAME=your_username_here
BKASH_PASSWORD=your_password_here
```

## 📋 Optional Variables (Have Defaults)

These have **default values** already set, so you **don't need** to add them unless you want to change them:

```env
# These are OPTIONAL - defaults are already set:
BKASH_SANDBOX_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta  # ✅ Default already set
BKASH_MODE=sandbox  # ✅ Default already set
BKASH_CALLBACK_URL=http://localhost:5173/payment/callback  # ✅ Default already set
BKASH_PRODUCTION_URL=https://tokenized.pay.bka.sh/v1.2.0-beta  # ✅ Only needed for production
```

## 🎯 Minimum `.env` File for Testing

Your `backend/.env` file only needs:

```env
# Database (you already have this)
DATABASE_URL=postgresql://user:password@localhost:5432/pulse_retention_db

# bKash - ONLY THESE 4 ARE REQUIRED FOR TESTING
BKASH_APP_KEY=your_app_key_from_bkash_portal
BKASH_APP_SECRET=your_app_secret_from_bkash_portal
BKASH_USERNAME=your_username_from_bkash_portal
BKASH_PASSWORD=your_password_from_bkash_portal
```

That's it! The other variables will use their defaults.

## 🔑 How to Get Test Credentials

1. **Visit**: https://developer.bka.sh/
2. **Register/Login** (free, no approval needed for sandbox)
3. **Create Application** → Get your credentials
4. **Copy** the 4 values to your `.env` file

## ⚠️ Important Notes

- **Sandbox is FREE** - No real money, no approval needed
- **All 4 credentials are required** - The API won't work without them
- **Other variables are optional** - They have sensible defaults
- **For production later**: You'll need production credentials (different from sandbox)

## 🧪 Quick Test

Once you add the 4 credentials, test with:

```bash
# Start backend
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload

# In another terminal, start frontend
cd frontend
npm run dev

# Go to: http://localhost:5173/pricing-billing
# Select plan → Choose bKash → Test payment flow
```

---

**Summary**: For testing, you only need **4 environment variables** (APP_KEY, APP_SECRET, USERNAME, PASSWORD). Everything else has defaults! 🎉

