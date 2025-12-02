import apiClient from './client'

/**
 * Churn Prediction API Client (V2)
 * Handles all churn prediction related API calls using churnV2 endpoints
 */

/**
 * Upload CSV dataset to Supabase storage
 * @param {string} orgId - Organization UUID
 * @param {File} file - CSV file to upload
 * @param {boolean} hasChurnLabel - Whether CSV includes churn labels
 * @returns {Promise} Upload result with dataset_id, file_url, status
 */
export const uploadDataset = async (orgId, file, hasChurnLabel = false) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('has_churn_label', hasChurnLabel)

  const response = await apiClient.post(
    `/churn/v2/organizations/${orgId}/upload-dataset`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return response.data
}

/**
 * Process features from active dataset (background task)
 * @param {string} orgId - Organization UUID
 * @param {string} datasetId - Dataset UUID from upload
 * @returns {Promise} Status message
 */
export const processFeatures = async (orgId, datasetId) => {
  const response = await apiClient.post(
    `/churn/v2/organizations/${orgId}/datasets/${datasetId}/process-features`
  )
  return response.data
}

/**
 * Train churn prediction model (background task)
 * @param {string} orgId - Organization UUID
 * @param {string} modelType - Model type: 'logistic_regression', 'random_forest', or 'gradient_boosting'
 * @returns {Promise} Training job status
 */
export const trainModel = async (orgId, modelType = 'logistic_regression') => {
  const response = await apiClient.post(
    `/churn/v2/organizations/${orgId}/train?model_type=${modelType}`
  )
  return response.data
}

/**
 * Get training status and metrics
 * @param {string} orgId - Organization UUID
 * @returns {Promise} Training status with metrics if completed
 */
export const getTrainingStatus = async (orgId) => {
  const response = await apiClient.get(
    `/churn/v2/organizations/${orgId}/training-status`
  )
  return response.data
}

/**
 * Get churn prediction for a single customer
 * @param {string} orgId - Organization UUID
 * @param {Object} customerData - Customer data with transactions
 * @param {string} customerData.customer_id - Customer identifier
 * @param {Array} customerData.transactions - Array of transaction objects
 * @returns {Promise} Prediction result with churn_probability and risk_segment
 */
export const predictChurn = async (orgId, customerData) => {
  const response = await apiClient.post(
    `/churn/v2/organizations/${orgId}/predict`,
    customerData
  )
  return response.data
}

/**
 * Bulk prediction: Upload CSV and get predictions for all customers (background task)
 * @param {string} orgId - Organization UUID
 * @param {File} file - CSV file with customer transaction data
 * @param {string} batchName - Optional name for this batch
 * @returns {Promise} Batch info with batch_id and status
 */
export const predictBulk = async (orgId, file, batchName = null) => {
  const formData = new FormData()
  formData.append('file', file)
  if (batchName) {
    formData.append('batch_name', batchName)
  }

  const response = await apiClient.post(
    `/churn/v2/organizations/${orgId}/predict-bulk`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return response.data
}

/**
 * Get status and results of a prediction batch
 * @param {string} orgId - Organization UUID
 * @param {string} batchId - Batch UUID
 * @returns {Promise} Batch status with results
 */
export const getPredictionBatch = async (orgId, batchId) => {
  const response = await apiClient.get(
    `/churn/v2/organizations/${orgId}/prediction-batches/${batchId}`
  )
  return response.data
}

/**
 * List all prediction batches for an organization
 * @param {string} orgId - Organization UUID
 * @param {number} limit - Number of batches to return (default: 20)
 * @param {number} offset - Offset for pagination (default: 0)
 * @returns {Promise} List of batches with summary info
 */
export const getPredictionBatches = async (orgId, limit = 20, offset = 0) => {
  const response = await apiClient.get(
    `/churn/v2/organizations/${orgId}/prediction-batches`,
    {
      params: { limit, offset },
    }
  )
  return response.data
}

/**
 * Get individual customer predictions from a batch
 * @param {string} orgId - Organization UUID
 * @param {string} batchId - Batch UUID
 * @param {number} limit - Number of predictions to return (default: 100)
 * @param {number} offset - Offset for pagination (default: 0)
 * @returns {Promise} List of predictions
 */
export const getBatchPredictions = async (orgId, batchId, limit = 100, offset = 0) => {
  const response = await apiClient.get(
    `/churn/v2/organizations/${orgId}/prediction-batches/${batchId}/predictions`,
    {
      params: { limit, offset },
    }
  )
  return response.data
}

