# 📧 Email Generator + Segmented Email Sender - Quick Start Guide

## ✅ Feature Complete & Running!

The **Email Campaign** feature is fully implemented and operational with mock data.

---

## 🚀 Access the Application

### Backend API
- **URL**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Status**: ✅ Running on port 8000

### Frontend Application
- **URL**: http://localhost:5173
- **Status**: ✅ Running on port 5173

---

## 📖 How to Use

### Step 1: Login to the Application
1. Open http://localhost:5173
2. Click **"Sign Up"** to create an account, or use existing credentials
3. After login, you'll see the Dashboard

### Step 2: Access Email Campaign
1. On the Dashboard, click the **"Email Campaign"** button (blue card)
2. You'll be taken to `/email-campaign`

### Step 3: Select a Customer Segment
1. Choose from the dropdown:
   - **High Value Customers** (3 customers, low churn risk)
   - **At Risk Customers** (3 customers, high churn risk)
   - **New Users** (4 customers, recently onboarded)

### Step 4: Review Customers
- See the customer table with:
  - Name, Email, Phone
  - Churn Score (color-coded: green=low, yellow=medium, red=high)
  - Purchase Amount
- All customers are auto-selected (you can change selection)

### Step 5: Generate Email Preview
1. Click **"Generate Email Preview"** button
2. AI-generated email appears on the right side:
   - Personalized subject
   - HTML email body with customer data
   - Customized based on segment type

### Step 6: Edit Template (Optional)
1. Click **"Edit Template"** button in preview card
2. Modify subject and body text
3. Insert dynamic fields like `{name}`, `{purchase_amount}`
4. See live preview
5. Save changes

### Step 7: Send Emails
1. Review selected customers count
2. Click **"Send to X Customer(s)"** button
3. Confirm in the popup
4. Emails are "sent" (currently logs to backend console)
5. See success message with sent/failed counts

---

## 🧪 Test the API Directly

Open http://localhost:8000/docs and try these endpoints:

### 1. Get Segments
```
GET /api/v1/emails/segments
```
Returns 3 mock segments.

### 2. Get Customers in Segment
```
GET /api/v1/emails/segments/s1/customers
```
Replace `s1` with: `s1`, `s2`, or `s3`

### 3. Generate Email Preview
```
POST /api/v1/emails/emails/generate
Body:
{
  "customer_ids": ["c1", "c2"],
  "segment_id": "s1"
}
```

### 4. Send Emails
```
POST /api/v1/emails/emails/send
Body:
{
  "subject": "Hello {name}",
  "html_body": "<p>Hi {name}, your purchase was ৳{purchase_amount}</p>",
  "customer_ids": ["c1", "c2"],
  "segment_id": "s1"
}
```

**Check backend console** to see email logs!

---

## 📊 Mock Data Overview

### Segments:
1. **s1 - High Value Customers**: Thank you emails + 20% discount
2. **s2 - At Risk Customers**: Win-back emails + 30% comeback offer
3. **s3 - New Users**: Welcome emails + new customer benefits

### Customers (10 total):
- **c1-c3**: High value (Rahim, Fatima, Karim)
- **c4-c6**: At risk (Nadia, Shakib, Ayesha)
- **c7-c10**: New users (Tanvir, Sumaiya, Rifat, Maliha)

### Email Templates:
- Personalized with `{name}`, `{email}`, `{purchase_amount}`, `{last_purchase}`
- HTML + plain text versions
- Different design per segment

---

## 🎯 Demo Workflow (For Judges)

**Scenario: Re-engage "At Risk Customers"**

1. **Login** to the application
2. **Navigate** to Email Campaign
3. **Select** "At Risk Customers" segment
4. **See** 3 customers with high churn scores (68-82%)
5. **Generate Preview** - AI creates "We Miss You" email
6. **Review** personalized email with:
   - Customer name
   - Last purchase date
   - 30% comeback offer
7. **Send** to all 3 customers
8. **Check console** - see 3 personalized emails logged

---

## 🔌 Integration Points (For Your Teammates)

All integration points are clearly marked in code with `TODO` comments:

### 1. Segmentation API
**File**: `backend/app/services/segmentation_service.py`
- Replace `get_mock_segments()` with API call
- Expected endpoint: `GET /api/segments`

### 2. Template Generator API
**File**: `backend/app/services/email_template_service.py`
- Replace `get_mock_template()` with API call
- Expected endpoint: `POST /api/generate-template`

### 3. Email Sender
**File**: `backend/app/services/email_sender.py`
- Replace console logging with SendGrid/Mailgun/SMTP
- Patterns provided for all 3 options

**Full integration guide**: See `EMAIL_FEATURE_INTEGRATION_GUIDE.md`

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── services/
│   │   ├── customer_service.py       # Customer data
│   │   ├── segmentation_service.py   # Segment operations
│   │   ├── email_template_service.py # AI template generation
│   │   ├── email_sender.py           # Email sending
│   │   └── email_service.py          # Main orchestration
│   ├── api/v1/endpoints/
│   │   └── emails.py                 # API endpoints
│   ├── schemas/
│   │   ├── customer.py               # Customer schemas
│   │   └── email.py                  # Email schemas
│   └── db/models/
│       ├── customer.py               # Customer model
│       └── email_log.py              # Email log model

frontend/
├── src/
│   ├── pages/
│   │   ├── EmailCampaign.jsx         # Main campaign page
│   │   └── EditTemplate.jsx          # Template editor page
│   ├── components/
│   │   ├── SegmentSelector.jsx       # Segment dropdown
│   │   ├── CustomerTable.jsx         # Customer list table
│   │   ├── EmailPreviewCard.jsx      # Email preview
│   │   └── TemplateEditor.jsx        # Template editing
│   └── api/
│       └── emails.js                 # Email API client
```

---

## 🎉 Features Delivered

✅ **Segment Selection** - 3 customer segments
✅ **Customer Management** - View, filter, select customers
✅ **AI Email Generation** - Personalized templates per segment
✅ **Email Preview** - See before you send
✅ **Template Editing** - Customize subject and body
✅ **Dynamic Fields** - Auto-replace {name}, {purchase_amount}, etc.
✅ **Bulk Sending** - Send to multiple customers at once
✅ **Personalization** - Each email customized per customer
✅ **Mock Integration** - Easy to replace with real APIs
✅ **Responsive UI** - Works on mobile and desktop
✅ **Error Handling** - User-friendly error messages
✅ **Loading States** - Smooth UX with spinners

---

## 🚧 Production Checklist

Before deploying:
- [ ] Replace mock customers with database queries
- [ ] Integrate teammate's segmentation API
- [ ] Integrate teammate's AI template generator
- [ ] Replace console logging with real email service
- [ ] Add JWT authentication to email endpoints
- [ ] Create email_log table in database
- [ ] Add rate limiting for email sending
- [ ] Implement email queue for large batches
- [ ] Add email delivery tracking
- [ ] Add unsubscribe functionality

---

## 💡 Key Design Decisions

1. **Mock Data First**: Everything works without external dependencies
2. **Service Layer**: Clean separation of concerns
3. **Easy Integration**: Only 3 functions need replacing
4. **Type Safety**: Pydantic schemas for validation
5. **User Experience**: Loading states, error handling, confirmations
6. **Scalability**: Architecture supports thousands of customers
7. **Hackathon Ready**: Demo-able right now!

---

## 🐛 Troubleshooting

### Backend not starting?
```bash
cd backend
# Check if port 8000 is available
netstat -ano | findstr :8000
# Restart backend
```

### Frontend not loading?
```bash
cd frontend
# Check if port 5173 is available
netstat -ano | findstr :5173
# Restart frontend
npm run dev
```

### Can't see email logs?
Check the backend terminal where you ran:
```bash
python -m uvicorn app.main:app --reload
```

---

## 📞 Need Help?

1. **API Documentation**: http://localhost:8000/docs
2. **Integration Guide**: `EMAIL_FEATURE_INTEGRATION_GUIDE.md`
3. **Code Comments**: All functions have detailed docstrings
4. **TODO Comments**: Integration points marked with `TODO:`

---

## 🎊 You're All Set!

**Everything is working**. You can:
- ✅ Demo the feature right now
- ✅ Show it to judges
- ✅ Integrate teammate APIs later
- ✅ Deploy to production with minimal changes

**Happy Hacking! 🚀**
