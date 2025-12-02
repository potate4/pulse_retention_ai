import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SegmentSelector from '../components/SegmentSelector'
import CustomerTable from '../components/CustomerTable'
import EmailPreviewCard from '../components/EmailPreviewCard'
import Layout from '../components/Layout'
import { getSegments, getSegmentCustomers, generateEmailPreview, sendEmails } from '../api/emails'

/**
 * EmailCampaign Page
 * Main page for creating and sending email campaigns
 */
const EmailCampaign = () => {
  const navigate = useNavigate()
  
  // State
  const [segments, setSegments] = useState([])
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [customers, setCustomers] = useState([])
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [emailPreview, setEmailPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  // Load segments on mount
  useEffect(() => {
    loadSegments()
  }, [])

  // Load customers when segment changes
  useEffect(() => {
    if (selectedSegment) {
      loadCustomers(selectedSegment)
    } else {
      setCustomers([])
      setSelectedCustomers([])
      setEmailPreview(null)
      setShowPreview(false)
    }
  }, [selectedSegment])

  const loadSegments = async () => {
    try {
      setLoading(true)
      const data = await getSegments()
      setSegments(data)
    } catch (error) {
      console.error('Failed to load segments:', error)
      alert('Failed to load segments. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async (segmentId) => {
    try {
      setCustomersLoading(true)
      const data = await getSegmentCustomers(segmentId)
      setCustomers(data)
      // Auto-select all customers
      setSelectedCustomers(data.map(c => c.id))
    } catch (error) {
      console.error('Failed to load customers:', error)
      alert('Failed to load customers. Please try again.')
    } finally {
      setCustomersLoading(false)
    }
  }

  const handleGeneratePreview = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer')
      return
    }

    try {
      setLoading(true)
      const data = await generateEmailPreview({
        customer_ids: selectedCustomers,
        segment_id: selectedSegment,
      })
      setEmailPreview(data)
      setShowPreview(true)
      setSendResult(null)
    } catch (error) {
      console.error('Failed to generate preview:', error)
      alert('Failed to generate email preview. Please try again.')
    } finally {
      setLoading(false)
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
        segment_id: selectedSegment,
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

  const handleEditTemplate = () => {
    // Get customer data for selected customers
    const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id))
    
    navigate('/edit-template', {
      state: {
        subject: emailPreview?.subject,
        htmlBody: emailPreview?.html_body,
        segmentId: selectedSegment,
        customerIds: selectedCustomers,
        customers: selectedCustomerData,
      }
    })
  }

  return (
    <Layout activePage="email">
      <div>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#1e293b' }}>Email Campaign</h1>
          <p style={{ margin: '0', color: '#64748b', fontSize: '16px' }}>
            Create and send personalized emails to your customer segments
          </p>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Left Column - Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Segment Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-indigo-500">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Target Segment</h2>
              <SegmentSelector
                segments={segments}
                selectedSegment={selectedSegment}
                onSegmentChange={setSelectedSegment}
                loading={loading}
              />
            </div>

            {/* Customer Table */}
            {selectedSegment && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-cyan-500">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Customers in Segment
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {customers.length} customers found • {selectedCustomers.length} selected
                  </p>
                </div>
                <CustomerTable
                  customers={customers}
                  selectedCustomers={selectedCustomers}
                  onSelectionChange={setSelectedCustomers}
                  loading={customersLoading}
                />
              </div>
            )}

            {/* Action Buttons */}
            {selectedSegment && customers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-green-500">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleGeneratePreview}
                    disabled={loading || selectedCustomers.length === 0}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {loading ? 'Generating...' : 'Generate Preview'}
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
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center border-l-4 border-gray-300 dark:border-gray-600">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Preview</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Select a segment and generate a preview to see your email template
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

export default EmailCampaign
