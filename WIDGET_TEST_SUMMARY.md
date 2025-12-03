# Widget Testing - Complete Walkthrough

## 📌 Overview

The Pulse Retention Widget is a JavaScript widget that:
1. Fetches personalized offers from your API using `business_id` and `customer_email`
2. Displays a popup with offers after 2.5 seconds
3. Logs user interactions (popup shown, closed, CTA clicked)

## 🔧 Current Setup

### Widget Files
- **JavaScript**: `popup-widget/pulse-retention-widget.js` (382 lines)
- **CSS**: Embedded in JavaScript (no separate file needed)
- **Test HTML**: `test-widget.html` (in workspace)

### API Endpoint
- **URL**: `GET /api/v1/widget/offers`
- **Parameters**: 
  - `business_id` (UUID): Organization ID
  - `customer_email` (string): Customer email address
- **Response Format**:
```json
{
  "show_popup": true,
  "title": "Hello Customer!",
  "message": "<p>HTML content with offers</p>",
  "cta_text": "Claim Offer",
  "cta_link": "#offer-link"
}
```

## ✅ Step-by-Step Testing

### Step 1: Verify Backend is Running

**Terminal 1:**
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Verify**: Open http://127.0.0.1:8000 - should see welcome message

### Step 2: Test API Endpoint Directly

Open in browser:
```
http://127.0.0.1:8000/api/v1/widget/offers?business_id=586a35d8-eb2c-422c-8c7c-34c5f0d2a22a&customer_email=test@example.com
```

**Expected Results:**

**If organization exists:**
- If customer exists → Personalized offer based on segment
- If customer doesn't exist → Welcome offer (still shows popup)

**If organization doesn't exist:**
```json
{
  "show_popup": false,
  "error": "Organization not found"
}
```

**✅ Action**: Note the response. If `show_popup: false`, the widget won't show a popup.

### Step 3: Start Local Web Server

**Terminal 2:**
```bash
cd C:\Users\sumai\DATA\PROJECTS\pulse_retention_ai
python -m http.server 8080
```

**Why?** Using `file://` protocol causes CORS issues. A local web server fixes this.

### Step 4: Open Test Page

Open browser: `http://localhost:8080/test-widget.html`

**Or update Desktop test.html:**

If you want to use `c:\Users\sumai\Desktop\test.html`, update it:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <h1>Welcome to My Store</h1>
  
  <!-- Update this path to match your setup -->
  <script
    src="http://localhost:8080/popup-widget/pulse-retention-widget.js"
    data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"
    data-email="test@example.com"
    data-api-url="http://127.0.0.1:8000"
  ></script>
</body>
</html>
```

Then serve it from the same web server.

### Step 5: Open Browser Console

Press `F12` or Right-click → Inspect → Console tab

**Expected Console Output:**
```
[Pulse Retention Widget v1.0.0] Initializing...
[Pulse Retention Widget] Business ID: 586a35d8-eb2c-422c-8c7c-34c5f0d2a22a
[Pulse Retention Widget] Customer Email: test@example.com
[Pulse Retention Widget] API URL: http://127.0.0.1:8000
[Pulse Retention Widget] Styles injected
[Pulse Retention Widget] Fetched popup data: {show_popup: true, title: "...", ...}
[Pulse Retention Widget] Popup will appear in 2500ms
```

### Step 6: Verify Popup Appears

After 2.5 seconds, you should see:
- ✅ Popup in bottom-right corner
- ✅ Header with title
- ✅ Message body with offers (HTML formatted)
- ✅ CTA button at bottom
- ✅ Close button (×) in top-right

### Step 7: Test Interactions

1. **Click Close (×)**: Popup fades out
2. **Click CTA Button**: Logs event, navigates to link
3. **Click Outside**: Closes popup

**Check Console for Events:**
```
[Pulse Retention Widget] Event: popup_shown {title: "..."}
[Pulse Retention Widget] Event logged: {success: true, ...}
[Pulse Retention Widget] Event: popup_closed {action: "close_button"}
```

## 🔍 Troubleshooting

### Problem: Widget Not Loading

**Check:**
1. File path in `<script src="...">` is correct
2. Widget file exists at that path
3. Browser console shows 404 error? → Fix file path
4. Using local web server (not `file://`)

### Problem: CORS Error

**Symptoms**: Console shows "Access-Control-Allow-Origin" error

**Fix:**
1. Use local web server (step 3)
2. Verify backend CORS allows all origins (should be set in `main.py`)
3. Check `data-api-url` matches backend URL exactly

### Problem: API Returns Error

**Check:**
1. Backend is running: http://127.0.0.1:8000
2. Test API endpoint directly in browser
3. Verify `business_id` is valid UUID
4. Check backend terminal for error logs

### Problem: No Popup Appears

**Check:**
1. Console shows `show_popup: false`? → API returned no popup
2. Console shows errors? → Fix errors first
3. Network tab (F12 → Network) → Check API call status
4. Verify API response has `show_popup: true`

### Problem: Organization Not Found

**Solution**: Create test organization in database:

```python
# Run in Python console or script
from app.db.session import SessionLocal
from app.db.models.organization import Organization
import uuid

db = SessionLocal()

org = Organization(
    id=uuid.UUID("586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"),
    name="Test Organization",
    churn_threshold_days=30
)

db.add(org)
db.commit()
print(f"Organization created: {org.id}")
db.close()
```

## 📊 API Response Examples

### Success - Customer Exists
```json
{
  "show_popup": true,
  "title": "Hello Test!",
  "message": "<p><strong>Special offers just for you!</strong></p><ul>...</ul>",
  "cta_text": "View Offers",
  "cta_link": "#offers"
}
```

### Success - Customer Doesn't Exist (Welcome Offer)
```json
{
  "show_popup": true,
  "title": "Welcome to Test Organization!",
  "message": "<p><strong>Hello Test!</strong></p><p>We're excited to have you here...</p>",
  "cta_text": "Explore Offers",
  "cta_link": "#"
}
```

### Error - Organization Not Found
```json
{
  "show_popup": false,
  "error": "Organization not found"
}
```

### Error - Invalid Business ID
```json
{
  "show_popup": false,
  "error": "Invalid business_id format"
}
```

## 🎯 Testing Checklist

Use this checklist to verify everything works:

- [ ] **Backend Running**: http://127.0.0.1:8000 shows welcome message
- [ ] **API Works**: Direct API call returns valid JSON
- [ ] **Local Server**: Web server running on port 8080
- [ ] **Widget Loads**: Console shows initialization logs
- [ ] **No Errors**: Console has no red error messages
- [ ] **API Called**: Network tab shows successful API call
- [ ] **Popup Appears**: Popup shows after 2.5 seconds
- [ ] **Content Correct**: Title and message match API response
- [ ] **Close Works**: Clicking × closes popup
- [ ] **CTA Works**: Clicking button logs event
- [ ] **Events Logged**: Console shows event logs

## 📝 Widget Configuration

The widget reads these attributes from the `<script>` tag:

| Attribute | Required | Description | Example |
|-----------|----------|-------------|---------|
| `data-business-id` | Yes | Organization UUID | `586a35d8-eb2c-422c-8c7c-34c5f0d2a22a` |
| `data-email` | Yes | Customer email | `test@example.com` |
| `data-api-url` | Yes | Backend API URL | `http://127.0.0.1:8000` |

## 🚀 Next Steps After Testing

1. **Deploy Widget**: Host JS file on CDN
2. **Update API URL**: Change to production URL
3. **Add Analytics**: Track widget performance
4. **Test Multiple Customers**: Verify different segments show different offers
5. **Mobile Testing**: Test responsive design

## 📚 Related Files

- **Full Testing Guide**: `WIDGET_TESTING_GUIDE.md`
- **Quick Start**: `QUICK_TEST_STEPS.md`
- **Widget Code**: `popup-widget/pulse-retention-widget.js`
- **API Endpoint**: `backend/app/api/v1/endpoints/widget.py`

---

**Ready to test?** Follow the steps above and check off the checklist! 🎉

