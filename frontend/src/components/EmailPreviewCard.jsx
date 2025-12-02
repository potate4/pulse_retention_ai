import React from 'react'

/**
 * EmailPreviewCard Component
 * Displays email preview with subject and body
 */
const EmailPreviewCard = ({ subject, htmlBody, textBody, onEdit }) => {
  return (
    <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 border border-light-border dark:border-dark-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">Email Preview</h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-primary-teal hover:text-primary-slate text-sm font-medium"
          >
            Edit Template
          </button>
        )}
      </div>

      {/* Subject */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
          Subject:
        </label>
        <div className="px-4 py-2 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border">
          <p className="text-light-text-primary dark:text-dark-text-primary">{subject}</p>
        </div>
      </div>

      {/* HTML Body Preview */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
          Email Body:
        </label>
        <div className="border border-light-border dark:border-dark-border rounded overflow-hidden">
          <div className="bg-light-bg dark:bg-dark-bg px-4 py-2 border-b border-light-border dark:border-dark-border">
            <span className="text-xs text-light-text-muted dark:text-dark-text-muted">HTML Preview</span>
          </div>
          <div 
            className="p-4 bg-light-surface dark:bg-dark-surface max-h-96 overflow-y-auto text-light-text-primary dark:text-dark-text-primary"
            dangerouslySetInnerHTML={{ __html: htmlBody }}
          />
        </div>
      </div>

      {/* Text Body (optional) */}
      {textBody && (
        <div>
          <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
            Plain Text Version:
          </label>
          <div className="px-4 py-2 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border">
            <pre className="text-sm text-light-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap font-sans">
              {textBody}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailPreviewCard
