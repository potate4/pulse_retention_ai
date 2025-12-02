import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import ThemeToggle from '../components/ThemeToggle'

const Home = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [activePage, setActivePage] = useState('dashboard')
  const [hoveredItem, setHoveredItem] = useState(null)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'email', label: 'Email Campaign', icon: '📧' },
    { id: 'history', label: 'Email History', icon: '📜' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'roi', label: 'ROI Dashboard', icon: '💰' }
  ]

  const handleMenuClick = (id) => {
    setActivePage(id)
    if (id === 'email') navigate('/email-campaign')
    if (id === 'history') navigate('/email-history')
    if (id === 'analytics') navigate('/analytics')
    if (id === 'roi') navigate('/roi-dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Theme Toggle */}
      <ThemeToggle />
      
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
            {menuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  cursor: 'pointer',
                  padding: '12px 12px',
                  marginBottom: '8px',
                  borderRadius: '6px',
                  backgroundColor: activePage === item.id ? '#475569' : (hoveredItem === item.id ? '#3f4a57' : 'transparent'),
                  color: activePage === item.id ? '#667eea' : 'white',
                  fontWeight: activePage === item.id ? '600' : '400',
                  transition: 'all 0.2s ease',
                  borderLeft: activePage === item.id ? '3px solid #667eea' : '3px solid transparent',
                  paddingLeft: activePage === item.id ? '9px' : '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
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
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          {/* Welcome Section */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {user?.name || 'User'}! 👋
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-base">
              Here's your account summary and quick actions
            </p>
          </div>

          {/* User Status Cards */}
          {activePage === 'dashboard' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '40px',
              }}
            >
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border-l-4 border-indigo-500">
                <div className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                  Account Status
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.is_active ? 'Active' : 'Inactive'}
                </div>
                <div className={`inline-block text-xs mt-2 px-2 py-1 rounded ${
                  user?.is_active 
                    ? 'bg-green-100 dark:bg-green-900 text-gray-600 dark:text-gray-300' 
                    : 'bg-red-100 dark:bg-red-900 text-gray-600 dark:text-gray-300'
                }`}>
                  {user?.is_active ? '✓ Account Active' : '⚠ Account Inactive'}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border-l-4 border-green-500">
                <div className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                  Role
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {user?.role || 'User'}
                </div>
                <div className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                  Administrator Access
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border-l-4 border-yellow-500">
                <div className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                  Contact Email
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white break-all">
                  {user?.email}
                </div>
                <div className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                  Primary contact
                </div>
              </div>
            </div>
          )}

          {/* Feature Cards */}
          {activePage === 'dashboard' && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm mb-10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
                Available Features
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px',
                }}
              >
                <div
                  onClick={() => handleMenuClick('email')}
                  className="p-5 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400"
                >
                  <div className="text-3xl mb-2">📧</div>
                  <div className="font-bold text-gray-900 dark:text-white mb-2">Email Campaign</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Send personalized emails to customer segments
                  </div>
                </div>

                <div
                  onClick={() => handleMenuClick('analytics')}
                  className="p-5 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400"
                >
                  <div className="text-3xl mb-2">📈</div>
                  <div className="font-bold text-gray-900 dark:text-white mb-2">Analytics</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    View customer insights and churn predictions
                  </div>
                </div>

                <div
                  onClick={() => handleMenuClick('roi')}
                  className="p-5 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400"
                >
                  <div className="text-3xl mb-2">💰</div>
                  <div className="font-bold text-gray-900 dark:text-white mb-2">ROI Dashboard</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Track business ROI and profit metrics
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {activePage === 'dashboard' && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
                Quick Start Guide
              </h3>
              <div className="grid gap-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-l-4 border-indigo-500">
                  <div className="font-bold text-gray-900 dark:text-white mb-1">
                    1️⃣ Set Up Your First Campaign
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Navigate to Email Campaign to create targeted customer engagement campaigns.
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                  <div className="font-bold text-gray-900 dark:text-white mb-1">
                    2️⃣ Monitor Performance
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Check Analytics to see customer insights and churn predictions.
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                  <div className="font-bold text-gray-900 dark:text-white mb-1">
                    3️⃣ Track ROI
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Use ROI Dashboard to measure business impact and profitability.
                  </div>
                </div>
              </div>
            </div>
          )}
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

export default Home

