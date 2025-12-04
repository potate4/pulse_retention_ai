# 🚀 Step-by-Step Guide: Running Dummy Website with Popup Widget

## Prerequisites Checklist ✅

Before starting, ensure you have:
- [ ] Python installed (for backend)
- [ ] Node.js installed (optional, for frontend dashboard)
- [ ] All dependencies installed in backend
- [ ] Widget files in the correct location

---

## STEP 1: Start the Backend Server 🖥️

**Purpose:** The backend provides data for the popup widget.

### Windows PowerShell:

```powershell
# Navigate to backend directory
cd backend

# Activate virtual environment
.\venv\Scripts\activate

# Start the backend server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Verification:
Open browser and go to: **http://localhost:8000/docs**
- ✅ You should see the API documentation page

**⚠️ Keep this terminal open! Do NOT close it.**

---

## STEP 2: Start the Dummy Website Server 🌐

**Purpose:** Serves your test website with the widget.

### Open a NEW terminal window and run:

```powershell
# Navigate to dummy website directory
cd dummy-client-website

# Start simple HTTP server
python -m http.server 8080
```

**Expected Output:**
```
Serving HTTP on :: port 8080 (http://[::]:8080/) ...
```

### Verification:
Open browser and go to: **http://localhost:8080**
- ✅ You should see a directory listing or the website

**⚠️ Keep this terminal open! Do NOT close it.**

---

## STEP 3: Open the Test Pages 🎯

You now have **2 options** to test the widget:

### Option A: Simple Test Page (RECOMMENDED) 🟢

**URL:** http://localhost:8080/test-simple.html

**What it does:**
- Loads widget directly
- Shows real-time status
- Displays debug logs
- Popup appears after 2.5 seconds

**Expected Result:**
- Page loads with a white card
- Status shows "⏳ Loading widget..."
- After 2.5 seconds, popup appears with offer
- Status changes to "✅ Success! Widget popup is visible!"

---

### Option B: Full Demo Website 🟡

**URL:** http://localhost:8080/login.html

**What it does:**
- Simulates real customer login flow
- Redirects to dashboard
- Widget loads on dashboard

**Steps:**
1. Go to: http://localhost:8080/login.html
2. Enter email: `test@example.com`
3. Click "Continue"
4. You'll be redirected to dashboard
5. After 2.5 seconds, popup appears

---

## STEP 4: Verify the Widget Works ✨

### What You Should See:

1. **Popup Appearance:**
   - A popup appears in the center of the screen
   - Has a colorful gradient background
   - Shows personalized offer/message
   - Has a "Close" button (X)

2. **Popup Content:**
   - Title (e.g., "Welcome Back!" or "Special Offer!")
   - Message with offer details
   - Call-to-action button
   - Professional styling

3. **Interaction:**
   - Click X button → Popup closes
   - Click outside popup → Popup closes
   - Click CTA button → Logs event

---

## STEP 5: Check Browser Console (F12) 🔍

### Press F12 to open Developer Tools

### Console Tab - Expected Logs:

```
[Pulse Retention Widget v1.0.0] Initializing...
[Pulse Retention Widget] Business ID: 586a35d8-eb2c-422c-8c7c-34c5f0d2a22a
[Pulse Retention Widget] Customer Email: test@example.com
[Pulse Retention Widget] API URL: http://127.0.0.1:8000
[Pulse Retention Widget] Styles injected
[Pulse Retention Widget] Fetched popup data: {...}
[Pulse Retention Widget] Popup will appear in 2500ms
[Pulse Retention Widget] Popup rendered
```

### Network Tab - Expected Request:

```
GET http://127.0.0.1:8000/api/v1/widget/offers?business_id=586a35d8-eb2c-422c-8c7c-34c5f0d2a22a&customer_email=test@example.com

Status: 200 OK
Response: {
  "show_popup": true,
  "title": "...",
  "message": "...",
  "cta_text": "...",
  "cta_link": "..."
}
```

---

## Troubleshooting 🔧

### Problem 1: Backend Not Running

**Symptom:** Console shows "Failed to fetch" or Network tab shows failed requests

**Solution:**
```powershell
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### Problem 2: Popup Not Showing

**Symptom:** No popup appears after 2.5 seconds

**Check:**
1. Open Console (F12) - Look for errors
2. Check Network tab - Is API call successful?
3. Verify backend response contains `"show_popup": true`

**Common Causes:**
- Customer doesn't exist in database
- Backend returned `"show_popup": false`
- JavaScript error (check console)

---

### Problem 3: Widget Script 404 Error

**Symptom:** Console shows "404 pulse-retention-widget.js"

**Solution:**
Ensure the widget file exists in `dummy-client-website/` directory:
```powershell
# From project root
Copy-Item "popup-widget\pulse-retention-widget.js" -Destination "dummy-client-website\pulse-retention-widget.js" -Force
```

---

### Problem 4: CORS Error

**Symptom:** Console shows "blocked by CORS policy"

**Solution:**
The backend is already configured to allow CORS from all origins during development. If you still see this, restart the backend server.

---

## Quick Commands Reference 📝

### Start Backend:
```powershell
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Start Dummy Website:
```powershell
cd dummy-client-website
python -m http.server 8080
```

### Test URLs:
- Backend API Docs: http://localhost:8000/docs
- Simple Test Page: http://localhost:8080/test-simple.html
- Full Demo: http://localhost:8080/login.html

---

## Widget Configuration 🔧

The widget is configured in `dummy-client-website/script.js` and test pages with these parameters:

```javascript
data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"  // Your organization UUID
data-email="test@example.com"                          // Customer email
data-api-url="http://127.0.0.1:8000"                   // Backend API URL
```

To test with different customers, change the `data-email` value.

---

## Success Criteria ✅

You'll know everything works when:

1. ✅ Backend runs without errors (http://localhost:8000/docs accessible)
2. ✅ Dummy website loads (http://localhost:8080 accessible)
3. ✅ Test page shows success message
4. ✅ Popup appears after 2.5 seconds
5. ✅ Popup shows personalized content
6. ✅ Console logs show widget initialization
7. ✅ Network tab shows successful API call
8. ✅ Popup closes when clicking X or outside

---

## Optional: Start Frontend Dashboard 🎨

If you also want to run the main Pulse dashboard:

```powershell
# In a NEW terminal
cd frontend
npm run dev
```

Access at: http://localhost:5173

---

## Summary 📊

**Servers Running:**
| Server | Port | URL | Purpose |
|--------|------|-----|---------|
| Backend API | 8000 | http://localhost:8000 | Provides widget data |
| Dummy Website | 8080 | http://localhost:8080 | Test website with widget |
| Frontend (Optional) | 5173 | http://localhost:5173 | Main dashboard |

**Test Pages:**
- Simple Test: http://localhost:8080/test-simple.html ⭐ **START HERE**
- Full Demo: http://localhost:8080/login.html

---

## Next Steps 🎯

After verifying the widget works:

1. **Customize Widget:**
   - Edit `popup-widget/popup.css` for styling
   - Modify `popup-widget/pulse-retention-widget.js` for behavior

2. **Test with Real Customers:**
   - Add customers to your database
   - Train churn prediction model
   - Run predictions
   - Test widget with different customer emails

3. **Deploy to Production:**
   - See `WIDGET_DEPLOYMENT_GUIDE.md` for deployment instructions

---

**Need Help?** 
- Check browser console (F12) for errors
- Verify all servers are running
- Check `README.md` for detailed documentation

**Good luck! 🚀**



