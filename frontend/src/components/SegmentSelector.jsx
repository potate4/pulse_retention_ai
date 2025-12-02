import React from 'react'

/**
 * SegmentSelector Component
 * Dropdown to select customer segment
 */
const SegmentSelector = ({ segments, selectedSegment, onSegmentChange, loading }) => {
  return (
    <div className="w-full">
      <label htmlFor="segment" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
        Select Customer Segment
      </label>
      <select
        id="segment"
        value={selectedSegment || ''}
        onChange={(e) => onSegmentChange(e.target.value)}
        disabled={loading}
        className="w-full px-4 py-2 border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed">
      >
        <option value="">-- Select a Segment --</option>
        {segments.map((segment) => (
          <option key={segment.id} value={segment.id}>
            {segment.name} ({segment.customer_count} customers)
          </option>
        ))}
      </select>
      {selectedSegment && (
        <p className="mt-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
          {segments.find(s => s.id === selectedSegment)?.description}
        </p>
      )}
    </div>
  )
}

export default SegmentSelector
