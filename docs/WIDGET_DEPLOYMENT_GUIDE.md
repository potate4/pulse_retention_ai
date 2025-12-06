# Widget Deployment Guide - Production Setup

This guide shows you how to deploy the Pulse Retention Widget so anyone can use it on their website.

## 🎯 Overview

The widget needs to be:
1. **Hosted publicly** - Accessible via CDN or public URL
2. **API configured** - Points to your production backend
3. **Versioned** - Easy to update without breaking existing installations

## 📦 Option 1: Supabase Storage (Recommended)

Supabase Storage is free, fast, and already integrated into your project.

### Step 1: Create Widget Bucket

**Via Supabase Dashboard:**
1. Go to your Supabase Dashboard → **Storage**
2. Click **New bucket**
3. Name: `widgets` (or `pulse-widget`)
4. **Public bucket**: ✅ Yes (required for public access)
5. Click **Create bucket**

**Via Supabase CLI:**
```bash
supabase storage create widgets --public
```

### Step 2: Upload Widget File

**Option A: Via Supabase Dashboard**
1. Go to Storage → `widgets` bucket
2. Click **Upload file**
3. Select `popup-widget/pulse-retention-widget.js`
4. Upload to root or `v1/` folder for versioning

**Option B: Via Python Script** (Automated)

Use the upload script provided below.

### Step 3: Get Public URL

After upload, Supabase provides a public URL like:
```
https://[your-project].supabase.co/storage/v1/object/public/widgets/pulse-retention-widget.js
```

### Step 4: Update Widget for Production

The widget needs to know your production API URL. You have two options:

**Option A: Hardcode in Widget** (Simple but less flexible)
- Edit `pulse-retention-widget.js` and set default API URL
- Upload new version

**Option B: Use data attribute** (Recommended - more flexible)
- Keep `data-api-url` attribute
- Customers set their own API URL

## 📦 Option 2: CDN (Cloudflare, AWS CloudFront, etc.)

For better performance and global distribution:

### Cloudflare Pages (Free)
1. Push widget to GitHub
2. Connect Cloudflare Pages to repo
3. Deploy automatically
4. Get CDN URL: `https://widget.yourdomain.com/pulse-retention-widget.js`

### AWS CloudFront + S3
1. Upload to S3 bucket
2. Create CloudFront distribution
3. Get CDN URL: `https://d1234.cloudfront.net/pulse-retention-widget.js`

## 📦 Option 3: GitHub Pages (Free)

1. Create `gh-pages` branch
2. Add widget file
3. Enable GitHub Pages
4. URL: `https://[username].github.io/[repo]/pulse-retention-widget.js`

## 🚀 Deployment Steps

### Step 1: Prepare Widget for Production

Update the widget to use production API by default:

```javascript
// In pulse-retention-widget.js, update line 13:
const apiUrl = currentScript?.getAttribute('data-api-url') || 'https://api.yourdomain.com';
```

### Step 2: Upload to Supabase

Use the provided Python script (see below) or manual upload.

### Step 3: Test Public URL

```bash
curl https://[your-project].supabase.co/storage/v1/object/public/widgets/pulse-retention-widget.js
```

Should return the JavaScript file.

### Step 4: Update Backend CORS

Ensure your production backend allows widget origins:

```python
# backend/app/main.py
origins = [
    "*",  # For development
    "https://yourdomain.com",
    "https://*.supabase.co",  # If using Supabase
]
```

### Step 5: Create Installation Code

Provide customers with this code snippet:

```html
<!-- Pulse Retention Widget -->
<script
  src="https://[your-project].supabase.co/storage/v1/object/public/widgets/pulse-retention-widget.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-email="customer@example.com"
  data-api-url="https://api.yourdomain.com"
></script>
```

## 🔧 Production Configuration

### Environment Variables

**Backend (.env):**
```env
# Production API URL
API_URL=https://api.yourdomain.com

# Supabase (for widget hosting)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Widget Versioning

For easy updates, use versioned paths:

```
widgets/
  ├── v1/
  │   └── pulse-retention-widget.js
  ├── v2/
  │   └── pulse-retention-widget.js
  └── latest/
      └── pulse-retention-widget.js (symlink to current version)
```

## 📝 Customer Installation Guide

Create a simple guide for customers:

```markdown
# Installing Pulse Retention Widget

1. Add this code before `</body>` tag:

```html
<script
  src="https://[your-project].supabase.co/storage/v1/object/public/widgets/pulse-retention-widget.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-email="CUSTOMER_EMAIL"
  data-api-url="https://api.yourdomain.com"
></script>
```

2. Replace:
   - `YOUR_BUSINESS_ID` with your organization UUID
   - `CUSTOMER_EMAIL` with dynamic customer email (from your system)
   - `data-api-url` is optional if you hardcoded it in widget

3. The popup will appear automatically after 2.5 seconds
```

## 🔄 Updating the Widget

### Versioned Updates

1. Upload new version to `widgets/v2/`
2. Update `latest/` symlink
3. Customers using `latest/` get updates automatically
4. Customers using `v1/` stay on old version

### Breaking Changes

If you make breaking changes:
1. Create new version folder
2. Keep old versions available
3. Notify customers to update

## 🧪 Testing Production Setup

### 1. Test Widget URL
```bash
curl https://[your-project].supabase.co/storage/v1/object/public/widgets/pulse-retention-widget.js
```

### 2. Test in Browser
```html
<!DOCTYPE html>
<html>
<body>
  <h1>Test Widget</h1>
  <script
    src="https://[your-project].supabase.co/storage/v1/object/public/widgets/pulse-retention-widget.js"
    data-business-id="YOUR_BUSINESS_ID"
    data-email="test@example.com"
    data-api-url="https://api.yourdomain.com"
  ></script>
</body>
</html>
```

### 3. Test API Endpoint
```bash
curl "https://api.yourdomain.com/api/v1/widget/offers?business_id=YOUR_BUSINESS_ID&customer_email=test@example.com"
```

## 🔒 Security Considerations

1. **CORS**: Configure backend to allow widget origins
2. **Rate Limiting**: Add rate limiting to widget API endpoint
3. **Validation**: Validate `business_id` and `customer_email` on backend
4. **HTTPS**: Always use HTTPS for widget and API
5. **Content Security Policy**: Customers may need to allow script source

## 📊 Monitoring

Track widget usage:
- API endpoint logs (popup shown, closed, CTA clicked)
- Supabase storage analytics (downloads)
- Error tracking (Sentry, LogRocket, etc.)

## 🎯 Next Steps

1. ✅ Upload widget to Supabase
2. ✅ Test public URL
3. ✅ Update backend CORS
4. ✅ Create customer installation guide
5. ✅ Test end-to-end
6. ✅ Deploy to production

---

**See `upload_widget_to_supabase.py` for automated upload script.**

