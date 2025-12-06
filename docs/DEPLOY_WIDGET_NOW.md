# 🚀 Deploy Widget to Production - Quick Steps

## ⚡ Fast Track (5 Minutes)

### 1. Create Supabase Bucket
```
Supabase Dashboard → Storage → New bucket
Name: widgets
Public: ✅ Yes
```

### 2. Upload Widget
```bash
cd backend
venv\Scripts\activate
python ../scripts/upload_widget_to_supabase.py
```

### 3. Copy Public URL
The script outputs:
```
🔗 Public URL: https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js
```

### 4. Deploy Backend
Deploy to Railway/Render/Fly.io and get production API URL:
```
https://api.yourdomain.com
```

### 5. Give Customers This Code
```html
<script
  src="https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js"
  data-business-id="THEIR_BUSINESS_ID"
  data-email="CUSTOMER_EMAIL"
  data-api-url="https://api.yourdomain.com"
></script>
```

## ✅ Done!

Widget is now live and accessible to anyone.

---

**Full guides:**
- `WIDGET_PRODUCTION_SETUP.md` - Detailed steps
- `WIDGET_DEPLOYMENT_GUIDE.md` - Complete guide
- `WIDGET_HOSTING_SUMMARY.md` - All options

