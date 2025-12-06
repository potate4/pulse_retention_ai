# Quick Test Steps - Pulse Widget

## 🚀 Fast Setup (5 minutes)

### 1. Start Backend (Terminal 1)
```bash
cd backend
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # Linux/Mac
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**✅ Check**: Open http://127.0.0.1:8000 - should see "Pulse - Customer Identity..."

### 2. Test API Endpoint
Open in browser:
```
http://127.0.0.1:8000/api/v1/widget/offers?business_id=586a35d8-eb2c-422c-8c7c-34c5f0d2a22a&customer_email=test@example.com
```

**✅ Check**: Should return JSON with `show_popup: true`

### 3. Start Local Web Server (Terminal 2)
```bash
cd C:\Users\sumai\DATA\PROJECTS\pulse_retention_ai
python -m http.server 8080
```

### 4. Open Test Page
Open browser: `http://localhost:8080/test-widget.html`

**✅ Check**: 
- Open Console (F12)
- Should see widget logs
- Popup appears after 2.5 seconds

## 🐛 Quick Fixes

**CORS Error?** → Use local web server (step 3), not `file://`

**404 on Widget?** → Check file path in HTML matches actual location

**No Popup?** → Check console for errors, verify API returns `show_popup: true`

**Backend Error?** → Check database has test organization and customer data

## 📋 Test Checklist

- [ ] Backend running on port 8000
- [ ] API endpoint returns JSON
- [ ] Widget loads (check console)
- [ ] Popup appears after 2.5s
- [ ] Close button works
- [ ] CTA button works

---

**Full Guide**: See `WIDGET_TESTING_GUIDE.md` for detailed instructions

