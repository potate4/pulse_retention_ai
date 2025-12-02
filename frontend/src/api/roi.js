import client from './client'

export const roiAPI = {
  /**
   * Get key ROI and financial metrics based on real prediction data
   */
  getMetrics: async () => {
    const response = await client.get('/roi/metrics')
    return response.data
  },

  /**
   * Get savings calculation for each prediction batch
   */
  getBatchSavings: async (limit = 10) => {
    const response = await client.get('/roi/batch-savings', {
      params: { limit }
    })
    return response.data
  },

  /**
   * Get monetary value distribution by risk segment
   */
  getRiskValueDistribution: async () => {
    const response = await client.get('/roi/risk-value-distribution')
    return response.data
  },

  /**
   * Get comprehensive ROI summary
   */
  getSummary: async () => {
    const response = await client.get('/roi/summary')
    return response.data
  }
}
