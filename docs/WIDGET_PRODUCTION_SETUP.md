# Widget Production Setup - Quick Start

## 🚀 Quick Deployment (5 Steps)

### Step 1: Create Supabase Bucket

**Via Dashboard:**
1. Go to Supabase Dashboard → Storage
2. Click **New bucket**
3. Name: `widgets`
4. **Public**: ✅ Yes
5. Click **Create**

### Step 2: Upload Widget

**Option A: Automated (Recommended)**
```bash
cd backend
venv\Scripts\activate
python ../scripts/upload_widget_to_supabase.py
```

**Option B: Manual**
1. Go to Storage → `widgets` bucket
2. Click **Upload file**
3. Select `popup-widget/pulse-retention-widget.js`
4. Upload to `v1/` folder

### Step 3: Get Public URL

After upload, you'll get a URL like:
```
https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js
```

### Step 4: Update Backend for Production

**Update CORS in `backend/app/main.py`:**
```python
origins = [
    "https://yourdomain.com",
    "https://*.supabase.co",  # Allow Supabase widget URLs
    "*",  # Remove in production, keep for development
]
```

**Deploy backend:**
- Railway, Render, Fly.io, or your hosting platform
- Set environment variables
- Get production API URL: `https://api.yourdomain.com`

### Step 5: Test Installation

Create test HTML:
```html
<!DOCTYPE html>
<html>
<body>
  <h1>Test Widget</h1>
  <script
    src="https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js"
    data-business-id="YOUR_BUSINESS_ID"
    data-email="test@example.com"
    data-api-url="https://api.yourdomain.com"
  ></script>
</body>
</html>
```

## 📋 Customer Installation Code

Provide this to customers:

```html
<!-- Pulse Retention Widget -->
<script
  src="https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-email="CUSTOMER_EMAIL"
  data-api-url="https://api.yourdomain.com"
></script>
```

**Replace:**
- `[project-id]` with your Supabase project ID
- `YOUR_BUSINESS_ID` with customer's organization UUID
- `CUSTOMER_EMAIL` with dynamic customer email
- `https://api.yourdomain.com` with your production API URL

## 🔄 Updating Widget

### For New Versions

1. **Upload new version:**
   ```bash
   python scripts/upload_widget_to_supabase.py
   ```
   (Update version in script: `version="v2"`)

2. **Or manually upload to `v2/` folder**

3. **Update customer code** (if needed):
   ```html
   src=".../widgets/v2/pulse-retention-widget.js"
   ```

### For Same Version (Hotfix)

Script uses `upsert: true`, so re-uploading overwrites:
```bash
python scripts/upload_widget_to_supabase.py
```

## ✅ Checklist

- [ ] Supabase bucket created and public
- [ ] Widget uploaded to Supabase
- [ ] Public URL tested and accessible
- [ ] Backend deployed to production
- [ ] Backend CORS configured
- [ ] API endpoint tested: `/api/v1/widget/offers`
- [ ] Widget tested on test website
- [ ] Customer installation code ready

## 🐛 Troubleshooting

### Widget 404 Error
- Check bucket is public
- Verify file path in URL
- Check file exists in Supabase dashboard

### CORS Error
- Verify backend CORS allows Supabase domain
- Check `data-api-url` matches backend URL
- Ensure backend is running

### API Error
- Test API endpoint directly
- Check backend logs
- Verify `business_id` and `customer_email` are valid

## 📚 Full Documentation

- **Deployment Guide**: `WIDGET_DEPLOYMENT_GUIDE.md`
- **Testing Guide**: `WIDGET_TESTING_GUIDE.md`
- **Installation Guide**: `WIDGET_INSTALLATION_GUIDE.md`

---

**Ready to deploy?** Follow the 5 steps above! 🚀

