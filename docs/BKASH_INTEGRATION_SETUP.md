# bKash Payment Gateway Integration - Setup Guide

## ✅ Implementation Complete

The bKash payment gateway has been successfully integrated into your Pulse Retention AI application.

## 📋 What Was Implemented

### Backend Changes:
1. **Database Schema**: Added subscription fields to User model
   - `subscription_plan` (starter/professional/enterprise)
   - `subscription_status` (active/inactive/expired)
   - `subscription_start_date`, `subscription_end_date`
   - `billing_cycle` (monthly/yearly)

2. **bKash Service** (`backend/app/services/bkash_service.py`):
   - Token grant for API authentication
   - Payment creation
   - Payment execution
   - Payment query/verification

3. **Payment Endpoints** (`backend/app/api/v1/endpoints/payment.py`):
   - `POST /api/v1/payment/initiate` - Start payment
   - `POST /api/v1/payment/verify/{payment_id}` - Verify and activate subscription
   - `GET /api/v1/payment/status/{payment_id}` - Check payment status
   - `GET /api/v1/payment/subscription/current` - Get current subscription

4. **Configuration**: Added bKash settings to `backend/app/core/config.py`

### Frontend Changes:
1. **Payment API Client** (`frontend/src/api/payment.js`)
2. **PricingBilling Page**: Updated to redirect to bKash payment page
3. **PaymentCallback Page**: Handles payment verification after bKash redirect
4. **Dashboard**: Added "Current Plan" card beside Account Status
5. **Routes**: Added `/payment/callback` route

## 🔧 Setup Instructions

### Step 1: Get bKash Credentials

1. Visit **bKash Developer Portal**: https://developer.bka.sh/
2. Register/Login as a merchant or developer
3. Create a new application for "Payment Gateway Integration" or "Tokenized Checkout"
4. Get your **Sandbox credentials** (available for everyone, no onboarding needed):
   - App Key
   - App Secret
   - Username (usually same as App Key for sandbox)
   - Password (usually same as App Secret for sandbox)

### Step 2: Configure Environment Variables

Add these to your `backend/.env` file:

```env
# bKash Payment Gateway Settings
BKASH_APP_KEY=your_bkash_app_key_here
BKASH_APP_SECRET=your_bkash_app_secret_here
BKASH_USERNAME=your_bkash_username_here
BKASH_PASSWORD=your_bkash_password_here

# bKash API URLs (defaults provided)
BKASH_SANDBOX_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta
BKASH_PRODUCTION_URL=https://tokenized.pay.bka.sh/v1.2.0-beta

# bKash Mode: 'sandbox' for testing, 'production' for live payments
BKASH_MODE=sandbox

# Callback URL after payment (update with your frontend URL)
BKASH_CALLBACK_URL=http://localhost:5173/payment/callback
```

### Step 3: Run Database Migration

```bash
cd backend
alembic upgrade head
```

This will add the subscription fields to the users table.

### Step 4: Install Python Dependencies

The bKash service uses the `requests` library. If not already installed:

```bash
cd backend
pip install requests
```

### Step 5: Test the Integration

1. **Start Backend**:
   ```bash
   cd backend
   .\venv\Scripts\activate
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Payment Flow**:
   - Navigate to `/pricing-billing`
   - Select a plan (Starter/Professional/Enterprise)
   - Choose "bKash" as payment method
   - Click "Proceed to Payment"
   - You'll be redirected to bKash sandbox payment page
   - Complete payment (use sandbox test credentials)
   - You'll be redirected back to your app
   - Dashboard will show your current plan

## 🔄 Payment Flow

1. **User selects plan** → Pricing & Billing page
2. **User chooses bKash** → Payment method selection
3. **User clicks "Proceed to Payment"** → Backend creates payment with bKash
4. **User redirected to bKash** → bKash payment page
5. **User completes payment** → bKash redirects back with payment_id
6. **PaymentCallback page** → Verifies payment and activates subscription
7. **Redirect to dashboard** → Shows "Current Plan" card with subscription details

## 📊 bKash API Endpoints Used

- **Grant Token**: `POST {base_url}/tokenized/checkout/token/grant`
- **Create Payment**: `POST {base_url}/tokenized/checkout/payment/create`
- **Execute Payment**: `POST {base_url}/tokenized/checkout/payment/execute`
- **Query Payment**: `POST {base_url}/tokenized/checkout/payment/query`

## 🧪 Sandbox Testing

- **No real money** is deducted in sandbox mode
- **No onboarding required** - sandbox is open for everyone
- Use test credentials from bKash developer portal
- Test payment flow end-to-end

## 🚀 Production Deployment

When ready for production:

1. **Get Production Credentials**:
   - Submit application for review on bKash merchant portal
   - Get approved and receive production credentials

2. **Update Environment Variables**:
   ```env
   BKASH_MODE=production
   BKASH_APP_KEY=your_production_app_key
   BKASH_APP_SECRET=your_production_app_secret
   BKASH_USERNAME=your_production_username
   BKASH_PASSWORD=your_production_password
   BKASH_CALLBACK_URL=https://yourdomain.com/payment/callback
   ```

3. **Test thoroughly** before going live

## 📝 Notes

- Payment credentials are stored securely in environment variables
- Never commit `.env` file to Git
- Sandbox mode is perfect for development and testing
- The callback URL must be accessible from bKash servers
- Payment verification happens automatically after user returns from bKash

## 🐛 Troubleshooting

### Payment not redirecting to bKash?
- Check backend logs for errors
- Verify bKash credentials are correct
- Ensure `BKASH_MODE=sandbox` for testing

### Payment callback not working?
- Verify `BKASH_CALLBACK_URL` is correct
- Check that frontend is accessible at the callback URL
- Look for errors in browser console and backend logs

### Subscription not activating?
- Check payment verification endpoint logs
- Verify database migration ran successfully
- Check user subscription fields in database

## 📚 Additional Resources

- bKash Developer Portal: https://developer.bka.sh/
- bKash API Documentation: Check developer portal for latest docs
- Sandbox Testing Guide: Available on bKash developer portal

---

**Need Help?** Check the backend logs and browser console for detailed error messages.

