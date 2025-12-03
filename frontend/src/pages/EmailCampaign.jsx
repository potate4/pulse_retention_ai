import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomerTable from '../components/CustomerTable'
import EmailPreviewCard from '../components/EmailPreviewCard'
import Layout from '../components/Layout'
import { generateEmailPreview, sendEmails } from '../api/emails'
import { churnAPI } from '../api/churn'
import { useAuthStore } from '../stores/authStore'

/**
 * EmailCampaign Page
 * Main page for creating and sending email campaigns to prediction customers
 */
const EmailCampaign = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  // State
  const [customers, setCustomers] = useState([])
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [emailPreview, setEmailPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [riskSegmentFilter, setRiskSegmentFilter] = useState('All')
  const [pagination, setPagination] = useState({ limit: 100, offset: 0, total: 0 })
  const [sendingToCustomer, setSendingToCustomer] = useState(null) // Track which customer is being sent to

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
      
      // Transform prediction customers to match CustomerTable format
      const transformedCustomers = data.customers.map(c => ({
        id: c.customer_id,
        name: `Customer ${c.customer_id}`,
        email: 'sumaiyaahmed@iut-dhaka.edu', // Default email for all prediction customers
        phone: null,
        segment_id: null,
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

  const handleGeneratePreview = () => {
    // Just show the default template - no API call needed
    const defaultTemplate = {
      subject: "We'd Love to Have You Back!",
      html_body: `<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50;">Hello Valued Customer,</h2>
    <p>We noticed you haven't been with us lately, and we wanted to reach out to see how we can help.</p>
    <p>We value your business and would love to have you back. As a token of our appreciation, we're offering you a special discount on your next purchase.</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Claim Your Offer</a>
    </div>
    <p>If you have any questions or concerns, please don't hesitate to reach out to us. We're here to help!</p>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
        Best regards,<br>
        The Team
    </p>
</body>
</html>`,
      text_body: `Hello Valued Customer,

We noticed you haven't been with us lately, and we wanted to reach out to see how we can help.

We value your business and would love to have you back. As a token of our appreciation, we're offering you a special discount on your next purchase.

If you have any questions or concerns, please don't hesitate to reach out to us. We're here to help!

Best regards,
The Team`
    }
    
    setEmailPreview(defaultTemplate)
    setShowPreview(true)
    setSendResult(null)
  }

  const handleSendEmails = async () => {
    if (!emailPreview) {
      alert('Please generate a preview first')
      return
    }

    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to send emails to ${selectedCustomers.length} customer(s)?`
    )

    if (!confirmed) return

    try {
      setSending(true)
      const result = await sendEmails({
        subject: emailPreview.subject,
        html_body: emailPreview.html_body,
        text_body: emailPreview.text_body,
        customer_ids: selectedCustomers,
        segment_id: null,
      })
      
      setSendResult(result)
      alert(`Successfully sent ${result.sent_count} emails!`)
    } catch (error) {
      console.error('Failed to send emails:', error)
      alert('Failed to send emails. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleSendEmailToCustomer = async (customerId) => {
    // Use the current email preview or default template
    const template = emailPreview || {
      subject: "We'd Love to Have You Back!",
      html_body: `<html><body style="font-family: Arial, sans-serif; padding: 20px;"><h2>Hello Valued Customer,</h2><p>We value your business!</p></body></html>`,
      text_body: "Hello Valued Customer, We value your business!"
    }
    
    const confirmed = window.confirm(
      `Send email to ${customerId}?\n\nSubject: ${template.subject}\n\nClick OK to send, Cancel to abort.`
    )

    if (!confirmed) return

    try {
      setSendingToCustomer(customerId)
      
      // Send email directly with the template
      const result = await sendEmails({
        subject: template.subject,
        html_body: template.html_body,
        text_body: template.text_body,
        customer_ids: [customerId],
        segment_id: null,
      })
      
      if (result.success) {
        alert(`Successfully sent email to ${customerId}!`)
      } else {
        alert(`Failed to send email: ${result.message}`)
      }
    } catch (error) {
      console.error('Failed to send email to customer:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setSendingToCustomer(null)
    }
  }

  const handleEditTemplate = () => {
    // Get customer data for selected customers
    const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id))
    
    navigate('/edit-template', {
      state: {
        subject: emailPreview?.subject,
        htmlBody: emailPreview?.html_body,
        segmentId: null,
        customerIds: selectedCustomers,
        customers: selectedCustomerData,
      }
    })
  }

  return (
    <Layout activePage="email">
      <div>
        {/* Header */}
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Campaign</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Send personalized emails to customers from prediction batches
          </p>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Left Column - Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Risk Segment Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-indigo-500">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filter by Risk Segment</h2>
              <select
                value={riskSegmentFilter}
                onChange={(e) => {
                  setRiskSegmentFilter(e.target.value)
                  setPagination(prev => ({ ...prev, offset: 0 })) // Reset pagination
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Segments</option>
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
                <option value="Critical">Critical Risk</option>
              </select>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Showing customers from all prediction batches
              </p>
            </div>

            {/* Customer Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-cyan-500">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Prediction Customers
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {pagination.total} customers found • {selectedCustomers.length} selected
                </p>
              </div>
              <PredictionCustomerTable
                customers={customers}
                selectedCustomers={selectedCustomers}
                onSelectionChange={setSelectedCustomers}
                onSendEmail={handleSendEmailToCustomer}
                sendingToCustomer={sendingToCustomer}
                loading={customersLoading}
              />
            </div>

            {/* Action Buttons */}
            {customers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-green-500">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleGeneratePreview}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Open Email Editor
                  </button>
                  <button
                    onClick={handleSendEmails}
                    disabled={!emailPreview || sending || selectedCustomers.length === 0}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {sending ? 'Sending...' : `Send to ${selectedCustomers.length}`}
                  </button>
                </div>
              </div>
            )}

            {/* Send Result */}
            {sendResult && (
              <div className={`rounded-lg shadow p-6 border-l-4 ${
                sendResult.success 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    sendResult.success ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <span className="text-xl">{sendResult.success ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg ${
                      sendResult.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {sendResult.message}
                    </h3>
                    <div className="flex items-center gap-6 mt-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          sendResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                        }`}>
                          Sent: {sendResult.sent_count}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          sendResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                        }`}>
                          Failed: {sendResult.failed_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {showPreview && emailPreview ? (
                <EmailPreviewCard
                  subject={emailPreview.subject}
                  htmlBody={emailPreview.html_body}
                  textBody={emailPreview.text_body}
                  onEdit={handleEditTemplate}
                  onChange={(updated) => {
                    setEmailPreview({
                      ...emailPreview,
                      subject: updated.subject,
                      html_body: updated.html_body,
                      text_body: updated.text_body
                    })
                  }}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center border-l-4 border-gray-300 dark:border-gray-600">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Template Editor</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Click "Open Email Editor" to create your email template
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

/**
 * PredictionCustomerTable Component
 * Displays prediction customers with risk segment, churn probability, and send email button
 */
const PredictionCustomerTable = ({ 
  customers, 
  selectedCustomers, 
  onSelectionChange, 
  onSendEmail,
  sendingToCustomer,
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
                  onClick={() => onSendEmail(customer.id)}
                  disabled={sendingToCustomer === customer.id}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                >
                  {sendingToCustomer === customer.id ? 'Sending...' : 'Send Email'}
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

export default EmailCampaign
