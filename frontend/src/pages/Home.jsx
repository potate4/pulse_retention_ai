import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import ThemeToggle from '../components/ThemeToggle'

const Home = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const quickActions = [
    {
      id: 'churn',
      title: 'Churn Prediction',
      description: 'Analyze customer churn risk',
      icon: '🎯',
      path: '/churn-prediction',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'email',
      title: 'Email Campaign',
      description: 'Send targeted emails',
      icon: '📧',
      path: '/email-campaign',
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View customer insights',
      icon: '📈',
      path: '/analytics',
      color: 'from-green-500 to-teal-600'
    },
    {
      id: 'roi',
      title: 'ROI Dashboard',
      description: 'Track campaign ROI',
      icon: '💰',
      path: '/roi-dashboard',
      color: 'from-yellow-500 to-orange-600'
    }
  ]

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

      {/* User Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Account Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
            Account Status
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {user?.is_active ? 'Active' : 'Inactive'}
          </div>
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
            user?.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {user?.is_active ? '✓ Account Active' : '⚠ Account Inactive'}
          </div>
        </div>

        {/* Role Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
            Role
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3 capitalize">
            {user?.role || 'User'}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            Administrator Access
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
          <div className="text-xl font-bold text-gray-900 dark:text-white mb-3 truncate">
            {user?.email || 'Not Set'}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            Primary Contact
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="mb-10">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <div
              key={action.id}
              onClick={() => navigate(action.path)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
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
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {action.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {action.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
          </div>

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
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Home
