import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Loading from './Loading'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore()

  if (loading) {
    return <Loading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute

