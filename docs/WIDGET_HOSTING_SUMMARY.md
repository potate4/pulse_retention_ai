# Widget Hosting - Complete Summary

## 🎯 Goal

Host the Pulse Retention Widget publicly so customers can embed it on their websites.

## ✅ Solution: Supabase Storage (Recommended)

**Why Supabase?**
- ✅ Already integrated in your project
- ✅ Free tier available
- ✅ Fast CDN delivery
- ✅ Easy to update
- ✅ Public URLs for embedding

## 📋 Step-by-Step Deployment

### Step 1: Create Supabase Bucket

**Via Dashboard:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Storage** → **New bucket**
4. Name: `widgets`
5. **Public bucket**: ✅ Yes (IMPORTANT!)
6. Click **Create bucket**

**Via CLI:**
```bash
supabase storage create widgets --public
```

### Step 2: Upload Widget File

**Option A: Automated Script (Recommended)**

```bash
cd backend
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # Linux/Mac

python ../scripts/upload_widget_to_supabase.py
```

The script will:
- ✅ Check Supabase credentials
- ✅ Create bucket if needed
- ✅ Upload widget to `widgets/v1/pulse-retention-widget.js`
- ✅ Return public URL

**Option B: Manual Upload**

1. Go to Storage → `widgets` bucket
2. Click **Upload file**
3. Select `popup-widget/pulse-retention-widget.js`
4. Create folder `v1/` and upload there
5. Copy the public URL

### Step 3: Get Public URL

After upload, you'll get a URL like:
```
https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js
```

**Test it:**
```bash
curl https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js
```

Should return JavaScript code.

### Step 4: Configure Production API

**Update Backend CORS** (`backend/app/main.py`):
```python
origins = [
    "https://yourdomain.com",
    "https://*.supabase.co",  # Allow Supabase widget URLs
    # Remove "*" in production
]
```

**Deploy Backend:**
- Deploy to Railway, Render, Fly.io, etc.
- Get production API URL: `https://api.yourdomain.com`
- Test endpoint: `https://api.yourdomain.com/api/v1/widget/offers?business_id=...&customer_email=...`

### Step 5: Create Customer Installation Code

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
- `[project-id]` → Your Supabase project ID
- `YOUR_BUSINESS_ID` → Customer's organization UUID
- `CUSTOMER_EMAIL` → Dynamic customer email (from their system)
- `https://api.yourdomain.com` → Your production API URL

## 🔄 Updating the Widget

### For New Versions

1. **Update version in script:**
   ```python
   # In scripts/upload_widget_to_supabase.py
   version="v2"  # Change from v1 to v2
   ```

2. **Run upload:**
   ```bash
   python scripts/upload_widget_to_supabase.py
   ```

3. **Update customer code** (if needed):
   ```html
   src=".../widgets/v2/pulse-retention-widget.js"
   ```

### For Same Version (Hotfix)

The script uses `upsert: true`, so re-uploading automatically overwrites:
```bash
python scripts/upload_widget_to_supabase.py
```

## 🧪 Testing Production Setup

### 1. Test Widget URL
```bash
curl https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js
```

### 2. Test in Browser
```html
<!DOCTYPE html>
<html>
<body>
  <h1>Test Production Widget</h1>
  <script
    src="https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js"
    data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"
    data-email="test@example.com"
    data-api-url="https://api.yourdomain.com"
  ></script>
</body>
</html>
```

### 3. Test API Endpoint
```bash
curl "https://api.yourdomain.com/api/v1/widget/offers?business_id=586a35d8-eb2c-422c-8c7c-34c5f0d2a22a&customer_email=test@example.com"
```

## 📊 Alternative Hosting Options

### Option 2: GitHub Pages (Free)
1. Create `gh-pages` branch
2. Add widget file
3. Enable GitHub Pages
4. URL: `https://[username].github.io/[repo]/pulse-retention-widget.js`

### Option 3: CDN (Cloudflare, AWS)
- Better performance
- Global distribution
- More setup required
- See `WIDGET_DEPLOYMENT_GUIDE.md` for details

## 🔒 Security Checklist

- [ ] Backend CORS configured for widget domain
- [ ] API endpoint has rate limiting
- [ ] `business_id` and `customer_email` validated on backend
- [ ] HTTPS used for widget and API
- [ ] Error handling doesn't expose sensitive info

## ✅ Deployment Checklist

- [ ] Supabase bucket created (`widgets`)
- [ ] Bucket is public
- [ ] Widget uploaded to Supabase
- [ ] Public URL tested and accessible
- [ ] Backend deployed to production
- [ ] Backend CORS configured
- [ ] API endpoint tested
- [ ] Widget tested on test website
- [ ] Customer installation code ready
- [ ] Documentation updated

## 📚 Related Files

- **Quick Start**: `WIDGET_PRODUCTION_SETUP.md`
- **Full Guide**: `WIDGET_DEPLOYMENT_GUIDE.md`
- **Testing**: `WIDGET_TESTING_GUIDE.md`
- **Upload Script**: `scripts/upload_widget_to_supabase.py`

## 🚀 Quick Command Reference

```bash
# Upload widget to Supabase
cd backend
venv\Scripts\activate
python ../scripts/upload_widget_to_supabase.py

# Test widget URL
curl https://[project-id].supabase.co/storage/v1/object/public/widgets/v1/pulse-retention-widget.js

# Test API endpoint
curl "https://api.yourdomain.com/api/v1/widget/offers?business_id=...&customer_email=..."
```

## 💡 Tips

1. **Versioning**: Use folders (`v1/`, `v2/`) for easy updates
2. **Testing**: Always test widget URL before giving to customers
3. **Updates**: Re-upload same version to overwrite (hotfix)
4. **Monitoring**: Track widget downloads in Supabase analytics
5. **Backup**: Keep local copy of widget file

---

**Ready to deploy?** Follow the 5 steps above! 🎉

