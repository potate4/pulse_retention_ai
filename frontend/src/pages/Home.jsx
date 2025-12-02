import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Layout from '../components/Layout'

const Home = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [activePage, setActivePage] = useState('dashboard')

  const handleMenuClick = (id) => {
    setActivePage(id)
    if (id === 'email') navigate('/email-campaign')
    if (id === 'history') navigate('/email-history')
    if (id === 'analytics') navigate('/analytics')
    if (id === 'roi') navigate('/roi-dashboard')
    if (id === 'churn') navigate('/churn-prediction')
  }

  return (
    <Layout activePage="dashboard">
      {/* Welcome Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#1e293b' }}>
          Welcome back, {user?.name || 'User'}! 👋
        </h2>
        <p style={{ margin: '0', color: '#64748b', fontSize: '16px' }}>
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
              <div
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #667eea',
                }}
              >
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
                  Account Status
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </div>
                <div style={{ 
                  color: '#94a3b8', 
                  fontSize: '12px', 
                  marginTop: '8px',
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: user?.is_active ? '#dcfce7' : '#fee2e2'
                }}>
                  {user?.is_active ? '✓ Account Active' : '⚠ Account Inactive'}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #10b981',
                }}
              >
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
                  Role
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' }}>
                  {user?.role || 'User'}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>
                  Administrator Access
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #f59e0b',
                }}
              >
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
                  Contact Email
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', wordBreak: 'break-all' }}>
                  {user?.email}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>
                  Primary contact
                </div>
              </div>
            </div>
          )}

          {/* Feature Cards */}
          {activePage === 'dashboard' && (
            <div
              style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '40px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 20px 0',
                  fontSize: '18px',
                  color: '#1e293b',
                  fontWeight: 'bold',
                }}
              >
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
                  style={{
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: '#f8f9fa',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f4ff'
                    e.currentTarget.style.borderColor = '#667eea'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>📧</div>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Email Campaign</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Send personalized emails to customer segments
                  </div>
                </div>

                <div
                  onClick={() => handleMenuClick('analytics')}
                  style={{
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: '#f8f9fa',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f4ff'
                    e.currentTarget.style.borderColor = '#667eea'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>📈</div>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Analytics</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    View customer insights and churn predictions
                  </div>
                </div>

                <div
                  onClick={() => handleMenuClick('roi')}
                  style={{
                    padding: '20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: '#f8f9fa',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f4ff'
                    e.currentTarget.style.borderColor = '#667eea'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>💰</div>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>ROI Dashboard</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Track business ROI and profit metrics
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {activePage === 'dashboard' && (
            <div
              style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 20px 0',
                  fontSize: '18px',
                  color: '#1e293b',
                  fontWeight: 'bold',
                }}
              >
                Quick Start Guide
              </h3>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div style={{ padding: '15px', backgroundColor: '#f0f4ff', borderRadius: '8px', borderLeft: '3px solid #667eea' }}>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '5px' }}>
                    1️⃣ Set Up Your First Campaign
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Navigate to Email Campaign to create targeted customer engagement campaigns.
                  </div>
                </div>
                <div style={{ padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '5px' }}>
                    2️⃣ Monitor Performance
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Check Analytics to see customer insights and churn predictions.
                  </div>
                </div>
                <div style={{ padding: '15px', backgroundColor: '#fffbf0', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '5px' }}>
                    3️⃣ Track ROI
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Use ROI Dashboard to measure business impact and profitability.
                  </div>
                </div>
              </div>
            </div>
          )}
    </Layout>
  )
}

export default Home

