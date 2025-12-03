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
   * Step 5: Segment customers based on predictions
   * @param {string} orgId - Organization UUID
   * @param {string} batchId - Optional batch ID to segment specific batch
   * @returns {Promise} Segmentation results
   */
  segmentCustomers: async (orgId, batchId = null) => {
    const response = await client.post(
      `/segmentation/organizations/${orgId}/segment`,
      null,
    )
    return response.data
  },

  /**
   * Step 6: Analyze customer behaviors
   * @param {string} orgId - Organization UUID
   * @param {number} limit - Optional limit on customers to process
   * @returns {Promise} Behavior analysis results
   */
  analyzeBehaviors: async (orgId, limit = null) => {
    const response = await client.post(
      `/behavior/organizations/${orgId}/analyze-behaviors`,
      null,
      {
        params: limit ? { limit } : {}
      }
    )
    return response.data
  },

  /**
   * Get segment distribution for organization
   * @param {string} orgId - Organization UUID
   * @returns {Promise} Segment distribution
   */
  getSegmentDistribution: async (orgId) => {
    const response = await client.get(
      `/segmentation/organizations/${orgId}/segments`
    )
    return response.data
  },

  /**
   * Get behavior insights for organization
   * @param {string} orgId - Organization UUID
   * @returns {Promise} Behavior insights
   */
  getBehaviorInsights: async (orgId) => {
    const response = await client.get(
      `/behavior/organizations/${orgId}/behavior-insights`
    )
    return response.data
  }
}
