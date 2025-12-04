// Dummy Client Website JavaScript
// Handles login form submission and popup widget injection

(function() {
  'use strict';

  // Constants
  const BUSINESS_ID = '586a35d8-eb2c-422c-8c7c-34c5f0d2a22a'; // Valid UUID format
  const STORAGE_KEYS = {
    EMAIL: 'pulse_customer_email',
    BUSINESS_ID: 'pulse_business_id'
  };

  // Initialize based on current page
  function init() {
    const currentPage = window.location.pathname;

    if (currentPage.includes('login.html') || currentPage.endsWith('/')) {
      initLoginPage();
    } else if (currentPage.includes('dashboard.html')) {
      initDashboardPage();
    }
  }

  // Login Page Initialization
  function initLoginPage() {
    console.log('[Client Website] Initializing login page');

    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
      console.error('[Client Website] Login form not found');
      return;
    }

    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  // Handle login form submission
  function handleLoginSubmit(event) {
    event.preventDefault();

    const emailInput = document.getElementById('customer-email');
    const email = emailInput?.value.trim();

    if (!email) {
      alert('Please enter a valid email address');
      return;
    }

    console.log('[Client Website] Login submitted:', email);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.EMAIL, email);
    localStorage.setItem(STORAGE_KEYS.BUSINESS_ID, BUSINESS_ID);

    console.log('[Client Website] Credentials saved to localStorage');

    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  }

  // Dashboard Page Initialization
  function initDashboardPage() {
    console.log('[Client Website] Initializing dashboard page');

    // Check if user is logged in
    const email = localStorage.getItem(STORAGE_KEYS.EMAIL);
    const businessId = localStorage.getItem(STORAGE_KEYS.BUSINESS_ID);

    if (!email || !businessId) {
      console.warn('[Client Website] No credentials found, redirecting to login');
      window.location.href = 'login.html';
      return;
    }

    console.log('[Client Website] User logged in:', email);

    // Update dashboard UI
    updateDashboardUI(email, businessId);

    // Inject Pulse Retention Widget
    injectPulseWidget(businessId, email);

    // Setup logout button
    setupLogout();
  }

  // Update dashboard UI with user info
  function updateDashboardUI(email, businessId) {
    const userEmailDisplay = document.getElementById('user-email-display');
    const emailDisplay = document.getElementById('email-display');
    const businessIdDisplay = document.getElementById('business-id-display');

    if (userEmailDisplay) {
      userEmailDisplay.textContent = email;
    }

    if (emailDisplay) {
      emailDisplay.textContent = email;
    }

    if (businessIdDisplay) {
      businessIdDisplay.textContent = businessId;
    }
  }

  // Inject Pulse Retention Widget script dynamically
  function injectPulseWidget(businessId, email) {
    console.log('[Client Website] Injecting Pulse Retention Widget...');

    // Check if widget script already exists
    if (document.querySelector('script[src*="pulse-retention-widget.js"]')) {
      console.log('[Client Website] Widget script already loaded');
      return;
    }

    // Create script element
    const widgetScript = document.createElement('script');
    widgetScript.src = 'pulse-retention-widget.js';
    widgetScript.setAttribute('data-business-id', businessId);
    widgetScript.setAttribute('data-email', email);
    widgetScript.setAttribute('data-api-url', 'http://127.0.0.1:8000');

    // Add to document
    document.body.appendChild(widgetScript);

    console.log('[Client Website] Widget script injected successfully');
    console.log('[Client Website] Business ID:', businessId);
    console.log('[Client Website] Customer Email:', email);
  }

  // Setup logout button
  function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
      console.log('[Client Website] Logging out...');

      // Clear localStorage
      localStorage.removeItem(STORAGE_KEYS.EMAIL);
      localStorage.removeItem(STORAGE_KEYS.BUSINESS_ID);

      console.log('[Client Website] Credentials cleared');

      // Redirect to login
      window.location.href = 'login.html';
    });
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
