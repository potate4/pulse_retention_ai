import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const Layout = ({ children, activePage }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [hoveredItem, setHoveredItem] = useState(null)

  // Determine active page from location if not provided
  const currentPage = activePage || (() => {
    const path = location.pathname
    if (path === '/dashboard' || path === '/') return 'dashboard'
    if (path === '/churn-prediction') return 'churn'
    if (path === '/predictions') return 'predictions'
    if (path === '/email-campaign') return 'email'
    if (path === '/email-history') return 'history'
    if (path === '/analytics') return 'analytics'
    if (path === '/roi-dashboard') return 'roi'
    if (path === '/pricing-billing') return 'pricing'
    return 'dashboard'
  })()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'churn', label: 'Churn Prediction', icon: '🎯', path: '/churn-prediction' },
    { id: 'predictions', label: 'Predictions', icon: '📋', path: '/predictions' },
    { id: 'email', label: 'Email Campaign', icon: '📧', path: '/email-campaign' },
    { id: 'history', label: 'Email History', icon: '📜', path: '/email-history' },
    { id: 'analytics', label: 'Analytics', icon: '📈', path: '/analytics' },
    { id: 'roi', label: 'ROI Dashboard', icon: '💰', path: '/roi-dashboard' },
    { id: 'pricing', label: 'Pricing & Billing', icon: '💳', path: '/pricing-billing' }
  ]

  const handleMenuClick = (item) => {
    if (item.path) {
      navigate(item.path)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div
        style={{
          backgroundColor: '#1e293b',
          color: 'white',
          padding: '20px 40px',
          borderBottom: '3px solid #667eea',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
          Pulse Retention AI
        </h1>
        <p style={{ margin: '5px 0 0 0', color: '#cbd5e1' }}>
          Customer Intelligence & Retention Platform
        </p>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 100px)' }}>
        {/* Sidebar */}
        <div
          style={{
            width: '250px',
            backgroundColor: '#334155',
            color: 'white',
            padding: '30px 20px',
            borderRight: '1px solid #cbd5e1',
          }}
        >
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#cbd5e1' }}>
              FEATURES
            </h3>
            {menuItems.map((item) => {
              const isActive = currentPage === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 12px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    backgroundColor: isActive ? '#475569' : (hoveredItem === item.id ? '#3f4a57' : 'transparent'),
                    color: isActive ? '#667eea' : 'white',
                    fontWeight: isActive ? '600' : '400',
                    transition: 'all 0.2s ease',
                    borderLeft: isActive ? '3px solid #667eea' : '3px solid transparent',
                    paddingLeft: isActive ? '9px' : '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              )
            })}
          </div>

          <div
            style={{
              marginTop: '40px',
              padding: '15px',
              backgroundColor: '#475569',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            <p style={{ margin: '0 0 8px 0', color: '#e2e8f0' }}>
              👤 <strong>{user?.name || 'User'}</strong>
            </p>
            <p style={{ margin: '0 0 8px 0', color: '#cbd5e1', fontSize: '12px' }}>
              {user?.email}
            </p>
            <p style={{ margin: '0 0 8px 0', color: '#cbd5e1', fontSize: '12px' }}>
              Role: <strong className="capitalize">{user?.role || 'user'}</strong>
            </p>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '8px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-10 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: '#1e293b',
          color: '#cbd5e1',
          padding: '20px 40px',
          textAlign: 'center',
          borderTop: '1px solid #334155',
        }}
      >
        <p style={{ margin: 0, fontSize: '13px' }}>
          © 2025 Pulse Retention AI. All rights reserved. | Customer Intelligence Platform
        </p>
      </div>
    </div>
  )
}

export default Layout

