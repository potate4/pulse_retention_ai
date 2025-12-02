import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import TemplateEditor from '../components/TemplateEditor'
import { sendEmails } from '../api/emails'

/**
 * EditTemplate Page
 * Allows editing email template before sending
 */
const EditTemplate = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  const { subject, htmlBody, segmentId, customerIds } = location.state || {}

  const handleSave = async (updatedTemplate) => {
    if (!customerIds || customerIds.length === 0) {
      alert('No customers selected')
      return
    }

    const confirmed = window.confirm(
      `Send email to ${customerIds.length} customer(s)?`
    )

    if (!confirmed) return

    try {
      const result = await sendEmails({
        subject: updatedTemplate.subject,
        html_body: updatedTemplate.html_body,
        text_body: null,
        customer_ids: customerIds,
        segment_id: segmentId,
      })
      
      alert(`Successfully sent ${result.sent_count} emails!`)
      navigate('/email-campaign')
    } catch (error) {
      console.error('Failed to send emails:', error)
      alert('Failed to send emails. Please try again.')
    }
  }

  const handleCancel = () => {
    navigate('/email-campaign')
  }

  if (!subject && !htmlBody) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">No Template Data</h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">Please generate a preview first</p>
          <button
            onClick={() => navigate('/email-campaign')}
            className="px-6 py-2 bg-primary-teal text-white rounded-lg hover:bg-primary-slate"
          >
            Go to Email Campaign
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TemplateEditor
          initialSubject={subject}
          initialHtmlBody={htmlBody}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}

export default EditTemplate
