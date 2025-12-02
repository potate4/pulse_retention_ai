import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import TemplateEditor from '../components/TemplateEditor'
import { sendEmails } from '../api/emails'

/**
 * EditTemplate Page
 * Allows editing email template before sending
 */
const EditTemplate = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  const { subject, htmlBody, segmentId, customerIds, customers } = location.state || {}

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
      <Layout activePage="email">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>No Template Data</h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>Please generate a preview first</p>
            <button
              onClick={() => navigate('/email-campaign')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              Go to Email Campaign
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout activePage="email">
      <div>
        <TemplateEditor
          initialSubject={subject}
          initialHtmlBody={htmlBody}
          customers={customers}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  )
}

export default EditTemplate
