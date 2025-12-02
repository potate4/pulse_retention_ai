import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Landing from './pages/Landing'
import EmailCampaign from './pages/EmailCampaign'
import EditTemplate from './pages/EditTemplate'
import ProtectedRoute from './components/ProtectedRoute'
import ThemeToggle from './components/ThemeToggle'

function App() {
  const { isAuthenticated, initializeAuth } = useAuthStore()
  const { initializeTheme } = useThemeStore()

  // Initialize auth and theme on app load
  useEffect(() => {
    initializeAuth()
    initializeTheme()
  }, [initializeAuth, initializeTheme])

  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } />
        <Route path="/signup" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/email-campaign" element={
          <ProtectedRoute>
            <EmailCampaign />
          </ProtectedRoute>
        } />
        <Route path="/edit-template" element={
          <ProtectedRoute>
            <EditTemplate />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Landing />} />
      </Routes>
    </>
  )
}

export default App

