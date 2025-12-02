# Email Sender Setup Guide

## ✅ Fixed: Real Email Sending

The email sender has been updated to **actually send emails** using Python's SMTP library.

## 📝 Setup Instructions

### Step 1: Replace the Email Sender File

```powershell
cd backend/app/services
Remove-Item email_sender.py
Rename-Item email_sender_new.py email_sender.py
```

Or manually:
1. Delete `backend/app/services/email_sender.py`
2. Rename `backend/app/services/email_sender_new.py` to `email_sender.py`

### Step 2: Configure Gmail (Recommended)

#### Enable Gmail App Password:

1. **Enable 2-Factor Authentication**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other" → Type "Pulse App"
   - Click "Generate"
   - **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

#### Add to .env File:

Edit `backend/.env` and add these lines:

```env
# Email Configuration
USE_REAL_EMAIL=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
FROM_EMAIL=your-email@gmail.com
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

**Replace**:
- `your-email@gmail.com` with your actual Gmail address
- `abcd efgh ijkl mnop` with your generated app password (remove spaces)

### Step 3: Restart Backend Server

```powershell
cd backend
# If server is running, stop it (Ctrl+C)
# Then restart:
python -m uvicorn app.main:app --reload
```

### Step 4: Test Email Sending

1. Open frontend: http://localhost:5173
2. Go to **Email Campaign** page
3. Select a segment (e.g., "Valued Customers")
4. Select a customer with a valid email (e.g., `nufsat@iut-dhaka.edu`)
5. Click **Generate Email Preview**
6. Click **Send to Customer(s)**
7. Check the **backend terminal** for logs
8. Check the **recipient's inbox** for the email

## 🔍 Troubleshooting

### Email Not Sent?

Check backend terminal logs:

**If you see**: `⚠️ MOCK MODE`
- Set `USE_REAL_EMAIL=true` in `.env`

**If you see**: `❌ SMTP credentials not configured`
- Add `SMTP_USER` and `SMTP_PASSWORD` to `.env`

**If you see**: `❌ Authentication failed`
- Check your app password is correct (no spaces)
- Make sure 2FA is enabled on Gmail
- Generate a new app password

**If you see**: `✅ Email successfully sent`
- Check recipient's spam/junk folder
- Check recipient email address is correct

### Using Other Email Providers

#### Outlook/Hotmail:
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-outlook-password
```

#### Yahoo:
```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-yahoo-app-password
```

## 🎯 Testing with Customer Data

Update customer email in `backend/app/services/customer_service.py`:

```python
{
    "id": "c1",
    "name": "Rahim Ahmed",
    "email": "your-test-email@gmail.com",  # ← Change this
    ...
}
```

## ✨ Features

- ✅ **Real SMTP sending** (no more mock/console logging)
- ✅ **Gmail support** (with app passwords)
- ✅ **HTML emails** with proper formatting
- ✅ **Bulk sending** to multiple recipients
- ✅ **Error handling** with detailed logs
- ✅ **Graceful fallback** to mock mode if credentials missing

## 📧 Email Flow

1. User selects segment & customers in frontend
2. Frontend calls `/api/emails/generate` to get template
3. User reviews preview and clicks "Send"
4. Frontend calls `/api/emails/send` with customer IDs
5. Backend fetches customer data from `customer_service.py`
6. Backend personalizes template with customer info
7. **NEW**: Backend actually sends email via SMTP
8. Recipients receive emails in their inbox!

## 🚀 Quick Start (TL;DR)

```powershell
# 1. Replace file
cd backend/app/services
Remove-Item email_sender.py
Rename-Item email_sender_new.py email_sender.py

# 2. Edit backend/.env
# Add: SMTP_USER, SMTP_PASSWORD, USE_REAL_EMAIL=true

# 3. Restart backend
cd ../../
python -m uvicorn app.main:app --reload

# 4. Test from frontend
# Go to Email Campaign → Select customer → Send
```

Done! Your emails will now be sent for real! 🎉
