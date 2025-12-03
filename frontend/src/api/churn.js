import client from './client'

export const churnAPI = {
  /**
   * Step 1: Upload customer transaction CSV dataset
   * @param {string} orgId - Organization UUID
   * @param {File} file - CSV file with customer transaction data
   * @param {boolean} hasChurnLabel - Whether CSV includes churn labels
   * @returns {Promise} Upload result with dataset_id
   */
  uploadDataset: async (orgId, file, hasChurnLabel = false) => {
    const formData = new FormData()
    formData.append('file', file)
    // Send as query parameter instead of FormData to ensure proper boolean parsing
    const params = new URLSearchParams()
    params.append('has_churn_label', hasChurnLabel)

    const response = await client.post(
      `/churn/v2/organizations/${orgId}/upload-dataset?${params.toString()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  /**
   * Step 2: Process features from uploaded dataset (background task)
   * @param {string} orgId - Organization UUID
   * @param {string} datasetId - Dataset UUID from upload step
   * @returns {Promise} Processing status
   */
  processFeatures: async (orgId, datasetId) => {
    const response = await client.post(
      `/churn/v2/organizations/${orgId}/datasets/${datasetId}/process-features`
    )
    return response.data
  },

  /**
   * Step 3: Train churn prediction model (background task)
   * @param {string} orgId - Organization UUID
   * @param {string} modelType - Model type: 'logistic_regression', 'random_forest', 'gradient_boosting'
   * @returns {Promise} Training job status
   */
  trainModel: async (orgId, modelType = 'logistic_regression') => {
    const response = await client.post(
      `/churn/v2/organizations/${orgId}/train`,
      null,
      {
        params: { model_type: modelType }
      }
    )
    return response.data
  },

  /**
   * Get training status and metrics (for polling)
   * @param {string} orgId - Organization UUID
   * @returns {Promise} Training status with metrics
   */
  getTrainingStatus: async (orgId) => {
    const response = await client.get(
      `/churn/v2/organizations/${orgId}/training-status`
    )
    return response.data
  },

  /**
   * Step 4: Predict churn for a single customer
   * @param {string} orgId - Organization UUID
   * @param {Object} customerData - Customer transaction data
   * @returns {Promise} Prediction result
   */
  predictChurn: async (orgId, customerData) => {
    const response = await client.post(
      `/churn/v2/organizations/${orgId}/predict`,
      customerData
    )
    return response.data
  },

  /**
   * Step 4: Bulk prediction from CSV (background task)
   * @param {string} orgId - Organization UUID
   * @param {File} file - CSV file with customer transaction data
   * @param {string} batchName - Optional batch name
   * @returns {Promise} Batch ID and status
   */
  predictBulk: async (orgId, file, batchName = null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (batchName) {
      formData.append('batch_name', batchName)
    }

    const response = await client.post(
      `/churn/v2/organizations/${orgId}/predict-bulk`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  /**
   * Get prediction batch status and results (for polling)
   * @param {string} orgId - Organization UUID
   * @param {string} batchId - Batch UUID
   * @returns {Promise} Batch details with predictions
   */
  getPredictionBatch: async (orgId, batchId) => {
    const response = await client.get(
      `/churn/v2/organizations/${orgId}/prediction-batches/${batchId}`
    )
    return response.data
  },

  /**
   * Get individual predictions from a batch
   * @param {string} orgId - Organization UUID
   * @param {string} batchId - Batch UUID
   * @param {number} limit - Number of predictions to return
   * @param {number} offset - Pagination offset
   * @returns {Promise} List of predictions
   */
  getBatchPredictions: async (orgId, batchId, limit = 100, offset = 0) => {
    const response = await client.get(
      `/churn/v2/organizations/${orgId}/prediction-batches/${batchId}/predictions`,
      {
        params: { limit, offset }
      }
    )
    return response.data
  },

  /**
   * List all prediction batches for organization
   * @param {string} orgId - Organization UUID
   * @param {number} limit - Number of batches to return
   * @param {number} offset - Pagination offset
   * @returns {Promise} List of batches
   */
  getPredictionBatches: async (orgId, limit = 20, offset = 0) => {
    const response = await client.get(
      `/churn/v2/organizations/${orgId}/prediction-batches`,
      {
        params: { limit, offset }
      }
    )
    return response.data
  },

  /**
   * Get all customers from prediction batches with optional risk segment filter
   * @param {string} orgId - Organization UUID
   * @param {string} riskSegment - Optional risk segment filter (Low, Medium, High, Critical)
   * @param {number} limit - Number of customers to return
   * @param {number} offset - Pagination offset
   * @returns {Promise} List of customers with prediction data
   */
  getPredictionCustomers: async (orgId, riskSegment = null, limit = 100, offset = 0) => {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() })
    if (riskSegment) params.append('risk_segment', riskSegment)
    const response = await client.get(
      `/churn/v2/organizations/${orgId}/prediction-customers?${params.toString()}`
    )
    return response.data
  },

  /**
   * Analyze WHY a customer has their churn risk using LLM
   * @param {string} orgId - Organization UUID
   * @param {string} customerId - External customer ID
   * @param {number} churnProbability - Churn probability (0-1)
   * @param {string} riskLevel - Risk level (Low/Medium/High/Critical)
   * @returns {Promise} LLM analysis with patterns and retention tips
   */
  analyzeChurnReason: async (orgId, customerId, churnProbability, riskLevel) => {
    const response = await client.post(
      `/churn/v2/organizations/${orgId}/customers/${customerId}/analyze-churn-reason`,
      null,
      {
        params: {
          churn_probability: churnProbability,
          risk_level: riskLevel
        }
      }
    )
    return response.data
  },

  /**
   * Generate personalized retention email HTML using LLM
   * @param {string} orgId - Organization UUID
   * @param {string} customerId - External customer ID
   * @param {number} churnProbability - Churn probability (0-1)
   * @param {string} riskLevel - Risk level (Low/Medium/High/Critical)
   * @returns {Promise} Generated email with subject and HTML body
   */
  generatePersonalizedEmail: async (orgId, customerId, churnProbability, riskLevel) => {
    const response = await client.post(
      `/churn/v2/organizations/${orgId}/customers/${customerId}/generate-personalized-email`,
      null,
      {
        params: {
          churn_probability: churnProbability,
          risk_level: riskLevel
        }
      }
    )
    return response.data
  }
}
