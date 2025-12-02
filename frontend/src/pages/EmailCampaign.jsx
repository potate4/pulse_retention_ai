import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SegmentSelector from '../components/SegmentSelector'
import CustomerTable from '../components/CustomerTable'
import EmailPreviewCard from '../components/EmailPreviewCard'
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
    navigate('/edit-template', {
      state: {
        subject: emailPreview?.subject,
        htmlBody: emailPreview?.html_body,
        segmentId: selectedSegment,
        customerIds: selectedCustomers,
      }
    })
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">Email Campaign</h1>
          <p className="mt-2 text-light-text-secondary dark:text-dark-text-secondary">
            Create and send personalized emails to your customer segments
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Segment Selector */}
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 border border-light-border dark:border-dark-border">
              <SegmentSelector
                segments={segments}
                selectedSegment={selectedSegment}
                onSegmentChange={setSelectedSegment}
                loading={loading}
              />
            </div>

            {/* Customer Table */}
            {selectedSegment && (
              <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md border border-light-border dark:border-dark-border">
                <div className="px-6 py-4 border-b border-light-border dark:border-dark-border">
                  <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                    Customers in Segment
                  </h2>
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
              <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 border border-light-border dark:border-dark-border">
                <div className="flex gap-3">
                  <button
                    onClick={handleGeneratePreview}
                    disabled={loading || selectedCustomers.length === 0}
                    className="flex-1 px-6 py-3 bg-primary-teal text-white rounded-lg hover:bg-primary-slate disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Generating...' : 'Generate Email Preview'}
                  </button>
                  <button
                    onClick={handleSendEmails}
                    disabled={!emailPreview || sending || selectedCustomers.length === 0}
                    className="flex-1 px-6 py-3 bg-primary-magenta text-white rounded-lg hover:bg-primary-mauve disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
                  >
                    {sending ? 'Sending...' : `Send to ${selectedCustomers.length} Customer(s)`}
                  </button>
                </div>
              </div>
            )}

            {/* Send Result */}
            {sendResult && (
              <div className={`rounded-lg p-4 ${sendResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-primary-magenta/20 border border-red-200 dark:border-primary-magenta'}`}>
                <h3 className={`font-semibold ${sendResult.success ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-primary-magenta'}`}>
                  {sendResult.message}
                </h3>
                <p className={`text-sm mt-1 ${sendResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-primary-mauve'}`}>
                  Sent: {sendResult.sent_count} | Failed: {sendResult.failed_count}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-1">
            {showPreview && emailPreview ? (
              <EmailPreviewCard
                subject={emailPreview.subject}
                htmlBody={emailPreview.html_body}
                textBody={emailPreview.text_body}
                onEdit={handleEditTemplate}
              />
            ) : (
              <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 text-center text-light-text-secondary dark:text-dark-text-secondary border border-light-border dark:border-dark-border">
                <p>Select a segment and generate a preview to see the email template</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailCampaign
