import React, { useState } from 'react'

/**
 * EmailPreviewCard Component
 * Displays and allows editing of email preview with subject and body
 */
const EmailPreviewCard = ({ subject: initialSubject, htmlBody: initialHtmlBody, textBody: initialTextBody, onEdit, onChange }) => {
  const [subject, setSubject] = useState(initialSubject || '')
  const [htmlBody, setHtmlBody] = useState(initialHtmlBody || '')
  const [textBody, setTextBody] = useState(initialTextBody || '')
  const [isEditing, setIsEditing] = useState(false)

  // Update local state when props change
  React.useEffect(() => {
    setSubject(initialSubject || '')
    setHtmlBody(initialHtmlBody || '')
    setTextBody(initialTextBody || '')
  }, [initialSubject, initialHtmlBody, initialTextBody])

  const handleSave = () => {
    if (onChange) {
      onChange({
        subject,
        html_body: htmlBody,
        text_body: textBody
      })
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setSubject(initialSubject || '')
    setHtmlBody(initialHtmlBody || '')
    setTextBody(initialTextBody || '')
    setIsEditing(false)
  }

  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 border border-light-border dark:border-dark-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">Email Preview</h3>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-primary-teal hover:text-primary-slate text-sm font-medium px-3 py-1 rounded hover:bg-primary-teal/10"
              >
                Edit
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="text-primary-teal hover:text-primary-slate text-sm font-medium px-3 py-1 rounded hover:bg-primary-teal/10"
                >
                  Advanced Edit
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="text-green-600 hover:text-green-700 text-sm font-medium px-3 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="text-gray-600 hover:text-gray-700 text-sm font-medium px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subject */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
          Subject:
        </label>
        {isEditing ? (
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            placeholder="Enter email subject"
          />
        ) : (
          <div className="px-4 py-2 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border">
            <p className="text-light-text-primary dark:text-dark-text-primary">{subject}</p>
          </div>
        )}
      </div>

      {/* HTML Body */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
          Email Body (HTML):
        </label>
        {isEditing ? (
          <textarea
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={12}
            className="w-full px-4 py-2 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-primary-teal focus:border-transparent font-mono text-sm"
            placeholder="Enter HTML email body"
          />
        ) : (
          <div className="border border-light-border dark:border-dark-border rounded overflow-hidden">
            <div className="bg-light-bg dark:bg-dark-bg px-4 py-2 border-b border-light-border dark:border-dark-border">
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted">HTML Preview</span>
            </div>
            <div 
              className="p-4 bg-light-surface dark:bg-dark-surface max-h-96 overflow-y-auto text-light-text-primary dark:text-dark-text-primary"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
            />
          </div>
        )}
      </div>

      {/* Text Body (optional) */}
      {isEditing && (
        <div>
          <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
            Plain Text Version (optional):
          </label>
          <textarea
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-primary-teal focus:border-transparent font-mono text-sm"
            placeholder="Enter plain text version (optional)"
          />
        </div>
      )}
    </div>
  )
}

export default EmailPreviewCard
