import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import Layout from '../components/Layout'
import {
  uploadDataset,
  processFeatures,
  trainModel,
  getTrainingStatus,
} from '../api/churn'

const ChurnPrediction = () => {
  const { user } = useAuthStore()
  const orgId = user?.id

  // Workflow state
  const [step, setStep] = useState(1) // 1: Upload, 2: Process, 3: Train, 4: Results
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Step 1: Upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [hasChurnLabel, setHasChurnLabel] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  // Step 2: Process state
  const [processingStatus, setProcessingStatus] = useState(null)
  const [featuresReady, setFeaturesReady] = useState(false)

  // Step 3: Train state
  const [modelType, setModelType] = useState('logistic_regression')
  const [trainingStatus, setTrainingStatus] = useState(null)
  const [trainingMetrics, setTrainingMetrics] = useState(null)
  const pollingIntervalRef = useRef(null)

  // Step 1: Handle file upload
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !orgId) {
      setError('Please select a file and ensure you are logged in')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await uploadDataset(orgId, selectedFile, hasChurnLabel)
      setUploadResult(result)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload dataset')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Process features
  const handleProcessFeatures = async () => {
    if (!orgId || !uploadResult?.dataset_id) {
      setError('Organization ID or Dataset ID not found')
      return
    }

    setLoading(true)
    setError(null)
    setProcessingStatus('starting')

    try {
      await processFeatures(orgId, uploadResult.dataset_id)
      setProcessingStatus('processing')

      // Poll for feature processing status (simplified - in real app, you'd poll dataset status)
      setTimeout(() => {
        setProcessingStatus('ready')
        setFeaturesReady(true)
        setStep(3)
      }, 3000) // Simulate processing time
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process features')
      setProcessingStatus(null)
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Train model
  const handleTrainModel = async () => {
    if (!orgId) {
      setError('Organization ID not found')
      return
    }

    setLoading(true)
    setError(null)
    setTrainingStatus({ status: 'training' })

    try {
      await trainModel(orgId, modelType)
      
      // Start polling for training status
      startPollingTrainingStatus()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start training')
      setTrainingStatus(null)
      setLoading(false)
    }
  }

  // Poll training status
  const startPollingTrainingStatus = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    const poll = async () => {
      try {
        const status = await getTrainingStatus(orgId)
        setTrainingStatus(status)

        if (status.status === 'completed') {
          setTrainingMetrics(status)
          setStep(4)
          setLoading(false)
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
          }
        } else if (status.status === 'failed') {
          setError(status.error_message || 'Training failed')
          setLoading(false)
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
          }
        }
      } catch (err) {
        console.error('Error polling training status:', err)
      }
    }

    // Poll immediately, then every 5 seconds
    poll()
    pollingIntervalRef.current = setInterval(poll, 5000)
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Reset workflow
  const handleReset = () => {
    setStep(1)
    setSelectedFile(null)
    setHasChurnLabel(false)
    setUploadResult(null)
    setProcessingStatus(null)
    setFeaturesReady(false)
    setTrainingStatus(null)
    setTrainingMetrics(null)
    setError(null)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
  }

  return (
    <Layout activePage="churn">
      <div>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#1e293b' }}>
            Churn Prediction Model Training
          </h1>
          <p style={{ margin: '0', color: '#64748b', fontSize: '16px' }}>
            Upload your data, process features, and train a churn prediction model
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              color: '#991b1b',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Progress Steps */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '40px',
            position: 'relative',
          }}
        >
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: step >= stepNum ? '#667eea' : '#cbd5e1',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  fontWeight: 'bold',
                }}
              >
                {step > stepNum ? '✓' : stepNum}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: step >= stepNum ? '#667eea' : '#94a3b8',
                  fontWeight: step === stepNum ? '600' : '400',
                }}
              >
                {stepNum === 1 && 'Upload CSV'}
                {stepNum === 2 && 'Process Features'}
                {stepNum === 3 && 'Train Model'}
                {stepNum === 4 && 'View Results'}
              </div>
              {stepNum < 4 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '60%',
                    width: '80%',
                    height: '2px',
                    backgroundColor: step > stepNum ? '#667eea' : '#cbd5e1',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload CSV */}
        {step === 1 && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#1e293b' }}>
              Step 1: Upload Customer Transaction CSV
            </h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>
              Upload a CSV file with customer transaction data. Required columns: customer_id, event_date.
              Optional columns: amount, event_type, churn_label.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{
                  padding: '10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  width: '100%',
                  maxWidth: '400px',
                }}
              />
              {selectedFile && (
                <p style={{ marginTop: '10px', color: '#10b981' }}>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={hasChurnLabel}
                  onChange={(e) => setHasChurnLabel(e.target.checked)}
                />
                <span>CSV includes churn labels (churn_label column)</span>
              </label>
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              style={{
                padding: '12px 24px',
                backgroundColor: selectedFile && !loading ? '#667eea' : '#cbd5e1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedFile && !loading ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {loading ? 'Uploading...' : 'Upload Dataset'}
            </button>
          </div>
        )}

        {/* Step 2: Process Features */}
        {step === 2 && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#1e293b' }}>
              Step 2: Process Features
            </h2>
            {uploadResult && (
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f4ff', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 5px 0' }}>
                  <strong>Dataset ID:</strong> {uploadResult.dataset_id}
                </p>
                <p style={{ margin: '0 0 5px 0' }}>
                  <strong>Rows:</strong> {uploadResult.row_count?.toLocaleString()}
                </p>
                <p style={{ margin: '0' }}>
                  <strong>Status:</strong> {uploadResult.status}
                </p>
              </div>
            )}

            {!featuresReady && (
              <>
                <p style={{ color: '#64748b', marginBottom: '20px' }}>
                  Click the button below to start feature engineering. This will calculate RFM features
                  (Recency, Frequency, Monetary, Engagement scores) for each customer.
                </p>
                <button
                  onClick={handleProcessFeatures}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: !loading ? '#667eea' : '#cbd5e1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: !loading ? 'pointer' : 'not-allowed',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}
                >
                  {loading ? 'Processing...' : 'Process Features'}
                </button>
              </>
            )}

            {processingStatus === 'processing' && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fffbf0', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#f59e0b' }}>
                  ⏳ Processing features in background...
                </p>
              </div>
            )}

            {featuresReady && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#10b981' }}>
                  ✓ Features processed successfully! Ready to train model.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Train Model */}
        {step === 3 && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#1e293b' }}>
              Step 3: Train Model
            </h2>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>
              Select a model type and start training. Training runs in the background and may take several minutes.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                Model Type:
              </label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                disabled={loading}
                style={{
                  padding: '10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  width: '100%',
                  maxWidth: '300px',
                  fontSize: '16px',
                }}
              >
                <option value="logistic_regression">Logistic Regression (Fast, Recommended)</option>
                <option value="random_forest">Random Forest (More Accurate)</option>
                <option value="gradient_boosting">Gradient Boosting (Highest Accuracy)</option>
              </select>
            </div>

            {trainingStatus?.status === 'training' && (
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fffbf0', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#f59e0b' }}>
                  ⏳ Training model in background... This may take a few minutes.
                </p>
                <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                  Checking status every 5 seconds...
                </p>
              </div>
            )}

            <button
              onClick={handleTrainModel}
              disabled={loading || trainingStatus?.status === 'training'}
              style={{
                padding: '12px 24px',
                backgroundColor: !loading && trainingStatus?.status !== 'training' ? '#667eea' : '#cbd5e1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: !loading && trainingStatus?.status !== 'training' ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {loading || trainingStatus?.status === 'training' ? 'Training...' : 'Start Training'}
            </button>
          </div>
        )}

        {/* Step 4: Training Results */}
        {step === 4 && trainingMetrics && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#1e293b' }}>
              Step 4: Training Results
            </h2>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: '#10b981', fontSize: '18px', fontWeight: '600' }}>
                ✓ Model training completed successfully!
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '30px',
              }}
            >
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>Accuracy</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>
                  {(trainingMetrics.accuracy * 100).toFixed(2)}%
                </div>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>Precision</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>
                  {(trainingMetrics.precision * 100).toFixed(2)}%
                </div>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>Recall</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>
                  {(trainingMetrics.recall * 100).toFixed(2)}%
                </div>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>F1 Score</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>
                  {(trainingMetrics.f1_score * 100).toFixed(2)}%
                </div>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #06b6d4' }}>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>ROC-AUC</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>
                  {(trainingMetrics.roc_auc * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1e293b' }}>Training Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <div>
                  <strong>Model Type:</strong> {trainingMetrics.model_type || 'N/A'}
                </div>
                <div>
                  <strong>Training Samples:</strong> {trainingMetrics.training_samples?.toLocaleString() || 'N/A'}
                </div>
                <div>
                  <strong>Churn Rate:</strong> {trainingMetrics.churn_rate ? (trainingMetrics.churn_rate * 100).toFixed(2) + '%' : 'N/A'}
                </div>
                <div>
                  <strong>Trained At:</strong> {trainingMetrics.trained_at ? new Date(trainingMetrics.trained_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              Train Another Model
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ChurnPrediction

