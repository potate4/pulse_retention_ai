# Widget Testing Guide

This guide walks you through all the steps needed to test the Pulse Retention Widget.

## 📋 Prerequisites

1. **Backend Server Running**: The FastAPI backend must be running on port 8000
2. **Database Setup**: PostgreSQL database with test data (organization and customer records)
3. **Web Browser**: Any modern browser (Chrome, Firefox, Edge, etc.)

## 🚀 Step-by-Step Testing Instructions

### Step 1: Start the Backend Server

Open a terminal and navigate to the backend directory:

```bash
cd backend
```

Activate your virtual environment (if using one):

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

Start the FastAPI server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**✅ Verify**: Open http://127.0.0.1:8000 in your browser. You should see:
```
Pulse - Customer Identity Intelligence and Retention Platform API
```

### Step 2: Verify API Endpoint

Test the widget API endpoint directly:

**Using Browser:**
```
http://127.0.0.1:8000/api/v1/widget/offers?business_id=586a35d8-eb2c-422c-8c7c-34c5f0d2a22a&customer_email=test@example.com
```

**Using curl:**
```bash
curl "http://127.0.0.1:8000/api/v1/widget/offers?business_id=586a35d8-eb2c-422c-8c7c-34c5f0d2a22a&customer_email=test@example.com"
```

**Expected Response:**
```json
{
  "show_popup": true,
  "title": "Hello Test!",
  "message": "<p><strong>Special offers just for you!</strong></p>...",
  "cta_text": "View Offers",
  "cta_link": "#offers"
}
```

**✅ Verify**: The API returns a valid JSON response with `show_popup: true`

### Step 3: Prepare Test HTML File

You have two options:

#### Option A: Use the workspace test file

Open `test-widget.html` in your browser:
- Double-click the file, or
- Right-click → Open with → Browser

#### Option B: Update Desktop test.html

If you want to use the file on your Desktop (`c:\Users\sumai\Desktop\test.html`), update it to use the local widget file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <h1>Welcome to My Store</h1>
  
  <!-- Pulse Widget - Add before closing body tag -->
  <script
    src="file:///C:/Users/sumai/DATA/PROJECTS/pulse_retention_ai/popup-widget/pulse-retention-widget.js"
    data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"
    data-email="test@example.com"
    data-api-url="http://127.0.0.1:8000"
  ></script>
</body>
</html>
```

**Note**: Using `file://` protocol may cause CORS issues. Better to use a local web server (see Step 4).

### Step 4: Serve HTML File with Local Web Server (Recommended)

To avoid CORS issues, serve the HTML file through a local web server:

**Using Python (if installed):**
```bash
# Navigate to project root
cd C:\Users\sumai\DATA\PROJECTS\pulse_retention_ai

# Python 3
python -m http.server 8080

# Or Python 2
python -m SimpleHTTPServer 8080
```

**Using Node.js (if installed):**
```bash
# Install http-server globally (one time)
npm install -g http-server

# Run server
cd C:\Users\sumai\DATA\PROJECTS\pulse_retention_ai
http-server -p 8080
```

Then open: `http://localhost:8080/test-widget.html`

### Step 5: Open Test Page in Browser

1. Open your web browser
2. Navigate to the test HTML file (see Step 3 or 4)
3. **Open Developer Console** (Press `F12` or Right-click → Inspect → Console tab)

### Step 6: Verify Widget Loading

In the browser console, you should see logs like:

```
[Pulse Retention Widget v1.0.0] Initializing...
[Pulse Retention Widget] Business ID: 586a35d8-eb2c-422c-8c7c-34c5f0d2a22a
[Pulse Retention Widget] Customer Email: test@example.com
[Pulse Retention Widget] API URL: http://127.0.0.1:8000
[Pulse Retention Widget] Styles injected
[Pulse Retention Widget] Fetched popup data: {show_popup: true, title: "...", ...}
[Pulse Retention Widget] Popup will appear in 2500ms
```

**✅ Verify**: No errors in console, widget initializes successfully

### Step 7: Test Popup Display

After 2.5 seconds, you should see:
- A popup appears in the bottom-right corner
- Popup has a header with title
- Popup has a message body with offers
- Popup has a CTA button at the bottom
- Close button (×) in the top-right corner

**✅ Verify**: Popup displays correctly with all elements

### Step 8: Test Popup Interactions

1. **Click Close Button (×)**: Popup should fade out and disappear
2. **Click CTA Button**: Should log event and navigate to link (check console)
3. **Click Outside Popup (on overlay)**: Popup should close

**Check Console for Events:**
```
[Pulse Retention Widget] Event: popup_shown {title: "..."}
[Pulse Retention Widget] Event logged: {success: true, ...}
[Pulse Retention Widget] Event: popup_closed {action: "close_button"}
```

### Step 9: Test API Error Handling

To test error handling, temporarily stop the backend server:

1. Stop the backend (Ctrl+C in terminal)
2. Refresh the test page
3. Check console for error messages:
   ```
   [Pulse Retention Widget] Error fetching popup data: ...
   [Pulse Retention Widget] No popup to show or offer not available
   ```

**✅ Verify**: Widget handles errors gracefully without breaking the page

### Step 10: Test with Different Customer Emails

Update the `data-email` attribute in the HTML to test different scenarios:

```html
<!-- Test with different email -->
<script
  src="./popup-widget/pulse-retention-widget.js"
  data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"
  data-email="another@example.com"
  data-api-url="http://127.0.0.1:8000"
></script>
```

Refresh the page and verify:
- Different customer segments show different offers
- Unknown customers get welcome offers
- All scenarios work correctly

## 🔍 Troubleshooting

### Issue: Widget not loading

**Symptoms**: No console logs, no popup appears

**Solutions**:
1. Check file path is correct in `<script src="...">`
2. Verify widget file exists at that path
3. Check browser console for 404 errors
4. Ensure you're using a local web server (not `file://`)

### Issue: CORS Error

**Symptoms**: Console shows "CORS policy" or "Access-Control-Allow-Origin" errors

**Solutions**:
1. Verify backend CORS is configured (should allow all origins in dev mode)
2. Check backend is running on correct port (8000)
3. Use a local web server instead of `file://` protocol
4. Verify `data-api-url` matches backend URL exactly

### Issue: API returns error

**Symptoms**: Console shows "HTTP error! status: 404" or "500"

**Solutions**:
1. Verify backend is running: `http://127.0.0.1:8000`
2. Test API endpoint directly in browser
3. Check business_id is valid UUID format
4. Verify organization exists in database
5. Check backend terminal for error logs

### Issue: Popup doesn't appear

**Symptoms**: Widget loads but no popup shows

**Solutions**:
1. Check console for `show_popup: false` in API response
2. Verify customer exists in database (or test with known customer email)
3. Check API response in Network tab (F12 → Network)
4. Verify `show_popup: true` in API response

### Issue: Styling looks broken

**Symptoms**: Popup appears but styles are missing

**Solutions**:
1. Check console for "Styles injected" message
2. Verify CSS is in the widget JS file (it's embedded)
3. Check for CSS conflicts with page styles
4. Try in incognito/private browsing mode

## 📊 Expected API Response Format

The widget expects this response structure:

```json
{
  "show_popup": true,
  "title": "Hello Customer!",
  "message": "<p>HTML content here</p>",
  "cta_text": "Claim Offer",
  "cta_link": "#offer-link"
}
```

## 🎯 Testing Checklist

- [ ] Backend server running on port 8000
- [ ] API endpoint returns valid JSON
- [ ] Widget script loads without errors
- [ ] Console shows initialization logs
- [ ] Popup appears after 2.5 seconds
- [ ] Popup displays correct title and message
- [ ] Close button works
- [ ] CTA button works and logs event
- [ ] Clicking outside closes popup
- [ ] Error handling works (when backend is down)
- [ ] Different customer emails show different offers

## 📝 Next Steps

Once testing is complete:

1. **Deploy Widget**: Host widget JS file on CDN
2. **Update API URL**: Change `data-api-url` to production URL
3. **Add Analytics**: Track widget performance
4. **A/B Testing**: Test different offer variations
5. **Mobile Testing**: Verify responsive design on mobile devices

## 🔗 Related Files

- Widget JavaScript: `popup-widget/pulse-retention-widget.js`
- Widget Styles: `popup-widget/popup.css` (embedded in JS)
- API Endpoint: `backend/app/api/v1/endpoints/widget.py`
- Test HTML: `test-widget.html`

## 💡 Tips

1. **Keep Console Open**: Always test with browser console open to catch errors
2. **Network Tab**: Use Network tab to inspect API calls
3. **Clear Cache**: Hard refresh (Ctrl+Shift+R) if changes don't appear
4. **Test Multiple Browsers**: Verify cross-browser compatibility
5. **Mobile View**: Test responsive design using browser dev tools

---

**Happy Testing! 🚀**

