import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { roiAPI } from '../api/roi'

/**
 * ROI Dashboard Page
 * Displays business ROI metrics, profit analysis, and cost-benefit calculations
 * Connected to backend API for real-time data
 */
const ROIDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeframe, setTimeframe] = useState('monthly') // monthly, quarterly, yearly
  const [metrics, setMetrics] = useState(null)
  const [profitTrend, setProfitTrend] = useState(null)
  const [costBreakdown, setCostBreakdown] = useState(null)
  const [campaignROI, setCampaignROI] = useState(null)
  const [retentionSavings, setRetentionSavings] = useState(null)

  // Fetch ROI data from backend
  useEffect(() => {
    const fetchROIData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all ROI data in parallel
        const [metricsData, trendData, costData, campaignData, savingsData] = await Promise.all([
          roiAPI.getMetrics(timeframe),
          roiAPI.getProfitTrend(timeframe),
          roiAPI.getCostBreakdown(timeframe),
          roiAPI.getCampaignROI(timeframe),
          roiAPI.getRetentionSavings(timeframe)
        ])

        setMetrics(metricsData)
        setProfitTrend(trendData)
        setCostBreakdown(costData)
        setCampaignROI(campaignData)
        setRetentionSavings(savingsData)
        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch ROI data:', err)
        setError('Failed to load ROI data. Please try again later.')
        setLoading(false)
      }
    }

    fetchROIData()
  }, [timeframe])

  const MetricCard = ({ title, value, subtitle, icon, color, trend }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 break-words">{value}</p>
          {subtitle && <p className="text-gray-600 dark:text-gray-300 text-xs mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
      </div>
    </div>
  )

  const SimpleLineChart = ({ data, title, dataKey, color }) => {
    if (!data || data.length === 0) return null
    const maxValue = Math.max(...data.map(d => d[dataKey]))
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">{item.period}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{item[dataKey]}</span>
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

  const BarChart = ({ data, title, dataKey, color }) => {
    if (!data || data.length === 0) return null
    const maxValue = Math.max(...data.map(d => d[dataKey]))
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">{item.name || item.campaign || item.label}</span>
                <span className="font-semibold text-gray-900 dark:text-white">৳{item[dataKey]?.toLocaleString()}</span>
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
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}: ৳{item.value?.toLocaleString()}</span>
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
            <p className="text-gray-600 dark:text-gray-300 mt-2">Business profitability and return on investment analysis</p>
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeframe === 'monthly'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeframe('quarterly')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeframe === 'quarterly'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Quarterly
            </button>
            <button
              onClick={() => setTimeframe('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeframe === 'yearly'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Revenue"
              value={`৳${metrics.totalRevenue?.toLocaleString()}`}
              subtitle="From all campaigns"
              color="#10b981"
              icon={<span className="text-2xl">💰</span>}
              trend={metrics.revenueTrend}
            />
            <MetricCard
              title="Total Costs"
              value={`৳${metrics.totalCosts?.toLocaleString()}`}
              subtitle="Operating expenses"
              color="#ef4444"
              icon={<span className="text-2xl">📊</span>}
              trend={metrics.costTrend}
            />
            <MetricCard
              title="Net Profit"
              value={`৳${metrics.netProfit?.toLocaleString()}`}
              subtitle="Revenue - Costs"
              color="#3b82f6"
              icon={<span className="text-2xl">📈</span>}
              trend={metrics.profitTrend}
            />
            <MetricCard
              title="ROI %"
              value={`${metrics.roiPercentage?.toFixed(1)}%`}
              subtitle="Return on investment"
              color="#8b5cf6"
              icon={<span className="text-2xl">🎯</span>}
              trend={metrics.roiTrend}
            />
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Profit Trend */}
          {profitTrend && (
            <SimpleLineChart
              data={profitTrend}
              title="Profit Trend"
              dataKey="profit"
              color="#10b981"
            />
          )}

          {/* Cost Breakdown */}
          {costBreakdown && (
            <PieChart
              data={costBreakdown}
              title="Cost Breakdown"
            />
          )}

          {/* Campaign ROI */}
          {campaignROI && (
            <BarChart
              data={campaignROI}
              title="Campaign ROI Comparison"
              dataKey="roi"
              color="#3b82f6"
            />
          )}

          {/* Retention Savings */}
          {retentionSavings && (
            <BarChart
              data={retentionSavings}
              title="Retention Savings by Segment"
              dataKey="savings"
              color="#8b5cf6"
            />
          )}
        </div>

        {/* Additional Metrics Table */}
        {metrics && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  <tr className="border-b dark:border-gray-700">
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">Average Customer Lifetime Value</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">৳{metrics.avgCustomerLTV?.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">Cost per Acquisition</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">৳{metrics.costPerAcquisition?.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">Cost per Retention</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">৳{metrics.costPerRetention?.toLocaleString()}</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">Payback Period</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{metrics.paybackPeriod} months</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">Break Even Date</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{metrics.breakEvenDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Source Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>ℹ️ Real Data:</strong> This page displays live ROI and financial data from the backend API. 
            All metrics, trends, and cost analysis are fetched from the ROI calculation endpoints.
          </p>
        </div>
    </Layout>
  )
}

export default ROIDashboard
