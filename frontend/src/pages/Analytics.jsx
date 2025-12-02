import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyticsAPI } from '../api/analytics'

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
  const [segments, setSegments] = useState(null)
  const [churnReasons, setChurnReasons] = useState(null)
  const [riskData, setRiskData] = useState(null)

  // Fetch analytics data from backend
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all analytics data in parallel
        const [metricsData, churnTrendData, segmentsData, reasonsData, riskDistData] = await Promise.all([
          analyticsAPI.getMetrics(),
          analyticsAPI.getChurnTrend(),
          analyticsAPI.getSegmentsDistribution(),
          analyticsAPI.getChurnReasons(),
          analyticsAPI.getRiskDistribution()
        ])

        setMetrics(metricsData)
        
        // Transform churn trend data for display
        setChurnData(churnTrendData.map(item => ({
          month: item.month,
          churn: item.churnRate,
          retention: item.retentionRate
        })))

        // Transform segments data with colors
        setSegments(segmentsData.map((seg, idx) => ({
          ...seg,
          name: seg.name,
          count: seg.value,
          color: ['#4f46e5', '#06b6d4', '#10b981', '#ef4444', '#f59e0b'][idx % 5]
        })))

        setChurnReasons(reasonsData)
        
        // Transform risk data for display
        setRiskData(riskDistData.map(item => ({
          range: item.name,
          count: item.value,
          percentage: Math.round((item.value / riskDistData.reduce((sum, r) => sum + r.value, 0)) * 100)
        })))

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
    <div className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-gray-600 text-xs mt-1">{subtitle}</p>}
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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{item.month || item.range || item.reason}</span>
                <span className="font-semibold text-gray-900">{item[dataKey]}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{item.month}</span>
                <div className="space-x-4">
                  <span style={{ color: color1 }} className="font-semibold">{lineKey1}: {item[lineKey1]}%</span>
                  <span style={{ color: color2 }} className="font-semibold">{lineKey2}: {item[lineKey2]}%</span>
                </div>
              </div>
              <div className="flex gap-2 h-2">
                <div className="flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(item[lineKey1] / maxValue) * 100}%`,
                      backgroundColor: color1
                    }}
                  ></div>
                </div>
                <div className="flex-1 bg-gray-200 rounded-full overflow-hidden">
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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
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
                <span className="text-sm text-gray-700">{item.name}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600 mb-4">{error}</p>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/home')}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-2">Customer metrics, churn analysis, and retention insights</p>
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
              title="Emails Sent"
              value={metrics.emailsSent.toLocaleString()}
              subtitle="Total campaigns"
              color="#8b5cf6"
              icon={<span className="text-2xl">📧</span>}
            />
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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

          {/* Segment Distribution */}
          {segments && (
            <PieChart
              data={segments}
              title="Customer Segment Distribution"
            />
          )}

          {/* Churn Reasons */}
          {churnReasons && (
            <SimpleBarChart
              data={churnReasons}
              title="Top Churn Reasons"
              dataKey="count"
            />
          )}

          {/* Risk Distribution */}
          {riskData && (
            <SimpleBarChart
              data={riskData}
              title="Customer Risk Distribution"
              dataKey="count"
            />
          )}
        </div>

        {/* Data Source Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Real Data:</strong> This page is displaying live data from the backend API. 
            All metrics, trends, and distributions are fetched from the analytics endpoints.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Analytics
