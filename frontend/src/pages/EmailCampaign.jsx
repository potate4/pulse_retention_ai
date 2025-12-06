import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomerTable from '../components/CustomerTable'
import EmailPreviewCard from '../components/EmailPreviewCard'
import Layout from '../components/Layout'
import { generateEmailPreview, sendEmails } from '../api/emails'
import { churnAPI } from '../api/churn'
import { useAuthStore } from '../stores/authStore'
import {
  HiMail,
  HiCheckCircle,
  HiXCircle,
  HiExclamationCircle,
  HiArrowLeft,
  HiArrowRight,
  HiRefresh,
  HiSparkles
} from 'react-icons/hi'
import { FiFilter, FiEdit3, FiSend } from 'react-icons/fi'

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
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 })
  const [sendingToCustomer, setSendingToCustomer] = useState(null) // Track which customer is being sent to
  const [generatingEmail, setGeneratingEmail] = useState(false) // Track LLM email generation
  const [personalizedEmailModal, setPersonalizedEmailModal] = useState({ open: false, customer: null, email: null })
  const [generatingForCustomer, setGeneratingForCustomer] = useState(null) // Track which customer is generating email

  // Load customers on mount and when filter or pagination changes
  useEffect(() => {
    if (user?.id) {
      loadPredictionCustomers()
    }
  }, [user?.id, riskSegmentFilter, pagination.offset])

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

  const handleGeneratePersonalizedEmail = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer to generate personalized email')
      return
    }

    // Use the first selected customer for personalization
    const firstCustomer = customers.find(c => c.id === selectedCustomers[0])
    if (!firstCustomer) {
      alert('Customer not found')
      return
    }

    try {
      setGeneratingEmail(true)

      const result = await churnAPI.generatePersonalizedEmail(
        user.id,
        firstCustomer.id,
        parseFloat(firstCustomer.churn_score),
        firstCustomer.risk_segment
      )

      if (result.success) {
        // Update email preview with generated content
        setEmailPreview({
          subject: result.subject,
          html_body: result.html_body,
          text_body: result.html_body.replace(/<[^>]*>/g, '') // Simple HTML to text conversion
        })
        setShowPreview(true)
        setSendResult(null)
      } else {
        alert('Failed to generate personalized email. Please ensure OPENAI_API_KEY is set.')
      }
    } catch (err) {
      console.error('Error generating personalized email:', err)
      alert('Failed to generate personalized email. Please try again.')
    } finally {
      setGeneratingEmail(false)
    }
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

  const handleGeneratePersonalizedEmailForCustomer = async (customer) => {
    try {
      setGeneratingForCustomer(customer.id)

      const result = await churnAPI.generatePersonalizedEmail(
        user.id,
        customer.id,
        parseFloat(customer.churn_score),
        customer.risk_segment
      )

      if (result.success) {
        // Open modal with generated email
        setPersonalizedEmailModal({
          open: true,
          customer: customer,
          email: {
            subject: result.subject,
            html_body: result.html_body,
            text_body: result.html_body.replace(/<[^>]*>/g, '') // Simple HTML to text conversion
          }
        })
      } else {
        alert('Failed to generate personalized email. Please ensure OPENAI_API_KEY is set.')
      }
    } catch (err) {
      console.error('Error generating personalized email:', err)
      alert('Failed to generate personalized email. Please try again.')
    } finally {
      setGeneratingForCustomer(null)
    }
  }

  const handleSendPersonalizedEmail = async () => {
    const { customer, email } = personalizedEmailModal

    if (!customer || !email) return

    const confirmed = window.confirm(
      `Send personalized email to ${customer.id}?\n\nSubject: ${email.subject}\n\nClick OK to send, Cancel to abort.`
    )

    if (!confirmed) return

    try {
      setSendingToCustomer(customer.id)

      // Send email with personalized template
      const result = await sendEmails({
        subject: email.subject,
        html_body: email.html_body,
        text_body: email.text_body,
        customer_ids: [customer.id],
        segment_id: null,
      })

      if (result.success) {
        alert(`Successfully sent personalized email to ${customer.id}!`)
        // Close modal
        setPersonalizedEmailModal({ open: false, customer: null, email: null })
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

  const handleNextPage = () => {
    const nextOffset = pagination.offset + pagination.limit
    if (nextOffset < pagination.total) {
      setPagination(prev => ({ ...prev, offset: nextOffset }))
    }
  }

  const handlePrevPage = () => {
    const prevOffset = Math.max(0, pagination.offset - pagination.limit)
    setPagination(prev => ({ ...prev, offset: prevOffset }))
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1

  return (
    <Layout activePage="email">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
              <HiMail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Campaign</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-2 ml-14">
            Send personalized emails to customers from prediction batches
          </p>
        </div>

        {/* Main Content - Single Column Layout */}
        <div className="space-y-6">
          {/* View At-Risk Customers Button */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl shadow-md p-6 border-2 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HiExclamationCircle className="w-5 h-5 text-red-600" />
                  Critical At-Risk Customers
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  View and send emails to customers at critical risk of churning
                </p>
              </div>
              <button
                onClick={() => {
                  setRiskSegmentFilter('Critical')
                  setPagination(prev => ({ ...prev, offset: 0 }))
                }}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <HiExclamationCircle className="w-5 h-5" />
                View Critical Risk Customers
              </button>
            </div>
          </div>

          {/* Risk Segment Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-2 border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiFilter className="w-5 h-5 text-indigo-500" />
              Filter by Risk Segment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <select
                  value={riskSegmentFilter}
                  onChange={(e) => {
                    setRiskSegmentFilter(e.target.value)
                    setPagination(prev => ({ ...prev, offset: 0 })) // Reset pagination
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm hover:shadow-md transition-shadow"
                >
                  <option value="All">All Segments</option>
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                  <option value="Critical">Critical Risk</option>
                </select>
              </div>
              <div className="flex items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing customers from all prediction batches
                </p>
              </div>
            </div>
          </div>

          {/* Customer Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <HiMail className="w-5 h-5 text-cyan-500" />
                    Prediction Customers
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {pagination.total} customers found • {selectedCustomers.length} selected
                  </p>
                </div>
              </div>
            </div>
            <PredictionCustomerTable
              customers={customers}
              selectedCustomers={selectedCustomers}
              onSelectionChange={setSelectedCustomers}
              onSendEmail={handleSendEmailToCustomer}
              onGeneratePersonalizedEmail={handleGeneratePersonalizedEmailForCustomer}
              sendingToCustomer={sendingToCustomer}
              generatingForCustomer={generatingForCustomer}
              loading={customersLoading}
            />
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-800/50 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Page <span className="font-bold text-gray-900 dark:text-white">{currentPage}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalPages}</span> ({pagination.total} total items)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={pagination.offset === 0}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:shadow-none flex items-center gap-2"
                  >
                    <HiArrowLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={pagination.offset + pagination.limit >= pagination.total}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:shadow-none flex items-center gap-2"
                  >
                    Next
                    <HiArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {customers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-2 border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <HiSparkles className="w-5 h-5 text-green-500" />
                Campaign Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleGeneratePreview}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <FiEdit3 className="w-5 h-5" />
                  Open Email Editor
                </button>
                <button
                  onClick={handleSendEmails}
                  disabled={!emailPreview || sending || selectedCustomers.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <FiSend className="w-5 h-5" />
                      <span>Send to {selectedCustomers.length}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Send Result */}
          {sendResult && (
            <div className={`rounded-xl shadow-md p-6 border-2 ${
              sendResult.success 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' 
                : 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  sendResult.success ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {sendResult.success ? (
                    <HiCheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <HiXCircle className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${
                    sendResult.success ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'
                  }`}>
                    {sendResult.message}
                  </h3>
                  <div className="flex items-center gap-6 mt-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${
                        sendResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        Sent: {sendResult.sent_count}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${
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

          {/* Email Template Editor - Moved to Bottom */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-800/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FiEdit3 className="w-5 h-5 text-indigo-500" />
                Email Template Editor
              </h2>
            </div>
            <div className="p-6">
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
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg mx-auto flex items-center justify-center mb-4 shadow-md">
                    <FiEdit3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Template Created</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Click "Open Email Editor" above to create your email template
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Personalized Email Modal */}
        {personalizedEmailModal.open && (
          <PersonalizedEmailModal
            customer={personalizedEmailModal.customer}
            email={personalizedEmailModal.email}
            onClose={() => setPersonalizedEmailModal({ open: false, customer: null, email: null })}
            onSend={handleSendPersonalizedEmail}
            onEmailChange={(updatedEmail) => {
              setPersonalizedEmailModal(prev => ({
                ...prev,
                email: updatedEmail
              }))
            }}
            sending={sendingToCustomer === personalizedEmailModal.customer?.id}
          />
        )}
      </div>
    </Layout>
  )
}

/**
 * PersonalizedEmailModal Component
 * Modal to preview and edit personalized email before sending
 */
const PersonalizedEmailModal = ({
  customer,
  email,
  onClose,
  onSend,
  onEmailChange,
  sending
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState(email?.subject || '')
  const [editedHtmlBody, setEditedHtmlBody] = useState(email?.html_body || '')

  // Update local state when email prop changes
  React.useEffect(() => {
    if (email) {
      setEditedSubject(email.subject)
      setEditedHtmlBody(email.html_body)
    }
  }, [email])

  const handleSave = () => {
    onEmailChange({
      subject: editedSubject,
      html_body: editedHtmlBody,
      text_body: editedHtmlBody.replace(/<[^>]*>/g, '')
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    // Reset to original values
    setEditedSubject(email?.subject || '')
    setEditedHtmlBody(email?.html_body || '')
    setIsEditing(false)
  }

  if (!customer || !email) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Personalized Email for {customer.id}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Risk: <span className={`font-semibold ${
                customer.risk_segment === 'Critical' ? 'text-red-600' :
                customer.risk_segment === 'High' ? 'text-orange-600' :
                customer.risk_segment === 'Medium' ? 'text-yellow-600' :
                'text-green-600'
              }`}>{customer.risk_segment}</span> • Churn Probability: {(customer.churn_score * 100).toFixed(1)}%
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isEditing ? (
            <div className="space-y-4">
              {/* Subject Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* HTML Body Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Body (HTML)
                </label>
                <textarea
                  value={editedHtmlBody}
                  onChange={(e) => setEditedHtmlBody(e.target.value)}
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm
                    focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Subject Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-900 dark:text-white font-medium">{editedSubject}</p>
                </div>
              </div>

              {/* HTML Body Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Preview
                </label>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  <div
                    className="p-6 bg-white"
                    dangerouslySetInnerHTML={{ __html: editedHtmlBody }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                Edit Email
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Close
                </button>
                <button
                  onClick={onSend}
                  disabled={sending}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
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
  onGeneratePersonalizedEmail,
  sendingToCustomer,
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
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-3 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading customers...</p>
        </div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <HiMail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">No customers found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedCustomers.length === customers.length && customers.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Customer ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Churn Probability
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Risk Segment
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Batch Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                selectedCustomers.includes(customer.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
              }`}
            >
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={() => handleSelectOne(customer.id)}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                {customer.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  customer.churn_score > 0.7 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  customer.churn_score > 0.4 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {(customer.churn_score * 100).toFixed(1)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRiskSegmentColor(customer.risk_segment)}`}>
                  {customer.risk_segment}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {customer.batch_name || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => onGeneratePersonalizedEmail(customer)}
                    disabled={generatingForCustomer === customer.id}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg disabled:cursor-not-allowed text-xs font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none flex items-center gap-1"
                    title="Generate AI-powered personalized email"
                  >
                    {generatingForCustomer === customer.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <HiSparkles className="w-3 h-3" />
                        <span>Generate Personalized</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => onSendEmail(customer.id)}
                    disabled={sendingToCustomer === customer.id}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg disabled:cursor-not-allowed text-xs font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none flex items-center gap-1"
                  >
                    {sendingToCustomer === customer.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <FiSend className="w-3 h-3" />
                        <span>Send Email</span>
                      </>
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          <span className="font-bold text-gray-900 dark:text-white">{selectedCustomers.length}</span> of <span className="font-bold text-gray-900 dark:text-white">{customers.length}</span> customers selected
        </p>
      </div>
    </div>
  )
}

export default EmailCampaign
