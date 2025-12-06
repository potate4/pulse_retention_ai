import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { churnAPI } from '../api/churn'
import { useAuthStore } from '../stores/authStore'

/**
 * WidgetCampaign Page
 * Send personalized widget popup messages to at-risk customers
 */
const WidgetCampaign = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // State
  const [customers, setCustomers] = useState([])
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [riskSegmentFilter, setRiskSegmentFilter] = useState('Critical') // Default to critical
  const [pagination, setPagination] = useState({ limit: 100, offset: 0, total: 0 })
  const [sendingToCustomer, setSendingToCustomer] = useState(null)
  const [generatingForCustomer, setGeneratingForCustomer] = useState(null)
  const [widgetPreviewModal, setWidgetPreviewModal] = useState({ open: false, customer: null, message: null })
  const [bulkSending, setBulkSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  // Load customers on mount and when filter changes
  useEffect(() => {
    if (user?.id) {
      loadPredictionCustomers()
    }
  }, [user?.id, riskSegmentFilter])

  const loadPredictionCustomers = async () => {
    if (!user?.id) return

    try {
      setCustomersLoading(true)
      const riskSegment = riskSegmentFilter === 'All' ? null : riskSegmentFilter
      const data = await churnAPI.getPredictionCustomers(
        user.id,
        riskSegment,
        pagination.limit,
        pagination.offset
      )

      // Transform prediction customers
      const transformedCustomers = data.customers.map(c => ({
        id: c.customer_id,
        name: `Customer ${c.customer_id}`,
        email: c.email || 'customer@example.com',
        churn_score: c.churn_probability,
        risk_segment: c.risk_segment,
        batch_name: c.batch_name,
        predicted_at: c.predicted_at,
        custom_fields: {
          churn_probability: c.churn_probability,
          batch_id: c.batch_id
        }
      }))

      setCustomers(transformedCustomers)
      setPagination(prev => ({ ...prev, total: data.total }))
      // Auto-select all customers
      setSelectedCustomers(transformedCustomers.map(c => c.id))
    } catch (error) {
      console.error('Failed to load prediction customers:', error)
      alert('Failed to load customers. Please try again.')
    } finally {
      setCustomersLoading(false)
    }
  }

  const handleGenerateWidgetMessage = async (customer) => {
    try {
      setGeneratingForCustomer(customer.id)

      // Generate personalized widget message via backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/widget/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: user.id,
          customer_id: customer.id,
          segment: customer.risk_segment,
          risk_level: customer.risk_segment,
          churn_probability: customer.churn_score
        })
      })

      if (!response.ok) throw new Error('Failed to generate message')

      const result = await response.json()

      if (result.success) {
        // Open preview modal
        setWidgetPreviewModal({
          open: true,
          customer: customer,
          message: {
            title: result.title,
            message: result.message,
            cta_text: result.cta_text,
            cta_link: result.cta_link
          }
        })
      } else {
        alert('Failed to generate widget message. Please ensure OPENAI_API_KEY is set.')
      }
    } catch (err) {
      console.error('Error generating widget message:', err)
      alert('Failed to generate widget message. Please try again.')
    } finally {
      setGeneratingForCustomer(null)
    }
  }

  const handleSendWidgetMessage = async (customer, message) => {
    try {
      setSendingToCustomer(customer.id)

      // Queue widget message for customer
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/widget/queue-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: user.id,
          customer_id: customer.id,
          customer_email: customer.email,
          title: message.title,
          message: message.message,
          cta_text: message.cta_text,
          cta_link: message.cta_link
        })
      })

      if (!response.ok) throw new Error('Failed to queue message')

      const result = await response.json()

      if (result.success) {
        alert(`Widget message queued for ${customer.id}! It will appear on their next visit.`)
        setWidgetPreviewModal({ open: false, customer: null, message: null })
      } else {
        alert(`Failed to queue message: ${result.message}`)
      }
    } catch (error) {
      console.error('Failed to send widget message:', error)
      alert('Failed to send widget message. Please try again.')
    } finally {
      setSendingToCustomer(null)
    }
  }

  const handleBulkSendWidgetMessages = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to queue personalized widget messages for ${selectedCustomers.length} customer(s)?\n\nThey will see the popup on their next website visit.`
    )

    if (!confirmed) return

    try {
      setBulkSending(true)

      // Send bulk request
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/widget/bulk-queue-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: user.id,
          customer_ids: selectedCustomers,
          customers: customers.filter(c => selectedCustomers.includes(c.id))
        })
      })

      if (!response.ok) throw new Error('Failed to queue messages')

      const result = await response.json()

      setSendResult(result)
      alert(`Successfully queued ${result.queued_count} widget messages!`)
    } catch (error) {
      console.error('Failed to bulk send widget messages:', error)
      alert('Failed to bulk send. Please try again.')
    } finally {
      setBulkSending(false)
    }
  }

  return (
    <Layout activePage="widget">
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Widget Campaign</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Send personalized popup messages to at-risk customers via website widget
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Critical Risk Alert */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  At-Risk Customer Intervention
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Send personalized retention offers directly to customers' browsers when they visit your website.
                  Messages are queued and will appear as popups during their next session.
                </p>
              </div>
            </div>
          </div>

          {/* Risk Segment Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-indigo-500">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filter by Risk Segment</h2>
            <select
              value={riskSegmentFilter}
              onChange={(e) => {
                setRiskSegmentFilter(e.target.value)
                setPagination(prev => ({ ...prev, offset: 0 }))
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Critical">Critical Risk (Recommended)</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
              <option value="All">All Segments</option>
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Focus on critical and high-risk customers for maximum retention impact
            </p>
          </div>

          {/* Customer Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-cyan-500">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                At-Risk Customers
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {pagination.total} customers found • {selectedCustomers.length} selected
              </p>
            </div>
            <WidgetCustomerTable
              customers={customers}
              selectedCustomers={selectedCustomers}
              onSelectionChange={setSelectedCustomers}
              onGenerateMessage={handleGenerateWidgetMessage}
              generatingForCustomer={generatingForCustomer}
              loading={customersLoading}
            />
          </div>

          {/* Campaign Actions */}
          {customers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-green-500">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Actions</h2>
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={handleBulkSendWidgetMessages}
                  disabled={bulkSending || selectedCustomers.length === 0}
                  className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-medium transition-all shadow-lg flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="text-lg">
                    {bulkSending ? 'Queuing Messages...' : `Queue ${selectedCustomers.length} Personalized Widget Popup${selectedCustomers.length > 1 ? 's' : ''}`}
                  </span>
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  💡 Messages will be shown as popups when customers visit your website
                </p>
              </div>
            </div>
          )}

          {/* Send Result */}
          {sendResult && (
            <div className={`rounded-lg shadow p-6 border-l-4 ${
              sendResult.success
                ? 'bg-green-50 border-green-500 dark:bg-green-900/20'
                : 'bg-red-50 border-red-500 dark:bg-red-900/20'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  sendResult.success ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'
                }`}>
                  <span className="text-xl">{sendResult.success ? '✓' : '✗'}</span>
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg ${
                    sendResult.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                  }`}>
                    {sendResult.message}
                  </h3>
                  <div className="flex items-center gap-6 mt-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        sendResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                      }`}>
                        Queued: {sendResult.queued_count}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        sendResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                      }`}>
                        Failed: {sendResult.failed_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Widget Preview Modal */}
        {widgetPreviewModal.open && (
          <WidgetPreviewModal
            customer={widgetPreviewModal.customer}
            message={widgetPreviewModal.message}
            onClose={() => setWidgetPreviewModal({ open: false, customer: null, message: null })}
            onSend={handleSendWidgetMessage}
            sending={sendingToCustomer === widgetPreviewModal.customer?.id}
          />
        )}
      </div>
    </Layout>
  )
}

/**
 * WidgetPreviewModal Component
 * Preview personalized widget message before queuing
 */
const WidgetPreviewModal = ({ customer, message, onClose, onSend, sending }) => {
  if (!customer || !message) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Widget Popup Preview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Customer: {customer.id} • Risk: <span className={`font-semibold ${
                customer.risk_segment === 'Critical' ? 'text-red-600' :
                customer.risk_segment === 'High' ? 'text-orange-600' :
                customer.risk_segment === 'Medium' ? 'text-yellow-600' :
                'text-green-600'
              }`}>{customer.risk_segment}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Widget Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md mx-auto">
            {/* Simulated Widget Popup */}
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl shadow-2xl overflow-hidden border-2 border-indigo-500">
              {/* Widget Header */}
              <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-4">
                <h3 className="text-white font-bold text-lg">{message.title}</h3>
              </div>

              {/* Widget Body */}
              <div className="px-6 py-6">
                <div
                  className="text-white text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: message.message }}
                />

                {/* CTA Button */}
                <div className="mt-6">
                  <button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105">
                    {message.cta_text}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              👆 This is how the popup will appear on the customer's website
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Destination: {message.cta_link}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onSend(customer, message)}
              disabled={sending}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {sending ? 'Queuing...' : 'Queue Widget Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * WidgetCustomerTable Component
 */
const WidgetCustomerTable = ({
  customers,
  selectedCustomers,
  onSelectionChange,
  onGenerateMessage,
  generatingForCustomer,
  loading
}) => {
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(customers.map(c => c.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (customerId) => {
    if (selectedCustomers.includes(customerId)) {
      onSelectionChange(selectedCustomers.filter(id => id !== customerId))
    } else {
      onSelectionChange([...selectedCustomers, customerId])
    }
  }

  const getRiskSegmentColor = (riskSegment) => {
    switch (riskSegment) {
      case 'Low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'High':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'Critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal"></div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-light-text-secondary dark:text-dark-text-secondary">
        <p>No customers found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-light-border dark:divide-dark-border">
        <thead className="bg-light-bg dark:bg-dark-bg">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedCustomers.length === customers.length && customers.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-primary-teal rounded border-light-border dark:border-dark-border focus:ring-primary-teal"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Customer ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Churn Probability
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Risk Segment
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Batch Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-light-surface dark:bg-dark-surface divide-y divide-light-border dark:divide-dark-border">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className={`hover:bg-light-bg dark:hover:bg-dark-bg ${
                selectedCustomers.includes(customer.id) ? 'bg-primary-teal/10 dark:bg-primary-teal/20' : ''
              }`}
            >
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={() => handleSelectOne(customer.id)}
                  className="h-4 w-4 text-primary-teal rounded border-light-border dark:border-dark-border focus:ring-primary-teal"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                {customer.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-secondary dark:text-dark-text-secondary">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  customer.churn_score > 0.7 ? 'bg-primary-magenta/20 text-primary-magenta dark:bg-primary-magenta/30 dark:text-primary-magenta' :
                  customer.churn_score > 0.4 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {(customer.churn_score * 100).toFixed(1)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getRiskSegmentColor(customer.risk_segment)}`}>
                  {customer.risk_segment}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {customer.batch_name || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  onClick={() => onGenerateMessage(customer)}
                  disabled={generatingForCustomer === customer.id}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-xs font-medium transition-all shadow-sm"
                  title="Generate and preview personalized widget popup"
                >
                  {generatingForCustomer === customer.id ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    'Preview Widget Popup'
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-6 py-3 bg-light-bg dark:bg-dark-bg text-sm text-light-text-secondary dark:text-dark-text-secondary">
        {selectedCustomers.length} of {customers.length} customers selected
      </div>
    </div>
  )
}

export default WidgetCampaign
