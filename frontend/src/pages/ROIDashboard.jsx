import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { roiAPI } from '../api/roi'
import { useAuthStore } from '../stores/authStore'

/**
 * ROI Dashboard Page
 * Displays business ROI metrics based on real churn prediction data
 * Calculates potential savings from high-risk customers
 */
const ROIDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [batchSavings, setBatchSavings] = useState([])
  const [riskDistribution, setRiskDistribution] = useState([])

  // Fetch ROI data from backend
  useEffect(() => {
    const fetchROIData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch real data from new endpoints
        const [metricsData, batchData, riskData] = await Promise.all([
          roiAPI.getMetrics(),
          roiAPI.getBatchSavings(),
          roiAPI.getRiskValueDistribution()
        ])

        setMetrics(metricsData)
        setBatchSavings(batchData)
        setRiskDistribution(riskData)
        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch ROI data:', err)
        setError('Failed to load ROI data. Please try again later.')
        setLoading(false)
      }
    }

    fetchROIData()
  }, [])

  const MetricCard = ({ title, value, subtitle, icon, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">{value}</p>
          {subtitle && <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
      </div>
    </div>
  )

  const BarChart = ({ data, title, dataKey, color, isCurrency = false }) => {
    if (!data || data.length === 0) return null
    const maxValue = Math.max(...data.map(d => d[dataKey]))

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300 truncate mr-2">
                  {item.batch_name || item.name}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                  {isCurrency ? `৳${item[dataKey]?.toLocaleString()}` : item[dataKey]}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(item[dataKey] / maxValue) * 100}%`,
                    backgroundColor: color
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const PieChart = ({ data, title }) => {
    if (!data || data.length === 0) return null
    const total = data.reduce((sum, item) => sum + item.value, 0)

    if (total === 0) return null

    let currentAngle = 0

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-center gap-8">
          <svg width="150" height="150" viewBox="0 0 150 150" className="flex-shrink-0">
            {data.map((item, idx) => {
              const percentage = (item.value / total) * 100
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
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.name}: ৳{item.value?.toLocaleString()} ({item.count} customers)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Layout activePage="roi">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading ROI data...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout activePage="roi">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading ROI Data</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout activePage="roi">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ROI Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Potential savings from churn prevention</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Total Potential Savings"
            value={`৳${metrics.totalRevenue?.toLocaleString()}`}
            subtitle="From high-risk customers (>50% churn)"
            color="#10b981"
            icon={<span className="text-2xl">💰</span>}
          />
          <MetricCard
            title="High-Risk Customers"
            value={metrics.total_high_risk?.toLocaleString()}
            subtitle={`From ${metrics.total_customers_analyzed} analyzed`}
            color="#ef4444"
            icon={<span className="text-2xl">⚠️</span>}
          />
          <MetricCard
            title="Average Customer Value"
            value={`৳${metrics.avg_customer_value?.toLocaleString()}`}
            subtitle="Per high-risk customer"
            color="#3b82f6"
            icon={<span className="text-2xl">📊</span>}
          />
        </div>
      )}

      {/* No Data Message */}
      {metrics && metrics.total_batches === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                No Prediction Data Available
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                Upload prediction data to see ROI calculations and potential savings.
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

      {/* Charts Grid */}
      {batchSavings && batchSavings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Batch Savings */}
          <BarChart
            data={batchSavings.slice(0, 8)}
            title="Potential Savings by Batch"
            dataKey="potential_savings"
            color="#10b981"
            isCurrency={true}
          />

          {/* Risk Value Distribution */}
          {riskDistribution && riskDistribution.length > 0 && (
            <PieChart
              data={riskDistribution}
              title="Value at Risk by Segment"
            />
          )}
        </div>
      )}

      {/* Batch Details Table */}
      {batchSavings && batchSavings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Batch Savings Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Batch Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    High-Risk Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Potential Savings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {batchSavings.map((batch, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {batch.batch_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {batch.high_risk_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {batch.total_customers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                      ৳{batch.potential_savings?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(batch.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Source Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>ℹ️ Calculation Method:</strong> ROI is calculated by summing the monetary value (from RFM analysis)
          of all customers with churn probability greater than 50%. This represents the potential revenue at risk
          that can be saved through retention efforts.
        </p>
      </div>
    </Layout>
  )
}

export default ROIDashboard
