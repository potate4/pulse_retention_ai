import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Landing from './pages/Landing'
import EmailCampaign from './pages/EmailCampaign'
import WidgetCampaign from './pages/WidgetCampaign'
import EditTemplate from './pages/EditTemplate'
import EmailHistory from './pages/EmailHistory'
import Analytics from './pages/Analytics'
import ROIDashboard from './pages/ROIDashboard'
import ChurnPrediction from './pages/ChurnPrediction'
import Predictions from './pages/Predictions'
import PricingBilling from './pages/PricingBilling'
import SSLCommerzCallback from './pages/SSLCommerzCallback'
import CSVNormalization from './pages/CSVNormalization'
import ProtectedRoute from './components/ProtectedRoute'

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
        <Route path="/widget-campaign" element={
          <ProtectedRoute>
            <WidgetCampaign />
          </ProtectedRoute>
        } />
        <Route path="/edit-template" element={
          <ProtectedRoute>
            <EditTemplate />
          </ProtectedRoute>
        } />
        <Route path="/email-history" element={
          <ProtectedRoute>
            <EmailHistory />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/roi-dashboard" element={
          <ProtectedRoute>
            <ROIDashboard />
          </ProtectedRoute>
        } />
        <Route path="/churn-prediction" element={
          <ProtectedRoute>
            <ChurnPrediction />
          </ProtectedRoute>
        } />
        <Route path="/predictions" element={
          <ProtectedRoute>
            <Predictions />
          </ProtectedRoute>
        } />
        <Route path="/pricing-billing" element={
          <ProtectedRoute>
            <PricingBilling />
          </ProtectedRoute>
        } />
        <Route path="/csv-normalization" element={
          <ProtectedRoute>
            <CSVNormalization />
          </ProtectedRoute>
        } />
        {/* SSLCommerz handles all payment methods (bKash, Nagad, Card) */}
        <Route path="/payment/sslcommerz/success" element={
          <ProtectedRoute>
            <SSLCommerzCallback />
          </ProtectedRoute>
        } />
        <Route path="/payment/sslcommerz/fail" element={
          <ProtectedRoute>
            <SSLCommerzCallback />
          </ProtectedRoute>
        } />
        <Route path="/payment/sslcommerz/cancel" element={
          <ProtectedRoute>
            <SSLCommerzCallback />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Landing />} />
      </Routes>
    </>
  )
}

export default App

