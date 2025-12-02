import client from './client'

export const analyticsAPI = {
  /**
   * Get key analytics metrics
   */
  getMetrics: async () => {
    const response = await client.get('/analytics/metrics')
    return response.data
  },

  /**
   * Get monthly churn trend data
   */
  getChurnTrend: async (months = 6) => {
    const response = await client.get('/analytics/churn-trend', {
      params: { months }
    })
    return response.data
  },

  /**
   * Get customer distribution across segments
   */
  getSegmentsDistribution: async () => {
    const response = await client.get('/analytics/segments-distribution')
    return response.data
  },

  /**
   * Get top reasons for customer churn
   */
  getChurnReasons: async (limit = 5) => {
    const response = await client.get('/analytics/churn-reasons', {
      params: { limit }
    })
    return response.data
  },

  /**
   * Get customer distribution by risk level
   */
  getRiskDistribution: async () => {
    const response = await client.get('/analytics/risk-distribution')
    return response.data
  },

  /**
   * Get comprehensive analytics summary
   */
  getSummary: async () => {
    const response = await client.get('/analytics/summary')
    return response.data
  }
}
