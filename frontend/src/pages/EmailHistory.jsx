import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getEmailHistory, getEmailStats } from '../api/emailHistory'
import {
  HiMail,
  HiXCircle,
  HiCheckCircle,
  HiTag,
  HiRefresh,
  HiSearch,
  HiFilter
} from 'react-icons/hi'
import { FiClock, FiUser } from 'react-icons/fi'

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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md">
              <HiMail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email History</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-2 ml-14">Track all emails sent through the platform</p>
        </div>
        

        {/* Statistics Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HiFilter className="w-5 h-5 text-purple-500" />
              Email Statistics
            </h2>
            <select
              value={statsDays}
              onChange={(e) => setStatsDays(Number(e.target.value))}
              className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          {statsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-3 border-purple-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading statistics...</p>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Total Sent */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Total Sent</p>
                    <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{stats.total_sent}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-md">
                    <HiMail className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Failed */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Failed</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.total_failed}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg shadow-md">
                    <HiXCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Success Rate</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.success_rate}%</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
                    <HiCheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Segments */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Segments Used</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{Object.keys(stats.emails_by_segment || {}).length}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md">
                    <HiTag className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Top Recipients */}
          {stats && stats.top_recipients && stats.top_recipients.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-md">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <FiUser className="w-5 h-5 text-purple-500" />
                Top 10 Recipients
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.top_recipients.map((recipient, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {recipient.email}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          ID: {recipient.customer_id}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">
                      {recipient.count} emails
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <HiFilter className="w-5 h-5 text-purple-500" />
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Segment Filter - Temporarily Commented Out */}
            {/* <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Segment
              </label>
              <div className="relative">
                <HiTag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={segmentFilter}
                  onChange={(e) => { setSegmentFilter(e.target.value); setPage(0); }}
                  placeholder="e.g., s1, s2"
                  className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div> */}

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                Customer Email
              </label>
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={emailFilter}
                  onChange={(e) => { setEmailFilter(e.target.value); setPage(0); }}
                  placeholder="Search email..."
                  className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
              >
                <HiRefresh className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-800/50">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HiMail className="w-5 h-5 text-purple-500" />
              Email History ({totalItems} total)
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-3 border-purple-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <HiMail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">No emails found</p>
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
                      {/* Segment Column - Temporarily Commented Out */}
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                        Segment
                      </th> */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-light-bg dark:hover:bg-dark-bg">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <FiClock className="w-4 h-4 text-gray-400" />
                            <span>{new Date(item.sent_at).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              <HiMail className="w-4 h-4 text-purple-500" />
                              {item.recipient_email}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              ID: {item.customer_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                          {item.subject}
                        </td>
                        {/* Segment Column Data - Temporarily Commented Out */}
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.segment_id ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-semibold">
                              <HiTag className="w-3 h-3" />
                              {item.segment_id}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'sent' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : item.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {item.status === 'sent' && <HiCheckCircle className="w-3 h-3" />}
                            {item.status === 'failed' && <HiXCircle className="w-3 h-3" />}
                            {item.status === 'pending' && <FiClock className="w-3 h-3" />}
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
                <div className="px-6 py-4 border-t-2 border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-800/50 flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Page <span className="font-bold text-gray-900 dark:text-white">{page + 1}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalPages}</span> ({totalItems} total items)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:shadow-none"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:shadow-none"
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
