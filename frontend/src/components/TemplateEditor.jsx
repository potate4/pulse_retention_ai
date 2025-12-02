import React, { useState } from 'react'

/**
 * TemplateEditor Component
 * Allows editing email subject and body with dynamic field insertion
 */
const TemplateEditor = ({ initialSubject, initialHtmlBody, customers, onSave, onCancel }) => {
  // Helper function to extract plain text from HTML
  const extractTextFromHtml = (html) => {
    if (!html) return ''
    
    // Create a temporary div to parse HTML
    const temp = document.createElement('div')
    temp.innerHTML = html
    
    // Get text content and clean it up
    let text = temp.textContent || temp.innerText || ''
    
    // Remove excessive whitespace and newlines
    text = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n')
    
    return text
  }

  // Helper function to convert plain text to simple HTML
  const textToHtml = (text) => {
    if (!text) return ''
    
    // Split into paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim())
    
    // Convert to HTML paragraphs
    const htmlParagraphs = paragraphs.map(para => {
      // Check if it's a list
      const lines = para.split('\n')
      if (lines.some(line => line.trim().match(/^[-*•]/) || line.trim().match(/^\d+\./))) {
        const listItems = lines
          .map(line => {
            const cleaned = line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '')
            return cleaned ? `<li>${cleaned}</li>` : ''
          })
          .filter(Boolean)
          .join('')
        return `<ul style="margin: 10px 0;">${listItems}</ul>`
      }
      
      // Regular paragraph with line breaks preserved
      const withBreaks = para.replace(/\n/g, '<br>')
      return `<p style="margin: 10px 0;">${withBreaks}</p>`
    })
    
    return `<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        ${htmlParagraphs.join('\n')}
    </div>
</body>
</html>`
  }

  const [subject, setSubject] = useState(initialSubject || '')
  const [textBody, setTextBody] = useState(extractTextFromHtml(initialHtmlBody))
  const [showPreview, setShowPreview] = useState(false)

  // Check if we have a single customer to show details
  const isSingleCustomer = customers && customers.length === 1
  const customerData = isSingleCustomer ? customers[0] : null

  const dynamicFields = [
    { name: 'name', label: 'Customer Name', example: 'Rahim Ahmed' },
    { name: 'email', label: 'Email', example: 'rahim@example.com' },
    { name: 'phone', label: 'Phone', example: '+8801712345678' },
    { name: 'segment', label: 'Segment', example: 'High Value' },
    { name: 'churn_score', label: 'Churn Score', example: '0.15' },
    { name: 'purchase_amount', label: 'Purchase Amount', example: '50000' },
    { name: 'last_purchase', label: 'Last Purchase Date', example: '2025-11-15' },
  ]

  const insertField = (fieldName, target) => {
    const placeholder = `{${fieldName}}`
    if (target === 'subject') {
      setSubject(subject + placeholder)
    } else {
      setTextBody(textBody + placeholder)
    }
  }

  const handleSave = () => {
    // Convert plain text back to HTML before saving
    const htmlBody = textToHtml(textBody)
    onSave({ subject, html_body: htmlBody })
  }

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 border border-light-border dark:border-dark-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">Edit Email Template</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary bg-light-bg dark:bg-dark-bg rounded-lg hover:bg-gray-200 dark:hover:bg-primary-navy border border-light-border dark:border-dark-border"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${customers && customers.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-6`}>
        {/* Editor Section */}
        <div className="lg:col-span-3 space-y-4">
          {/* Subject Editor */}
          <div>
            <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-2 border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            />
          </div>

          {/* Body Editor */}
          <div>
            <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
              Email Body
            </label>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-2">
              Write your email in plain text. Use double line breaks for paragraphs. Lists starting with - or * will be formatted automatically.
            </p>
            <textarea
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
              placeholder="Enter email body in plain text..."
              rows={20}
              className="w-full px-4 py-2 border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent text-sm"
            />
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="border border-light-border dark:border-dark-border rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-light-text-primary dark:text-dark-text-primary">Preview:</h3>
              <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm">
                <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject:</div>
                  <div className="font-semibold text-light-text-primary dark:text-dark-text-primary">{subject}</div>
                </div>
                <div className="text-light-text-primary dark:text-dark-text-primary" dangerouslySetInnerHTML={{ __html: textToHtml(textBody) }} />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-primary-teal text-white rounded-lg hover:bg-primary-slate font-medium"
            >
              Save Changes and send mail
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-200 dark:bg-dark-surface text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-300 dark:hover:bg-primary-navy font-medium border border-light-border dark:border-dark-border"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Customer Details Sidebar - Only show if we have customers */}
        {customers && customers.length > 0 && (
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {isSingleCustomer ? (
                /* Single Customer - Show actual data */
                <>
                  <div className="bg-gradient-to-br from-primary-teal/10 to-primary-mauve/10 rounded-lg p-4 border border-primary-teal/20 dark:border-primary-teal/30">
                    <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-2 flex items-center gap-2">
                      <span className="text-lg">👤</span>
                      Customer Details
                    </h3>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      Editing email for this customer. The template shows their actual data.
                    </p>
                  </div>

                  <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-4 border border-light-border dark:border-dark-border">
                    <h4 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                      Customer Information
                    </h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Name', value: customerData?.name || 'N/A', icon: '👤' },
                        { label: 'Email', value: customerData?.email || 'N/A', icon: '📧' },
                        { label: 'Phone', value: customerData?.phone || 'N/A', icon: '📱' },
                        { label: 'Segment', value: customerData?.segment_id || 'N/A', icon: '🏷️' },
                        { label: 'Churn Score', value: customerData?.churn_score?.toFixed(2) || 'N/A', icon: '📊' },
                        { label: 'Purchase Amount', value: customerData?.custom_fields?.purchase_amount ? `৳${customerData.custom_fields.purchase_amount}` : 'N/A', icon: '💰' },
                        { label: 'Last Purchase', value: customerData?.custom_fields?.last_purchase || 'N/A', icon: '📅' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 pb-2 border-b border-light-border dark:border-dark-border last:border-0">
                          <span className="text-lg flex-shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
                              {item.label}
                            </div>
                            <div className="text-sm text-light-text-primary dark:text-dark-text-primary break-words">
                              {item.value}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Multiple Customers - Show count only */
                <div className="bg-gradient-to-br from-primary-teal/10 to-primary-mauve/10 rounded-lg p-4 border border-primary-teal/20 dark:border-primary-teal/30">
                  <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-2 flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    Multiple Recipients
                  </h3>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-2">
                    Editing email template for <strong className="text-primary-teal">{customers.length} customers</strong>.
                  </p>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    The email will be personalized with each customer's data when sent.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TemplateEditor
