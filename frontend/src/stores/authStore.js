import { create } from 'zustand'
import { signup as signupAPI, login as loginAPI, getCurrentUser as getCurrentUserAPI, logout as logoutAPI } from '../api/auth'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // Set token helper
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token)
      set({ token, isAuthenticated: true })
    } else {
      localStorage.removeItem('token')
      set({ token: null, isAuthenticated: false })
    }
  },

  // Set user
  setUser: (user) => {
    set({ user })
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },

  // Signup
  signup: async (data) => {
    set({ loading: true, error: null })
    try {
      const user = await signupAPI(data)
      set({ loading: false, user })
      return { success: true, user }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Signup failed'
      set({ loading: false, error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Login
  login: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await loginAPI(data)
      const { access_token } = response
      
      // Store token
      get().setToken(access_token)
      
      // Fetch user data
      const user = await getCurrentUserAPI()
      set({ user, loading: false })
      return { success: true, user }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Login failed'
      set({ loading: false, error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Logout
  logout: () => {
    logoutAPI()
    set({ user: null, token: null, isAuthenticated: false })
  },

  // Get current user
  getCurrentUser: async () => {
    const token = get().token
    if (!token) {
      return
    }

    set({ loading: true })
    try {
      const user = await getCurrentUserAPI()
      set({ user, isAuthenticated: true, loading: false })
      return user
    } catch (error) {
      // Token is invalid, clear it
      get().logout()
      set({ loading: false })
      return null
    }
  },

  // Initialize auth (check for existing token on app load)
  initializeAuth: async () => {
    const token = get().token
    if (token) {
      await get().getCurrentUser()
    }
  },
}))

