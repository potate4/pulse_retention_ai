(function() {
  'use strict';

  const WIDGET_VERSION = '1.0.0';

  // Auto-run when script loads
  console.log(`[Pulse Retention Widget v${WIDGET_VERSION}] Initializing...`);

  // Read attributes from the script tag
  const currentScript = document.currentScript;
  const businessId = currentScript?.getAttribute('data-business-id') || 'UNKNOWN';
  const customerEmail = currentScript?.getAttribute('data-email') || 'UNKNOWN';
  const apiUrl = currentScript?.getAttribute('data-api-url') || 'http://127.0.0.1:5000';

  console.log('[Pulse Retention Widget] Business ID:', businessId);
  console.log('[Pulse Retention Widget] Customer Email:', customerEmail);
  console.log('[Pulse Retention Widget] API URL:', apiUrl);

  // Inject CSS styles dynamically
  function injectStyles() {
    if (document.getElementById('pulse-widget-styles')) {
      return; // Styles already injected
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'pulse-widget-styles';
    styleElement.textContent = `
/* Pulse Retention Widget Popup Styles */
/* Color Palette:
   #7AACB3 - header/accents
   #4D6E81 - borders/lines
   #CFBDA8 - hover or soft text
   #AA5376 - CTA button
   #3B3758 - popup background
*/

/* Overlay */
.pulse-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
  pointer-events: none;
  z-index: 999999;
  opacity: 1;
  transition: opacity 0.3s ease;
}

/* Popup Container */
.pulse-popup-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #3B3758;
  border: 2px solid #4D6E81;
  border-radius: 12px;
  width: 380px;
  max-width: calc(100vw - 40px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
  animation: pulse-popup-slide-in 0.4s ease-out;
}

@keyframes pulse-popup-slide-in {
  from {
    transform: translateX(420px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Close Button */
.pulse-popup-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: #CFBDA8;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s ease, transform 0.2s ease;
  z-index: 10;
}

.pulse-popup-close:hover {
  color: #7AACB3;
  transform: scale(1.1);
}

/* Header */
.pulse-popup-header {
  background-color: #7AACB3;
  padding: 24px 24px 20px 24px;
  border-radius: 10px 10px 0 0;
  border-bottom: 2px solid #4D6E81;
}

.pulse-popup-title {
  margin: 0;
  padding: 0;
  font-size: 24px;
  font-weight: 700;
  color: #3B3758;
  text-align: center;
  line-height: 1.3;
}

/* Body */
.pulse-popup-body {
  padding: 28px 24px;
}

.pulse-popup-message {
  margin: 0;
  padding: 0;
  font-size: 16px;
  line-height: 1.6;
  color: #CFBDA8;
  text-align: left;
}

.pulse-popup-message p {
  margin: 0 0 12px 0;
}

.pulse-popup-message p:last-child {
  margin-bottom: 0;
}

.pulse-popup-message strong {
  color: #ffffff;
  font-weight: 700;
}

.pulse-popup-message ul {
  margin: 12px 0;
  padding-left: 20px;
  list-style: none;
}

.pulse-popup-message li {
  margin: 8px 0;
  position: relative;
  padding-left: 8px;
}

/* Footer */
.pulse-popup-footer {
  padding: 0 24px 28px 24px;
  display: flex;
  justify-content: center;
}

/* CTA Button */
.pulse-popup-cta {
  display: inline-block;
  background-color: #AA5376;
  color: #ffffff;
  padding: 14px 36px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 8px;
  border: 2px solid #AA5376;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.pulse-popup-cta:hover {
  background-color: #c9678f;
  border-color: #c9678f;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(170, 83, 118, 0.4);
}

.pulse-popup-cta:active {
  transform: translateY(0);
}

/* Responsive Design */
@media (max-width: 600px) {
  .pulse-popup-container {
    width: calc(100vw - 20px);
    bottom: 10px;
    right: 10px;
  }

  .pulse-popup-header {
    padding: 20px 20px 16px 20px;
  }

  .pulse-popup-title {
    font-size: 20px;
  }

  .pulse-popup-body {
    padding: 24px 20px;
  }

  .pulse-popup-message {
    font-size: 15px;
  }

  .pulse-popup-footer {
    padding: 0 20px 24px 20px;
  }

  .pulse-popup-cta {
    padding: 12px 28px;
    font-size: 15px;
  }

  .pulse-popup-close {
    font-size: 28px;
    top: 10px;
    right: 10px;
  }
}
`;
    
    document.head.appendChild(styleElement);
    console.log('[Pulse Retention Widget] Styles injected');
  }

  // Fetch popup data from backend
  function fetchPopupData() {
    const url = `${apiUrl}/api/v1/widget/offers?business_id=${encodeURIComponent(businessId)}&customer_email=${encodeURIComponent(customerEmail)}`;
    
    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('[Pulse Retention Widget] Fetched popup data:', data);
        return data;
      })
      .catch(error => {
        console.error('[Pulse Retention Widget] Error fetching popup data:', error);
        return null;
      });
  }

  // Log popup event to backend
  function logPopupEvent(eventType, eventData = {}) {
    console.log('[Pulse Retention Widget] Event:', eventType, eventData);

    // Backend event logging
    const url = `${apiUrl}/api/v1/widget/events`;
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        business_id: businessId,
        customer_email: customerEmail,
        event_type: eventType,
        event_data: eventData,
        timestamp: new Date().toISOString()
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log('[Pulse Retention Widget] Event logged:', data);
    })
    .catch(error => {
      console.error('[Pulse Retention Widget] Error logging event:', error);
    });
  }

  // Render the popup
  function renderPopup(popupData) {
    // Check if popup already exists
    if (document.getElementById('pulse-retention-popup')) {
      console.log('[Pulse Retention Widget] Popup already exists, skipping render');
      return;
    }

    // Create popup HTML
    const popupHTML = `
      <div id="pulse-retention-popup" class="pulse-popup-overlay">
        <div class="pulse-popup-container">
          <button class="pulse-popup-close" id="pulse-popup-close-btn">&times;</button>
          <div class="pulse-popup-header">
            <h2 class="pulse-popup-title">${popupData.title}</h2>
          </div>
          <div class="pulse-popup-body">
            <div class="pulse-popup-message">${popupData.message}</div>
          </div>
          <div class="pulse-popup-footer">
            <a href="${popupData.cta_link}" class="pulse-popup-cta" id="pulse-popup-cta-btn">
              ${popupData.cta_text}
            </a>
          </div>
        </div>
      </div>
    `;

    // Inject popup into the page
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    console.log('[Pulse Retention Widget] Popup rendered');

    // Log popup shown event
    logPopupEvent('popup_shown', { title: popupData.title });

    // Add event listeners
    const closeBtn = document.getElementById('pulse-popup-close-btn');
    const ctaBtn = document.getElementById('pulse-popup-cta-btn');
    const overlay = document.getElementById('pulse-retention-popup');

    closeBtn.addEventListener('click', () => {
      closePopup();
      logPopupEvent('popup_closed', { action: 'close_button' });
    });

    ctaBtn.addEventListener('click', () => {
      logPopupEvent('popup_cta_clicked', { cta_text: popupData.cta_text, cta_link: popupData.cta_link });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closePopup();
        logPopupEvent('popup_closed', { action: 'overlay_click' });
      }
    });
  }

  // Close the popup
  function closePopup() {
    const popup = document.getElementById('pulse-retention-popup');
    if (popup) {
      popup.style.opacity = '0';
      setTimeout(() => {
        popup.remove();
        console.log('[Pulse Retention Widget] Popup closed and removed');
      }, 300);
    }
  }

  // Initialize the widget with delay
  function initWidget() {
    // Inject CSS first
    injectStyles();

    // Fetch popup data from backend
    fetchPopupData().then(data => {
      if (data && data.show_popup) {
        // Optional 2-3 second delay before showing
        const delayMs = 2500; // 2.5 seconds
        setTimeout(() => {
          renderPopup(data);
        }, delayMs);
        
        console.log(`[Pulse Retention Widget] Popup will appear in ${delayMs}ms`);
      } else {
        console.log('[Pulse Retention Widget] No popup to show or offer not available');
      }
    });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
