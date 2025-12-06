# Pulse Retention Widget - Installation Guide

## Overview

The Pulse Retention Widget is an embeddable JavaScript widget that displays personalized offers to your customers based on their behavior, segment, and churn risk. Install it on your website with a simple code snippet.

## Quick Installation

Add this code snippet to your website, ideally just before the closing `</body>` tag:

```html
<script
  src="https://your-cdn.com/popup-widget/pulse-retention-widget.js"
  data-business-id="YOUR_BUSINESS_UUID"
  data-email="customer@example.com"
  data-api-url="http://127.0.0.1:5000"
></script>
```

## Configuration Parameters

### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `data-business-id` | Your organization UUID from Pulse platform | `586a35d8-eb2c-422c-8c7c-34c5f0d2a22a` |
| `data-email` | Customer's email address (must match your customer records) | `john.doe@example.com` |

### Optional Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `data-api-url` | Backend API URL | `http://127.0.0.1:5000` | `https://api.yourpulse.com` |

## Step-by-Step Setup

### 1. Get Your Business ID

1. Log in to your Pulse Retention AI dashboard
2. Navigate to **Settings** → **API Integration**
3. Copy your **Organization UUID** (Business ID)
4. This is a unique identifier like: `586a35d8-eb2c-422c-8c7c-34c5f0d2a22a`

### 2. Identify Your Customers

The widget requires the customer's email address to fetch personalized offers. You can:

- **Static Implementation**: For logged-in users, pass the email directly
- **Dynamic Implementation**: Use your templating engine to inject the email

### 3. Add the Widget Code

#### Static Example (Testing)

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your website content -->
  <h1>Welcome to My Store</h1>
  
  <!-- Pulse Widget - Add before closing body tag -->
  <script
    src="https://your-cdn.com/popup-widget/pulse-retention-widget.js"
    data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"
    data-email="test@example.com"
    data-api-url="http://127.0.0.1:5000"
  ></script>
</body>
</html>
```

#### Dynamic Example (PHP)

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your website content -->
  
  <?php if (isset($_SESSION['user_email'])): ?>
    <!-- Pulse Widget - Only for logged-in users -->
    <script
      src="https://your-cdn.com/popup-widget/pulse-retention-widget.js"
      data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"
      data-email="<?php echo htmlspecialchars($_SESSION['user_email']); ?>"
      data-api-url="https://api.yourpulse.com"
    ></script>
  <?php endif; ?>
</body>
</html>
```

#### Dynamic Example (JavaScript/React)

```jsx
import { useEffect } from 'react';

function App() {
  const userEmail = 'customer@example.com'; // Get from your auth system
  const businessId = '586a35d8-eb2c-422c-8c7c-34c5f0d2a22a';
  const apiUrl = 'https://api.yourpulse.com';

  useEffect(() => {
    // Create and inject the widget script
    const script = document.createElement('script');
    script.src = 'https://your-cdn.com/popup-widget/pulse-retention-widget.js';
    script.setAttribute('data-business-id', businessId);
    script.setAttribute('data-email', userEmail);
    script.setAttribute('data-api-url', apiUrl);
    
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      document.body.removeChild(script);
    };
  }, [userEmail]);

  return (
    <div>
      {/* Your app content */}
    </div>
  );
}
```

#### Dynamic Example (Django Template)

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your website content -->
  
  {% if user.is_authenticated %}
    <!-- Pulse Widget - Only for logged-in users -->
    <script
      src="https://your-cdn.com/popup-widget/pulse-retention-widget.js"
      data-business-id="586a35d8-eb2c-422c-8c7c-34c5f0d2a22a"
      data-email="{{ user.email }}"
      data-api-url="https://api.yourpulse.com"
    ></script>
  {% endif %}
</body>
</html>
```

## Widget Behavior

### Display Logic

- The widget fetches personalized offers from the Pulse API based on:
  - Customer's segment (Champions, At Risk, etc.)
  - Churn risk level (Low, Medium, High, Critical)
  - Purchase history and behavior patterns

- The popup appears **2.5 seconds** after page load
- If no personalized offer is available, no popup is shown
- The popup can be closed by:
  - Clicking the X button
  - Clicking outside the popup
  - User interaction

### Customer Matching

The widget matches customers using:
1. **Business ID**: Your organization UUID
2. **Customer Email**: Must match the `external_customer_id` in your Pulse customer records

If the customer is not found:
- A generic welcome offer is shown for new/unknown visitors
- No error is displayed to the user

## Customization

### Popup Timing

To change the delay before the popup appears, modify the `delayMs` variable in the widget source code (default: 2500ms).

### Styling

The widget uses embedded CSS and cannot be customized without modifying the source. The color palette is:
- Primary: `#7AACB3` (header/accents)
- Border: `#4D6E81`
- Text: `#CFBDA8`
- CTA Button: `#AA5376`
- Background: `#3B3758`

## Testing Your Installation

### 1. Test with Console Logs

Open your browser's Developer Console (F12) and look for:

```
[Pulse Retention Widget v1.0.0] Initializing...
[Pulse Retention Widget] Business ID: 586a35d8-eb2c-422c-8c7c-34c5f0d2a22a
[Pulse Retention Widget] Customer Email: test@example.com
[Pulse Retention Widget] API URL: http://127.0.0.1:5000
[Pulse Retention Widget] Styles injected
[Pulse Retention Widget] Fetched popup data: {...}
[Pulse Retention Widget] Popup will appear in 2500ms
[Pulse Retention Widget] Popup rendered
```

### 2. Verify API Calls

In the Network tab of Developer Tools:
- Look for a request to `/api/v1/widget/offers`
- Verify the query parameters include your `business_id` and `customer_email`
- Check the response contains offer data

### 3. Test Different Customers

Try different customer emails to see personalized offers:
- **Champions**: Best customers see VIP rewards
- **At Risk**: Churning customers see win-back offers
- **New Customers**: First-time visitors see welcome offers

## Troubleshooting

### Popup Not Showing

**Check 1: Verify Script is Loaded**
```javascript
// In browser console
document.querySelectorAll('script[src*="pulse-retention-widget"]').length
// Should return 1
```

**Check 2: Check Console for Errors**
- Open Developer Console (F12)
- Look for red error messages
- Common issues:
  - Invalid Business ID format
  - Network/CORS errors
  - API endpoint not accessible

**Check 3: Verify Customer Exists**
- The customer email must exist in your Pulse database
- Check customer records via the Pulse dashboard

### CORS Errors

If you see CORS errors in the console:
1. Verify your API URL is correct
2. Ensure your backend allows requests from your website's domain
3. Contact your Pulse administrator to whitelist your domain

### Widget Appears on Every Page Load

The widget shows on each page load by design. To show it only once per session:
- Use `sessionStorage` to track if the popup was shown
- Modify the widget code to check this flag before displaying

Example:
```javascript
if (!sessionStorage.getItem('pulse-popup-shown')) {
  // Show popup
  sessionStorage.setItem('pulse-popup-shown', 'true');
}
```

### API Returns No Offers

Possible reasons:
1. Customer not found in database (will show generic welcome)
2. No segment/churn data available for customer
3. API endpoint not configured correctly

## Analytics & Events

The widget automatically logs these events to the backend:

| Event | Trigger | Data Logged |
|-------|---------|-------------|
| `popup_shown` | Popup is displayed | Title, timestamp |
| `popup_closed` | User closes popup | Close action (button/overlay) |
| `popup_cta_clicked` | User clicks CTA button | CTA text, link |

These events are sent to `/api/v1/widget/events` and can be used for:
- Measuring widget engagement
- A/B testing offers
- Understanding customer behavior

## Security Best Practices

1. **Never expose sensitive data** in data attributes
2. **Use HTTPS** in production for API calls
3. **Validate customer email** server-side before passing to widget
4. **Rate limit** the widget API to prevent abuse
5. **Monitor API usage** to detect suspicious activity

## Production Deployment

### 1. Host the Widget File

Upload `pulse-retention-widget.js` to your CDN or static hosting:
- AWS S3 + CloudFront
- Cloudflare
- Netlify
- Your own server

### 2. Update API URL

Change `data-api-url` to your production API:
```html
data-api-url="https://api.yourpulse.com"
```

### 3. Configure CORS

Ensure your backend allows requests from customer domains:
```python
# In backend/app/main.py
origins = [
    "https://customer1.com",
    "https://customer2.com",
    # Add customer domains
]
```

### 4. Enable Analytics

Monitor widget performance:
- Popup view rate
- CTA click-through rate
- Conversion rate from widget offers

## Support

For issues or questions:
- **Documentation**: Check this guide and API docs
- **Support Email**: support@yourpulse.com
- **Status Page**: status.yourpulse.com

## Version History

- **v1.0.0** (Current)
  - Initial release
  - Auto-inject CSS
  - Dynamic offer fetching
  - Event logging
  - Responsive design

---

**Need Help?** Contact our support team or check the [API Documentation](./API_INTEGRATION_GUIDE.md) for more details.

