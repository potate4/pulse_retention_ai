import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Get the request URL to check if it's an auth endpoint
      const requestUrl = error.config?.url || ''
      
      // Only auto-redirect if it's NOT a login/signup endpoint
      // This allows login/signup errors to be displayed in the UI
      if (!requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/signup')) {
        // Invalid token on protected route - clear token and redirect to login
        localStorage.removeItem('token')
        // Use navigate if available, otherwise use window.location
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient

