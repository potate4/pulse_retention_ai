import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getEmailHistory, getEmailStats } from '../api/emailHistory'

/**
 * EmailHistory Page
 * Shows email sending history, statistics, and filters
 */
const EmailHistory = () => {
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const pageSize = 20
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [statsDays, setStatsDays] = useState(30)

  useEffect(() => {
    loadHistory()
  }, [page, statusFilter, segmentFilter, emailFilter])

  useEffect(() => {
    loadStats()
  }, [statsDays])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const data = await getEmailHistory({
        skip: page * pageSize,
        limit: pageSize,
        status: statusFilter || undefined,
        segment_id: segmentFilter || undefined,
        customer_email: emailFilter || undefined,
      })
      setHistory(data.items)
      setTotalItems(data.total)
    } catch (error) {
      console.error('Failed to load email history:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await getEmailStats(statsDays)
      setStats(data)
    } catch (error) {
      console.error('Failed to load email stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleClearFilters = () => {
    setStatusFilter('')
    setSegmentFilter('')
    setEmailFilter('')
    setPage(0)
  }

  const totalPages = Math.ceil(totalItems / pageSize)

  return (
    <Layout activePage="history">
      <div>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#1e293b' }}>
            Email History
          </h1>
          <p className="mt-2 text-light-text-secondary dark:text-dark-text-secondary">
            Track all emails sent through the platform
          </p>
        </div>

        {/* Statistics Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary">
              Email Statistics
            </h2>
            <select
              value={statsDays}
              onChange={(e) => setStatsDays(Number(e.target.value))}
              className="px-3 py-2 border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary rounded-lg text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          {statsLoading ? (
            <div className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
              Loading statistics...
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Total Sent */}
              <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 border border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Total Sent</p>
                    <p className="text-3xl font-bold text-primary-teal">{stats.total_sent}</p>
                  </div>
                  <div className="text-4xl">📧</div>
                </div>
              </div>

              {/* Failed */}
              <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 border border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Failed</p>
                    <p className="text-3xl font-bold text-primary-magenta">{stats.total_failed}</p>
                  </div>
                  <div className="text-4xl">❌</div>
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 border border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Success Rate</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.success_rate}%</p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>

              {/* Segments */}
              <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 border border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Segments Used</p>
                    <p className="text-3xl font-bold text-primary-mauve">{Object.keys(stats.emails_by_segment || {}).length}</p>
                  </div>
                  <div className="text-4xl">🏷️</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Top Recipients */}
          {stats && stats.top_recipients && stats.top_recipients.length > 0 && (
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 border border-light-border dark:border-dark-border">
              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                Top 10 Recipients
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.top_recipients.map((recipient, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-light-bg dark:bg-dark-bg rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary-teal">#{idx + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                          {recipient.email}
                        </p>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          ID: {recipient.customer_id}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-primary-mauve">
                      {recipient.count} emails
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-6 mb-6 border border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary rounded-lg"
              >
                <option value="">All</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                Segment
              </label>
              <input
                type="text"
                value={segmentFilter}
                onChange={(e) => { setSegmentFilter(e.target.value); setPage(0); }}
                placeholder="e.g., s1, s2"
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                Customer Email
              </label>
              <input
                type="text"
                value={emailFilter}
                onChange={(e) => { setEmailFilter(e.target.value); setPage(0); }}
                placeholder="Search email..."
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary rounded-lg"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-dark-surface text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-300 dark:hover:bg-primary-navy border border-light-border dark:border-dark-border"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md border border-light-border dark:border-dark-border overflow-hidden">
          <div className="px-6 py-4 border-b border-light-border dark:border-dark-border">
            <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              Email History ({totalItems} total)
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12 text-light-text-secondary dark:text-dark-text-secondary">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-light-text-secondary dark:text-dark-text-secondary">
              No emails found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-light-bg dark:bg-dark-bg">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                        Segment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-light-bg dark:hover:bg-dark-bg">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-primary dark:text-dark-text-primary">
                          {new Date(item.sent_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-light-text-primary dark:text-dark-text-primary">
                          <div>
                            <div className="font-medium">{item.recipient_email}</div>
                            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                              ID: {item.customer_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-light-text-primary dark:text-dark-text-primary max-w-xs truncate">
                          {item.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.segment_id ? (
                            <span className="px-2 py-1 bg-primary-teal/20 text-primary-teal rounded text-xs">
                              {item.segment_id}
                            </span>
                          ) : (
                            <span className="text-light-text-secondary dark:text-dark-text-secondary">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'sent' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : item.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                  <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Page {page + 1} of {totalPages} ({totalItems} total items)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="px-3 py-1 bg-primary-teal text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1 bg-primary-teal text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default EmailHistory
