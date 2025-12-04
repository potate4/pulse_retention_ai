import apiClient from './client'

/**
 * API module for CSV normalization endpoint
 */
export const csvNormalizationAPI = {
  /**
   * Normalize a CSV file to a custom schema using LLM
   *
   * @param {File} file - CSV file to normalize
   * @param {Array} expectedSchema - Array of {column_name, description} objects
   * @param {number} maxAttempts - Maximum LLM retry attempts (default: 5)
   * @returns {Promise<Object>} Response with output_csv_url, attempts, generated_script
   */
  normalizeCSV: async (file, expectedSchema, maxAttempts = 5) => {
    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('expected_schema', JSON.stringify(expectedSchema))
      formData.append('max_attempts', maxAttempts.toString())

      // Send request with multipart/form-data
      const response = await apiClient.post('/csv/normalize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Increase timeout for LLM processing (5 minutes)
        timeout: 300000,
      })

      return response.data
    } catch (error) {
      console.error('CSV normalization error:', error)
      throw error
    }
  },
}
