import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { paymentAPI } from '../api/payment'
import Layout from '../components/Layout'
import ThemeToggle from '../components/ThemeToggle'
import { 
  HiMail, 
  HiDocumentText, 
  HiChartBar, 
  HiCurrencyDollar,
  HiCheckCircle,
  HiXCircle,
  HiUser,
  HiMail as HiEmailIcon,
  HiSparkles,
  HiClipboardList,
  HiCreditCard
} from 'react-icons/hi'
import { 
  FiTarget,
  FiTrendingUp,
  FiFileText
} from 'react-icons/fi'

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
      id: 'churn',
      title: 'Churn Prediction',
      description: 'Predict customer churn',
      icon: FiTarget,
      path: '/churn-prediction',
      color: 'from-red-500 to-red-600',
    },
    {
      id: 'predictions',
      title: 'Predictions',
      description: 'View all predictions',
      icon: HiClipboardList,
      path: '/predictions',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      id: 'csv',
      title: 'CSV Normalization',
      description: 'Normalize CSV with LLM',
      icon: FiFileText,
      path: '/csv-normalization',
      color: 'from-teal-500 to-teal-600',
    },
    {
      id: 'email',
      title: 'Email Campaign',
      description: 'Send targeted emails',
      icon: HiMail,
      path: '/email-campaign',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'history',
      title: 'Email History',
      description: 'View email history',
      icon: HiDocumentText,
      path: '/email-history',
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View customer insights',
      icon: HiChartBar,
      path: '/analytics',
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'roi',
      title: 'ROI Dashboard',
      description: 'Track campaign ROI',
      icon: HiCurrencyDollar,
      path: '/roi-dashboard',
      color: 'from-amber-500 to-amber-600',
    },
    {
      id: 'pricing',
      title: 'Pricing & Billing',
      description: 'Manage subscription',
      icon: HiCreditCard,
      path: '/pricing-billing',
      color: 'from-pink-500 to-pink-600',
    }
  ]

  return (
    <Layout activePage="dashboard">
      {/* Theme Toggle */}
            <ThemeToggle />
      {/* Welcome Section */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md">
            <HiSparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.name || 'User'}!
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-base ml-14">
          Here's your account summary and quick actions
        </p>
      </div>

      {/* User Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Account Status Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                Account Status
              </div>
              {user?.is_active ? (
                <HiCheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <HiXCircle className="w-6 h-6 text-red-500" />
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {user?.is_active ? 'Active' : 'Inactive'}
            </div>
            <div className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
              user?.is_active 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {user?.is_active ? (
                <>
                  <HiCheckCircle className="w-4 h-4" />
                  <span>Account Active</span>
                </>
              ) : (
                <>
                  <HiXCircle className="w-4 h-4" />
                  <span>Account Inactive</span>
                </>
              )}
            </div>
          </div>

          {/* Current Plan Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                Current Plan
              </div>
              <HiCurrencyDollar className="w-6 h-6 text-purple-500" />
            </div>
            {loadingSubscription ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
            ) : subscription?.is_active ? (
              <>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3 capitalize">
                  {subscription.plan || 'No Plan'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 capitalize">
                  {subscription.billing_cycle || ''}
                </div>
                <div className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
                  subscription.is_active
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {subscription.is_active ? (
                    <>
                      <HiCheckCircle className="w-4 h-4" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <HiXCircle className="w-4 h-4" />
                      <span>Inactive</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  No Plan
                </div>
                <button
                  onClick={() => navigate('/pricing-billing')}
                  className="text-xs mt-2 text-purple-600 dark:text-purple-400 hover:underline font-medium"
                >
                  Choose a plan →
                </button>
              </>
            )}
          </div>

          {/* Role Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                Role
              </div>
              <HiUser className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3 capitalize">
              {user?.role || 'User'}
            </div>
            <div className="text-gray-400 dark:text-gray-500 text-xs font-medium">
              Administrator Access
            </div>
          </div>

          {/* Email Card */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">
                Contact Email
              </div>
              <HiEmailIcon className="w-6 h-6 text-amber-500" />
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white break-all mb-3">
              {user?.email}
            </div>
            <div className="text-gray-400 dark:text-gray-500 text-xs font-medium">
              Primary contact
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FiTarget className="w-6 h-6 text-indigo-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => {
              const IconComponent = action.icon
              return (
                <div
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600"
                >
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${action.color} mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {action.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FiTrendingUp className="w-5 h-5 text-indigo-500" />
            Quick Start Guide
          </h3>
          <div className="grid gap-4">
            <div className="p-5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10 rounded-lg border-l-4 border-indigo-500 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                  1
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white mb-1.5">
                    Set Up Your First Campaign
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Navigate to Email Campaign to create targeted customer engagement campaigns.
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 rounded-lg border-l-4 border-green-500 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                  2
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white mb-1.5">
                    Monitor Performance
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Check Analytics to see customer insights and churn predictions.
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-lg border-l-4 border-amber-500 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                  3
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white mb-1.5">
                    Track ROI
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Use ROI Dashboard to measure business impact and profitability.
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