import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsAPI } from '../api/analytics'
import Layout from '../components/Layout'

/**
 * Analytics Page
 * Displays customer insights, churn predictions, and business metrics
 * Connected to backend API for real-time data
 */
const Analytics = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [churnData, setChurnData] = useState(null)
  const [riskData, setRiskData] = useState(null)
  const [valueData, setValueData] = useState(null)

  // Fetch analytics data from backend
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all analytics data in parallel
        const [metricsData, churnTrendData, riskDistData, valueDistData] = await Promise.all([
          analyticsAPI.getMetrics(),
          analyticsAPI.getChurnTrend(),
          analyticsAPI.getRiskDistribution(),
          analyticsAPI.getValueDistribution()
        ])

        setMetrics(metricsData)

        // Transform churn trend data for display
        setChurnData(churnTrendData.map(item => ({
          month: item.month,
          churn: item.churnRate,
          retention: item.retentionRate
        })))

        // Transform risk data for display with colors
        setRiskData(riskDistData.map((item, idx) => ({
          name: item.name,
          count: item.value,
          color: ['#10b981', '#f59e0b', '#ef4444', '#991b1b'][idx % 4]
        })))

        setValueData(valueDistData)

        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
        setError('Failed to load analytics data. Please try again later.')
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const MetricCard = ({ title, value, subtitle, icon, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
      </div>
    </div>
  )

  const SimpleBarChart = ({ data, title, dataKey }) => {
    const maxValue = Math.max(...data.map(d => d[dataKey]))
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">{item.month || item.range || item.reason}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{item[dataKey]}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${(item[dataKey] / maxValue) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const SimpleLineChart = ({ data, title, lineKey1, lineKey2, color1, color2 }) => {
    const maxValue = Math.max(
      ...data.flatMap(d => [d[lineKey1], d[lineKey2]])
    )
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">{item.month}</span>
                <div className="space-x-4">
                  <span style={{ color: color1 }} className="font-semibold">{lineKey1}: {item[lineKey1]}%</span>
                  <span style={{ color: color2 }} className="font-semibold">{lineKey2}: {item[lineKey2]}%</span>
                </div>
              </div>
              <div className="flex gap-2 h-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(item[lineKey1] / maxValue) * 100}%`,
                      backgroundColor: color1
                    }}
                  ></div>
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(item[lineKey2] / maxValue) * 100}%`,
                      backgroundColor: color2
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const PieChart = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0)
    let currentAngle = 0

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-center gap-8">
          <svg width="150" height="150" viewBox="0 0 150 150" className="flex-shrink-0">
            {data.map((item, idx) => {
              const percentage = (item.count / total) * 100
              const sliceAngle = (percentage / 100) * 360
              
              const x1 = 75 + 60 * Math.cos((currentAngle * Math.PI) / 180)
              const y1 = 75 + 60 * Math.sin((currentAngle * Math.PI) / 180)
              
              const endAngle = currentAngle + sliceAngle
              const x2 = 75 + 60 * Math.cos((endAngle * Math.PI) / 180)
              const y2 = 75 + 60 * Math.sin((endAngle * Math.PI) / 180)
              
              const largeArc = sliceAngle > 180 ? 1 : 0
              
              const pathData = [
                `M 75 75`,
                `L ${x1} ${y1}`,
                `A 60 60 0 ${largeArc} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ')

              const result = (
                <path key={idx} d={pathData} fill={item.color} stroke="white" strokeWidth="2" />
              )
              
              currentAngle = endAngle
              return result
            })}
          </svg>
          <div className="space-y-2">
            {data.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Calculate Business Health Score
  const calculateBusinessHealthScore = (metrics) => {
    if (!metrics || metrics.totalCustomers === 0) return null

    // Calculate individual component scores (0-100)
    const retentionScore = metrics.retentionRate || 0
    const churnScore = Math.max(0, 100 - (metrics.churnRate || 0))
    const atRiskPercentage = metrics.totalCustomers > 0 
      ? (metrics.atRiskCount / metrics.totalCustomers) * 100 
      : 0
    const riskScore = Math.max(0, 100 - (atRiskPercentage * 2))
    const valueScore = Math.min(100, (metrics.avgLifetimeValue || 0) / 100)
    const dataQualityScore = metrics.total_batches > 0 ? 100 : 0

    const healthScore = (
      retentionScore * 0.30 +
      churnScore * 0.25 +
      riskScore * 0.25 +
      valueScore * 0.10 +
      dataQualityScore * 0.10
    )

    return {
      score: Math.round(healthScore),
      components: {
        retention: Math.round(retentionScore),
        churn: Math.round(churnScore),
        risk: Math.round(riskScore),
        value: Math.round(valueScore),
        dataQuality: Math.round(dataQualityScore)
      }
    }
  }

  // Generate recommendations based on metrics
  const generateRecommendations = (metrics, healthData) => {
    if (!metrics || !healthData) return []

    const recommendations = []

    // Churn rate recommendations
    if (metrics.churnRate > 30) {
      recommendations.push({
        priority: 'high',
        icon: '🚨',
        title: 'High Churn Rate Detected',
        description: `Your churn rate is ${metrics.churnRate.toFixed(1)}%. Focus on at-risk customer retention campaigns.`,
        action: 'Create targeted email campaigns for high-risk customers'
      })
    } else if (metrics.churnRate > 15) {
      recommendations.push({
        priority: 'medium',
        icon: '⚠️',
        title: 'Moderate Churn Risk',
        description: `Churn rate is ${metrics.churnRate.toFixed(1)}%. Monitor closely and engage at-risk customers.`,
        action: 'Review customer segments and implement retention strategies'
      })
    }

    // At-risk customers recommendations
    if (metrics.atRiskCount > 0) {
      const atRiskPercentage = (metrics.atRiskCount / metrics.totalCustomers) * 100
      if (atRiskPercentage > 20) {
        recommendations.push({
          priority: 'high',
          icon: '🎯',
          title: 'High Number of At-Risk Customers',
          description: `${metrics.atRiskCount} customers (${atRiskPercentage.toFixed(1)}%) need immediate attention.`,
          action: 'Launch urgent retention campaigns'
        })
      } else if (atRiskPercentage > 10) {
        recommendations.push({
          priority: 'medium',
          icon: '📊',
          title: 'At-Risk Customers Need Attention',
          description: `${metrics.atRiskCount} customers require proactive engagement.`,
          action: 'Send personalized offers to at-risk segment'
        })
      }
    }

    // Retention recommendations
    if (metrics.retentionRate < 70) {
      recommendations.push({
        priority: 'high',
        icon: '💚',
        title: 'Improve Retention Rate',
        description: `Current retention is ${metrics.retentionRate.toFixed(1)}%. Focus on customer engagement.`,
        action: 'Enhance customer experience and loyalty programs'
      })
    }

    // Customer value recommendations
    if (metrics.avgLifetimeValue < 5000) {
      recommendations.push({
        priority: 'medium',
        icon: '💰',
        title: 'Increase Customer Value',
        description: `Average customer value is ৳${metrics.avgLifetimeValue.toLocaleString()}. Consider upselling strategies.`,
        action: 'Implement cross-sell and upsell campaigns'
      })
    }

    // Data quality recommendations
    if (metrics.total_batches === 0) {
      recommendations.push({
        priority: 'high',
        icon: '📈',
        title: 'Upload Prediction Data',
        description: 'No prediction batches found. Upload customer data to get accurate insights.',
        action: 'Go to Predictions page and upload data'
      })
    } else if (metrics.total_batches < 3) {
      recommendations.push({
        priority: 'low',
        icon: '📊',
        title: 'More Data Needed',
        description: `Only ${metrics.total_batches} batch(es) analyzed. More data will improve accuracy.`,
        action: 'Upload additional prediction batches'
      })
    }

    // Health score specific recommendations
    if (healthData.score < 40) {
      recommendations.push({
        priority: 'high',
        icon: '🔴',
        title: 'Critical: Business Health Needs Improvement',
        description: 'Your business health score is low. Take immediate action on all recommendations.',
        action: 'Review all metrics and implement comprehensive retention strategy'
      })
    } else if (healthData.score < 60) {
      recommendations.push({
        priority: 'medium',
        icon: '🟡',
        title: 'Business Health Can Be Improved',
        description: 'Focus on key areas to boost your business health score.',
        action: 'Prioritize high-impact retention initiatives'
      })
    } else if (healthData.score >= 80) {
      recommendations.push({
        priority: 'low',
        icon: '✅',
        title: 'Excellent Business Health',
        description: 'Your business is performing well! Continue monitoring and optimizing.',
        action: 'Maintain current strategies and explore growth opportunities'
      })
    }

    return recommendations.slice(0, 5) // Limit to top 5 recommendations
  }

  const BusinessHealthScore = ({ metrics }) => {
    const healthData = calculateBusinessHealthScore(metrics)
    
    if (!healthData) {
      return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl p-8 border-4 border-gray-300 dark:border-gray-700 h-full">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Business Health Score</h2>
            <p className="text-gray-600 dark:text-gray-400">No data available. Upload prediction data to calculate your business health score.</p>
          </div>
        </div>
      )
    }

    const { score, components } = healthData
    
    let status, statusColor, bgGradient, borderColor, ringColor
    if (score >= 80) {
      status = "Excellent"
      statusColor = "text-green-600 dark:text-green-400"
      bgGradient = "from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30"
      borderColor = "border-green-500"
      ringColor = "ring-green-500"
    } else if (score >= 60) {
      status = "Good"
      statusColor = "text-blue-600 dark:text-blue-400"
      bgGradient = "from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30"
      borderColor = "border-blue-500"
      ringColor = "ring-blue-500"
    } else if (score >= 40) {
      status = "Fair"
      statusColor = "text-yellow-600 dark:text-yellow-400"
      bgGradient = "from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30"
      borderColor = "border-yellow-500"
      ringColor = "ring-yellow-500"
    } else {
      status = "Needs Attention"
      statusColor = "text-red-600 dark:text-red-400"
      bgGradient = "from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30"
      borderColor = "border-red-500"
      ringColor = "ring-red-500"
    }

    const circumference = 2 * Math.PI * 75
    const offset = circumference - (score / 100) * circumference

    return (
      <div className={`bg-gradient-to-br ${bgGradient} rounded-2xl shadow-2xl p-5 border-4 ${borderColor} ring-4 ${ringColor} ring-opacity-50 transform transition-all hover:scale-[1.01] relative overflow-hidden h-full`}>
        <div className={`absolute inset-0 bg-gradient-to-r ${bgGradient} opacity-50 animate-pulse`}></div>
        <div className="relative z-10">
          <div className="flex flex-col items-center text-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
              Business Health Score
            </h2>
            <p className={`text-sm font-semibold ${statusColor} mb-1.5`}>
              {status}
            </p>
          </div>

          {/* Circular Score Display */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-56 h-56">
              <svg className="transform -rotate-90 w-56 h-56">
                <circle
                  cx="112"
                  cy="112"
                  r="75"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="112"
                  cy="112"
                  r="75"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                  style={{
                    stroke: statusColor.includes('green') ? '#10b981' :
                            statusColor.includes('blue') ? '#3b82f6' :
                            statusColor.includes('yellow') ? '#eab308' : '#ef4444'
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-6xl font-bold ${statusColor}`}>{score}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const Recommendations = ({ metrics, healthData }) => {
    const [showModal, setShowModal] = useState(false)
    const recommendations = generateRecommendations(metrics, healthData)

    if (recommendations.length === 0) {
      return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl shadow-xl p-6 border-4 border-green-500 ring-4 ring-green-500 ring-opacity-50 h-full">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Recommendations</h2>
            <p className="text-gray-600 dark:text-gray-400">Your business is performing well! No urgent actions needed.</p>
          </div>
        </div>
      )
    }

    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'high':
          return 'border-red-500 bg-red-50 dark:bg-red-900/20'
        case 'medium':
          return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
        case 'low':
          return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        default:
          return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
      }
    }

    const displayedRecommendations = recommendations.slice(0, 2)

    return (
      <>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-2xl shadow-2xl p-5 border-4 border-purple-500 ring-4 ring-purple-500 ring-opacity-50 h-full flex flex-col">
          <div className="relative z-10 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Recommendations
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              Actionable insights to improve your business health
            </p>

            <div className="space-y-3 flex-1">
              {displayedRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`border-l-4 ${getPriorityColor(rec.priority)} rounded-lg p-3 bg-white dark:bg-gray-800 shadow-md`}
                >
                  <div className="flex items-start gap-2">
                    <div className="text-xl flex-shrink-0">{rec.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-xs">
                          {rec.title}
                        </h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-1.5">
                        {rec.description}
                      </p>
                      <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                        💡 {rec.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* See All Button */}
            {recommendations.length > 2 && (
              <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  See All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal for All Recommendations */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => setShowModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  All Recommendations
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Scrollable Recommendations List */}
              <div className="overflow-y-auto p-6 flex-1">
                <div className="space-y-4">
                  {recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 ${getPriorityColor(rec.priority)} rounded-lg p-4 bg-gray-50 dark:bg-gray-900 shadow-md`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">{rec.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                              {rec.title}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                              rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            }`}>
                              {rec.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {rec.description}
                          </p>
                          <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                            💡 {rec.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-md w-full">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    
    <Layout activePage="analytics">
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics & Insights</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Customer metrics, churn analysis, and retention insights</p>
        </div>

        {/* Business Health Score & Recommendations - Side by Side */}
        {metrics && (
          <div className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Business Health Score */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 opacity-10 blur-2xl rounded-3xl -z-10"></div>
              <BusinessHealthScore metrics={metrics} />
            </div>

            {/* Right: Recommendations */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-10 blur-2xl rounded-3xl -z-10"></div>
              <Recommendations metrics={metrics} healthData={calculateBusinessHealthScore(metrics)} />
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <MetricCard
              title="Total Customers"
              value={metrics.totalCustomers.toLocaleString()}
              color="#4f46e5"
              icon={<span className="text-2xl">👥</span>}
            />
            <MetricCard
              title="Churn Rate"
              value={`${metrics.churnRate}%`}
              subtitle="Current churn rate"
              color="#ef4444"
              icon={<span className="text-2xl">📉</span>}
            />
            <MetricCard
              title="At-Risk Customers"
              value={metrics.atRiskCount}
              subtitle="Need attention"
              color="#f59e0b"
              icon={<span className="text-2xl">⚠️</span>}
            />
            <MetricCard
              title="Retention Rate"
              value={`${metrics.retentionRate}%`}
              subtitle="Customers retained"
              color="#10b981"
              icon={<span className="text-2xl">✓</span>}
            />
            <MetricCard
              title="Avg Customer Value"
              value={`৳${metrics.avgLifetimeValue.toLocaleString()}`}
              color="#06b6d4"
              icon={<span className="text-2xl">💰</span>}
            />
            <MetricCard
              title="Total Batches"
              value={metrics.total_batches || 0}
              subtitle="Prediction batches analyzed"
              color="#8b5cf6"
              icon={<span className="text-2xl">📊</span>}
            />
          </div>
        )}

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {/* Churn & Retention Trend */}
          {churnData && (
            <SimpleLineChart
              data={churnData}
              title="Churn vs Retention Trend"
              lineKey1="churn"
              lineKey2="retention"
              color1="#ef4444"
              color2="#10b981"
            />
          )}

          {/* Risk Distribution */}
          {riskData && (
            <PieChart
              data={riskData}
              title="Customer Risk Distribution"
            />
          )}

          {/* Value Distribution */}
          {valueData && (
            <SimpleBarChart
              data={valueData}
              title="Customer Value Distribution"
              dataKey="count"
            />
          )}
        </div>

        {/* No Data Message */}
        {metrics && metrics.total_batches === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  No Prediction Data Available
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                  Upload prediction data to see analytics and customer insights.
                </p>
                <button
                  onClick={() => navigate('/predictions')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
                >
                  Go to Predictions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Source Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>ℹ️ Real Data:</strong> Analytics are calculated from real prediction batches.
            Churn rate is based on customers with &gt;50% churn probability, and values are from RFM monetary analysis.
          </p>
        </div>
      </div>
    </div>
    </Layout>
  )
}

export default Analytics
