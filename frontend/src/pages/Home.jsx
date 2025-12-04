import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { paymentAPI } from '../api/payment'
import Layout from '../components/Layout'
import ThemeToggle from '../components/ThemeToggle'

const Home = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [subscription, setSubscription] = useState(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const sub = await paymentAPI.getCurrentSubscription()
        setSubscription(sub)
      } catch (error) {
        console.error('Failed to fetch subscription:', error)
      } finally {
        setLoadingSubscription(false)
      }
    }
    fetchSubscription()
  }, [])

  const quickActions = [
    {
      id: 'email',
      title: 'Email Campaign',
      description: 'Send targeted emails',
      icon: '📧',
      path: '/email-campaign',
    },
    {
      id: 'history',
      title: 'Email History',
      description: 'View email history',
      icon: '📜',
      path: '/email-history',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View customer insights',
      icon: '📈',
      path: '/analytics',
    },
    {
      id: 'roi',
      title: 'ROI Dashboard',
      description: 'Track campaign ROI',
      icon: '💰',
      path: '/roi-dashboard',
    }
  ]

  return (
    <Layout activePage="dashboard">
      {/* Theme Toggle */}
            <ThemeToggle />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Account Status Card */}
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

          {/* Current Plan Card */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border-l-4 border-purple-500">
            <div className="text-gray-600 dark:text-gray-400 text-xs mb-2">
              Current Plan
            </div>
            {loadingSubscription ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
            ) : subscription?.is_active ? (
              <>
                <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {subscription.plan || 'No Plan'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                  {subscription.billing_cycle || ''}
                </div>
                <div className={`inline-block text-xs mt-2 px-2 py-1 rounded ${
                  subscription.is_active
                    ? 'bg-green-100 dark:bg-green-900 text-gray-600 dark:text-gray-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {subscription.is_active ? '✓ Active' : '⚠ Inactive'}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  No Plan
                </div>
                <button
                  onClick={() => navigate('/pricing-billing')}
                  className="text-xs mt-2 text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Choose a plan →
                </button>
              </>
            )}
          </div>

          {/* Role Card */}
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

          {/* Email Card */}
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
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700"
              >
                <div className="text-4xl mb-4">{action.icon}</div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {action.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {action.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start Guide */}
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
    </Layout>
  )
}

export default Home