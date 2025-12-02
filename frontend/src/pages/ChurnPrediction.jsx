import { useState, useEffect, useRef } from 'react';
import { churnAPI } from '../api/churn';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/Button';
import Input from '../components/Input';
import Layout from '../components/Layout';

/**
 * ChurnPrediction Component
 *
 * Multi-step workflow for churn prediction:
 * 1. Upload dataset CSV
 * 2. Process features (background task with polling)
 * 3. Train model (background task with polling)
 * 4. View predictions and results
 */
export default function ChurnPrediction() {
  const { user } = useAuthStore();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Upload dataset
  const [uploadFile, setUploadFile] = useState(null);
  const [hasChurnLabel, setHasChurnLabel] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [datasetId, setDatasetId] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);

  // Step 2: Feature processing
  const [featuresStatus, setFeaturesStatus] = useState(null);
  const [featuresPolling, setFeaturesPolling] = useState(false);

  // Step 3: Model training
  const [modelType, setModelType] = useState('logistic_regression');
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [trainingPolling, setTrainingPolling] = useState(false);
  const [modelMetrics, setModelMetrics] = useState(null);

  // Step 4: Predictions
  const [predictionFile, setPredictionFile] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [predictionsPagination, setPredictionsPagination] = useState({ limit: 10, offset: 0 });

  // Error handling
  const [error, setError] = useState(null);

  // Polling intervals refs
  const featuresPollingInterval = useRef(null);
  const trainingPollingInterval = useRef(null);
  const batchPollingInterval = useRef(null);

  // ============================================================================
  // STEP 1: UPLOAD DATASET
  // ============================================================================

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setUploadFile(file);
      setError(null);
    }
  };

  const handleUploadDataset = async () => {
    if (!uploadFile) {
      setError('Please select a CSV file');
      return;
    }

    setUploadLoading(true);
    setError(null);

    try {
      const response = await churnAPI.uploadDataset(user.id, uploadFile, hasChurnLabel);

      if (response.success) {
        setDatasetId(response.dataset_id);
        setDatasetInfo({
          file_url: response.file_url,
          row_count: response.row_count,
          status: response.status
        });

        // Automatically move to step 2
        setCurrentStep(2);

        // Auto-start feature processing
        handleProcessFeatures(response.dataset_id);
      } else {
        setError('Upload failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error uploading dataset');
    } finally {
      setUploadLoading(false);
    }
  };

  // ============================================================================
  // STEP 2: PROCESS FEATURES (Background Task)
  // ============================================================================

  const handleProcessFeatures = async (dsId = datasetId) => {
    if (!dsId) {
      setError('No dataset ID available');
      return;
    }

    setError(null);
    setFeaturesStatus('processing');
    setFeaturesPolling(true);

    try {
      const response = await churnAPI.processFeatures(user.id, dsId);

      if (response.success) {
        // Start polling for completion
        startFeaturesPolling();
      } else {
        setError('Failed to start feature processing');
        setFeaturesStatus('error');
        setFeaturesPolling(false);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error processing features');
      setFeaturesStatus('error');
      setFeaturesPolling(false);
    }
  };

  const startFeaturesPolling = () => {
    // Poll every 3 seconds to check dataset status
    // In a real implementation, you'd query a dataset status endpoint
    // For now, we'll simulate with a timeout and move to next step

    let pollCount = 0;
    const maxPolls = 20; // Max 1 minute of polling

    featuresPollingInterval.current = setInterval(() => {
      pollCount++;

      // Simulate checking dataset status
      // In production, call an endpoint like: churnAPI.getDatasetStatus(orgId, datasetId)

      if (pollCount >= 5) {
        // Assume features are ready after ~15 seconds
        clearInterval(featuresPollingInterval.current);
        setFeaturesStatus('ready');
        setFeaturesPolling(false);

        // Automatically move to step 3
        setCurrentStep(3);
      } else if (pollCount >= maxPolls) {
        clearInterval(featuresPollingInterval.current);
        setFeaturesStatus('timeout');
        setFeaturesPolling(false);
        setError('Feature processing timeout. Please try again.');
      }
    }, 3000);
  };

  // ============================================================================
  // STEP 3: TRAIN MODEL (Background Task)
  // ============================================================================

  const handleTrainModel = async () => {
    setError(null);
    setTrainingStatus('training');
    setTrainingPolling(true);

    try {
      const response = await churnAPI.trainModel(user.id, modelType);

      if (response.success) {
        // Start polling for training completion
        startTrainingPolling();
      } else {
        setError('Failed to start model training');
        setTrainingStatus('failed');
        setTrainingPolling(false);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error training model');
      setTrainingStatus('failed');
      setTrainingPolling(false);
    }
  };

  const startTrainingPolling = () => {
    // Poll training status every 5 seconds
    trainingPollingInterval.current = setInterval(async () => {
      try {
        const status = await churnAPI.getTrainingStatus(user.id);

        setTrainingStatus(status.status);

        if (status.status === 'completed') {
          clearInterval(trainingPollingInterval.current);
          setTrainingPolling(false);
          setModelMetrics({
            accuracy: status.accuracy,
            precision: status.precision,
            recall: status.recall,
            f1_score: status.f1_score,
            roc_auc: status.roc_auc,
            training_samples: status.training_samples,
            churn_rate: status.churn_rate,
            trained_at: status.trained_at
          });

          // Automatically move to step 4
          setCurrentStep(4);

          // Load existing batches
          loadBatches();
        } else if (status.status === 'failed') {
          clearInterval(trainingPollingInterval.current);
          setTrainingPolling(false);
          setError(status.error_message || 'Model training failed');
        }
      } catch (err) {
        console.error('Error polling training status:', err);
        // Continue polling on error
      }
    }, 5000);
  };

  // ============================================================================
  // STEP 4: BULK PREDICTIONS
  // ============================================================================

  const loadBatches = async () => {
    try {
      const response = await churnAPI.getPredictionBatches(user.id, 20, 0);
      setBatches(response.batches || []);
    } catch (err) {
      console.error('Error loading batches:', err);
    }
  };

  const handlePredictionFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setPredictionFile(file);
      setError(null);
    }
  };

  const handleBulkPredict = async () => {
    if (!predictionFile) {
      setError('Please select a CSV file for predictions');
      return;
    }

    setPredictionLoading(true);
    setError(null);

    try {
      const response = await churnAPI.predictBulk(
        user.id,
        predictionFile,
        batchName || `Batch ${new Date().toLocaleString()}`
      );

      if (response.success) {
        setSelectedBatch(response.batch_id);

        // Start polling for batch completion
        startBatchPolling(response.batch_id);

        // Reset form
        setPredictionFile(null);
        setBatchName('');

        // Reload batches list
        loadBatches();
      } else {
        setError('Failed to start bulk prediction');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error processing bulk predictions');
    } finally {
      setPredictionLoading(false);
    }
  };

  const startBatchPolling = (batchId) => {
    batchPollingInterval.current = setInterval(async () => {
      try {
        const batchData = await churnAPI.getPredictionBatch(user.id, batchId);

        setBatchDetails(batchData);

        if (batchData.status === 'completed') {
          clearInterval(batchPollingInterval.current);

          // Load predictions for this batch
          loadBatchPredictions(batchId);
        } else if (batchData.status === 'failed') {
          clearInterval(batchPollingInterval.current);
          setError(batchData.error_message || 'Batch prediction failed');
        }
      } catch (err) {
        console.error('Error polling batch status:', err);
      }
    }, 3000);
  };

  const loadBatchPredictions = async (batchId, limit = 10, offset = 0) => {
    try {
      const response = await churnAPI.getBatchPredictions(
        user.id,
        batchId,
        limit,
        offset
      );

      setPredictions(response.predictions || []);
      setPredictionsPagination({ limit, offset, total: response.total });
    } catch (err) {
      console.error('Error loading batch predictions:', err);
    }
  };

  const handleSelectBatch = async (batchId) => {
    setSelectedBatch(batchId);

    try {
      const batchData = await churnAPI.getPredictionBatch(user.id, batchId);
      setBatchDetails(batchData);

      if (batchData.status === 'completed') {
        loadBatchPredictions(batchId);
      } else if (batchData.status === 'processing') {
        // Start polling if still processing
        startBatchPolling(batchId);
      }
    } catch (err) {
      setError('Error loading batch details');
    }
  };

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    // Load batches on mount if we're on step 4
    if (currentStep === 4) {
      loadBatches();
    }

    // Cleanup intervals on unmount
    return () => {
      if (featuresPollingInterval.current) {
        clearInterval(featuresPollingInterval.current);
      }
      if (trainingPollingInterval.current) {
        clearInterval(trainingPollingInterval.current);
      }
      if (batchPollingInterval.current) {
        clearInterval(batchPollingInterval.current);
      }
    };
  }, [currentStep]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Layout activePage="churn">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Churn Prediction v2
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload customer data, train models, and predict churn risk
          </p>
        </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg">
          <div className="flex items-center">
            <span className="text-xl mr-2">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
                <div className="ml-3">
                  <div className={`font-medium ${
                    step <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    {step === 1 && 'Upload Dataset'}
                    {step === 2 && 'Process Features'}
                    {step === 3 && 'Train Model'}
                    {step === 4 && 'Predictions'}
                  </div>
                </div>
              </div>
              {step < 4 && (
                <div className={`flex-1 h-1 mx-4 ${
                  step < currentStep ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">

        {/* STEP 1: Upload Dataset */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Step 1: Upload Customer Dataset
            </h2>
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Upload a CSV file with customer transaction data. Required columns:
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mx-1">customer_id</code>,
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mx-1">event_date</code>
              </p>
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>⚠️ Important:</strong> If your CSV does NOT have a <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">churn_label</code> column,
                  you MUST check the checkbox below anyway to enable V2 features. The system will auto-generate churn labels based on customer recency.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-900 dark:text-white
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900 dark:file:text-blue-300
                    dark:hover:file:bg-blue-800"
                />
                {uploadFile && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ Selected: {uploadFile.name}
                  </p>
                )}
              </div>

              <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <input
                  type="checkbox"
                  id="hasChurnLabel"
                  checked={hasChurnLabel}
                  onChange={(e) => setHasChurnLabel(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="hasChurnLabel" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  <strong>Check this to use V2 Enhanced Features</strong>
                  <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                    (Required for optimal model performance. Labels will be auto-generated if not in CSV)
                  </span>
                </label>
              </div>

              <Button
                onClick={handleUploadDataset}
                disabled={!uploadFile || uploadLoading}
                className="w-full"
              >
                {uploadLoading ? 'Uploading...' : 'Upload Dataset'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Process Features */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Step 2: Processing Features
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Engineering features from your customer data...
            </p>

            {datasetInfo && (
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Dataset Info</h3>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  Rows: {datasetInfo.row_count} | Status: {datasetInfo.status}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center py-12">
              {featuresPolling ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Processing features...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    This may take a minute
                  </p>
                </div>
              ) : featuresStatus === 'ready' ? (
                <div className="text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-lg font-medium text-green-600 dark:text-green-400">
                    Features Ready!
                  </p>
                </div>
              ) : featuresStatus === 'error' ? (
                <div className="text-center">
                  <div className="text-6xl mb-4">❌</div>
                  <p className="text-lg font-medium text-red-600 dark:text-red-400">
                    Feature Processing Failed
                  </p>
                  <Button onClick={() => handleProcessFeatures()} className="mt-4">
                    Retry
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* STEP 3: Train Model */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Step 3: Train Churn Prediction Model
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Select a model type and start training
            </p>

            {!trainingPolling && !modelMetrics && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Model Type
                  </label>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="logistic_regression">Logistic Regression (Fast, Interpretable)</option>
                    <option value="random_forest">Random Forest (Balanced, Robust)</option>
                    <option value="gradient_boosting">Gradient Boosting (High Accuracy)</option>
                  </select>
                </div>

                <Button onClick={handleTrainModel} className="w-full">
                  Start Training
                </Button>
              </div>
            )}

            {trainingPolling && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Training Model...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Status: {trainingStatus}
                  </p>
                </div>
              </div>
            )}

            {modelMetrics && (
              <div>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🎉</div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    Model Training Complete!
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {(modelMetrics.accuracy * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Precision</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {(modelMetrics.precision * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Recall</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {(modelMetrics.recall * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">F1 Score</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {(modelMetrics.f1_score * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">ROC AUC</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {(modelMetrics.roc_auc * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Training Samples</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {modelMetrics.training_samples}
                    </p>
                  </div>
                </div>

                <Button onClick={() => setCurrentStep(4)} className="w-full">
                  Continue to Predictions
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Predictions */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Step 4: Generate Predictions
            </h2>

            {/* Upload new prediction batch */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Upload New Batch
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Batch Name (Optional)
                  </label>
                  <Input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g., Q4 2024 Customers"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handlePredictionFileSelect}
                    className="block w-full text-sm text-gray-900 dark:text-white
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      dark:file:bg-blue-900 dark:file:text-blue-300
                      dark:hover:file:bg-blue-800"
                  />
                  {predictionFile && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                      ✓ Selected: {predictionFile.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleBulkPredict}
                  disabled={!predictionFile || predictionLoading}
                  className="w-full"
                >
                  {predictionLoading ? 'Processing...' : 'Generate Predictions'}
                </Button>
              </div>
            </div>

            {/* Existing batches */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Previous Prediction Batches
              </h3>

              {batches.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No prediction batches yet. Upload a CSV to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div
                      key={batch.batch_id}
                      onClick={() => handleSelectBatch(batch.batch_id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedBatch === batch.batch_id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {batch.batch_name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {batch.total_customers} customers | Status:
                            <span className={`ml-1 font-medium ${
                              batch.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                              batch.status === 'processing' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {batch.status}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          {batch.avg_churn_probability && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Avg: {(parseFloat(batch.avg_churn_probability) * 100).toFixed(1)}%
                            </p>
                          )}
                          {batch.output_file_url && (
                            <a
                              href={batch.output_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Download CSV
                            </a>
                          )}
                        </div>
                      </div>

                      {batch.risk_distribution && (
                        <div className="mt-3 flex gap-2">
                          {Object.entries(batch.risk_distribution).map(([risk, count]) => (
                            <div key={risk} className="text-xs">
                              <span className={`px-2 py-1 rounded ${
                                risk === 'Low' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                risk === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                risk === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {risk}: {count}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Batch Details */}
            {batchDetails && selectedBatch && (
              <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Batch Details: {batchDetails.batch_name}
                </h3>

                {batchDetails.status === 'processing' && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Processing predictions...</p>
                  </div>
                )}

                {batchDetails.status === 'completed' && predictions.length > 0 && (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Customer ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Churn Probability
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Risk Segment
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Predicted At
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {predictions.map((pred, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {pred.customer_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                {(parseFloat(pred.churn_probability) * 100).toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                  pred.risk_segment === 'Low' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                  pred.risk_segment === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  pred.risk_segment === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {pred.risk_segment}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                {new Date(pred.predicted_at).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {predictionsPagination.total > predictionsPagination.limit && (
                      <div className="mt-4 flex justify-between items-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Showing {predictionsPagination.offset + 1} - {Math.min(predictionsPagination.offset + predictionsPagination.limit, predictionsPagination.total)} of {predictionsPagination.total}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => loadBatchPredictions(
                              selectedBatch,
                              predictionsPagination.limit,
                              Math.max(0, predictionsPagination.offset - predictionsPagination.limit)
                            )}
                            disabled={predictionsPagination.offset === 0}
                          >
                            Previous
                          </Button>
                          <Button
                            onClick={() => loadBatchPredictions(
                              selectedBatch,
                              predictionsPagination.limit,
                              predictionsPagination.offset + predictionsPagination.limit
                            )}
                            disabled={predictionsPagination.offset + predictionsPagination.limit >= predictionsPagination.total}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation between steps */}
      {currentStep > 1 && currentStep < 4 && (
        <div className="mt-6 flex justify-between">
          <Button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="bg-gray-500 hover:bg-gray-600"
          >
            ← Previous Step
          </Button>
          {currentStep === 3 && modelMetrics && (
            <Button onClick={() => setCurrentStep(4)}>
              Skip to Predictions →
            </Button>
          )}
        </div>
      )}
      </div>
    </Layout>
  );
}
