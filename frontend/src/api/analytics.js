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
   * Get churn rate for each prediction batch (trend over time)
   */
  getChurnTrend: async (limit = 12) => {
    const response = await client.get('/analytics/churn-by-batch', {
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
   * Get distribution of customers by monetary value ranges
   */
  getValueDistribution: async () => {
    const response = await client.get('/analytics/customer-value-distribution')
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
