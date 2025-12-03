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
  const [hasChurnLabel] = useState(true); // Always use enhanced features (V2)
  const [uploadLoading, setUploadLoading] = useState(false);
  const [datasetId, setDatasetId] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);

  // Step 2: Feature processing
  const [featuresStatus, setFeaturesStatus] = useState(null);
  const [featuresPolling, setFeaturesPolling] = useState(false);

  // Step 3: Model training
  const [modelType] = useState('logistic_regression'); // Always use logistic regression
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

  // Step 5: Segmentation
  const [segmentationStatus, setSegmentationStatus] = useState(null);
  const [segmentationResults, setSegmentationResults] = useState(null);
  const [segmentationLoading, setSegmentationLoading] = useState(false);

  // Step 6: Behavior Analysis
  const [behaviorStatus, setBehaviorStatus] = useState(null);
  const [behaviorResults, setBehaviorResults] = useState(null);
  const [behaviorLoading, setBehaviorLoading] = useState(false);
  const [behaviorLimit, setBehaviorLimit] = useState('');

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
          
          // Move to step 5 (segmentation)
          setCurrentStep(5);
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
  // STEP 5: SEGMENTATION
  // ============================================================================

  const handleSegmentCustomers = async (batchId = selectedBatch) => {
    setSegmentationLoading(true);
    setSegmentationStatus('processing');
    setError(null);

    try {
      const response = await churnAPI.segmentCustomers(user.id, batchId);

      if (response.success) {
        setSegmentationStatus('completed');
        setSegmentationResults(response);

        // Move to step 6 (behavior analysis)
        setCurrentStep(6);
      } else {
        setSegmentationStatus('failed');
        setError('Segmentation failed');
      }
    } catch (err) {
      setSegmentationStatus('failed');
      setError(err.response?.data?.detail || 'Error segmenting customers');
    } finally {
      setSegmentationLoading(false);
    }
  };

  // ============================================================================
  // STEP 6: BEHAVIOR ANALYSIS
  // ============================================================================

  const handleAnalyzeBehaviors = async () => {
    setBehaviorLoading(true);
    setBehaviorStatus('processing');
    setError(null);

    try {
      const limit = behaviorLimit ? parseInt(behaviorLimit) : null;
      const response = await churnAPI.analyzeBehaviors(user.id, limit);

      if (response.success) {
        setBehaviorStatus('completed');
        setBehaviorResults(response);
      } else {
        setBehaviorStatus('failed');
        setError('Behavior analysis failed');
      }
    } catch (err) {
      setBehaviorStatus('failed');
      setError(err.response?.data?.detail || 'Error analyzing behaviors');
    } finally {
      setBehaviorLoading(false);
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
    
    // Auto-start segmentation when entering step 5
    if (currentStep === 5 && !segmentationLoading && !segmentationResults) {
      handleSegmentCustomers(selectedBatch);
    }
    
    // Don't auto-start behavior analysis - let user set limit first
    
    // Load predictions when entering step 6 (for the table)
    if (currentStep === 6 && selectedBatch && predictions.length === 0) {
      loadBatchPredictions(selectedBatch);
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
            Churn Prediction
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
          {[1, 2, 3, 4, 5, 6].map((step) => (
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
                  <div className={`font-medium text-sm ${
                    step <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    {step === 1 && 'Upload'}
                    {step === 2 && 'Features'}
                    {step === 3 && 'Train'}
                    {step === 4 && 'Predict'}
                    {step === 5 && 'Segment'}
                    {step === 6 && 'Analyze'}
                  </div>
                </div>
              </div>
              {step < 6 && (
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
                Upload a CSV file with customer transaction data in the following format:
              </p>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-300 dark:border-gray-600 mb-3">
                <code className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                  customer_id,event_date,amount,event_type,churn_label
                </code>
              </div>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Required columns:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">customer_id</code> - Unique customer identifier</li>
                  <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">event_date</code> - Transaction/event date (YYYY-MM-DD)</li>
                  <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">amount</code> - Transaction amount (optional, can be empty)</li>
                  <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">event_type</code> - Type of event (optional, can be empty)</li>
                  <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">churn_label</code> - 0 or 1 (optional - will be auto-generated if empty)</li>
                </ul>
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
              Train the model to predict customer churn using advanced machine learning
            </p>

            {!trainingPolling && !modelMetrics && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>🤖 Auto-Optimized Training:</strong> Using enhanced V2 features with automatic model selection and hyperparameter tuning for best accuracy.
                  </p>
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
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upload customer data CSV for bulk churn prediction
            </p>

            {/* Upload new prediction batch */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Upload Prediction Batch
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
                  {predictionLoading ? 'Uploading...' : 'Generate Predictions'}
                </Button>
              </div>
            </div>

            {/* Show processing status if batch is being processed */}
            {batchDetails && batchDetails.status === 'processing' && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Processing Predictions...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Batch: {batchDetails.batch_name}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Segmentation */}
        {currentStep === 5 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Step 5: Customer Segmentation
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Segmenting customers into business categories based on RFM and churn predictions
            </p>

            {segmentationLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Segmenting Customers...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    This may take a few moments
                  </p>
                </div>
              </div>
            )}

            {segmentationStatus === 'completed' && segmentationResults && (
              <div>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    Segmentation Complete!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {segmentationResults.total_customers}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Segmented</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {segmentationResults.segmented}
                    </p>
                  </div>
                </div>

                <Button onClick={() => setCurrentStep(6)} className="w-full">
                  Continue to Behavior Analysis
                </Button>
              </div>
            )}

            {segmentationStatus === 'failed' && (
              <div className="text-center">
                <div className="text-6xl mb-4">❌</div>
                <p className="text-lg font-medium text-red-600 dark:text-red-400">
                  Segmentation Failed
                </p>
                <Button onClick={() => handleSegmentCustomers(selectedBatch)} className="mt-4">
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Behavior Analysis */}
        {currentStep === 6 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Step 6: Behavior Analysis
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Analyzing customer behaviors and generating retention recommendations
            </p>

            {!behaviorLoading && !behaviorResults && (
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Limit (Optional - Leave empty to analyze all customers)
                  </label>
                  <Input
                    type="number"
                    value={behaviorLimit}
                    onChange={(e) => setBehaviorLimit(e.target.value)}
                    placeholder="e.g., 100"
                    min="1"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    💡 Tip: Start with a smaller number (e.g., 50-100) for faster testing
                  </p>
                </div>
                <Button onClick={handleAnalyzeBehaviors} className="w-full">
                  Start Behavior Analysis
                </Button>
              </div>
            )}

            {behaviorLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Analyzing Behaviors...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    This may take a few moments
                  </p>
                </div>
              </div>
            )}

            {behaviorStatus === 'completed' && behaviorResults && (
              <div>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🎉</div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    Pipeline Complete!
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    All customers have been predicted, segmented, and analyzed
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {batchDetails?.total_customers || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Segmented</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {segmentationResults?.segmented || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Analyzed</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {behaviorResults.analyzed}
                    </p>
                  </div>
                </div>

                {/* Full Results Table */}
                {predictions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      Complete Customer Analysis
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Customer ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Churn %
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Risk
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Segment
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                              Recommendations
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {predictions.map((pred, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {pred.customer_id}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                {(parseFloat(pred.churn_probability) * 100).toFixed(1)}%
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                  pred.risk_segment === 'Low' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                  pred.risk_segment === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  pred.risk_segment === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {pred.risk_segment}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {pred.segment || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-md">
                                {pred.recommendations && pred.recommendations.length > 0 ? (
                                  <ul className="list-disc list-inside text-xs">
                                    {pred.recommendations.slice(0, 2).map((rec, i) => (
                                      <li key={i}>{rec}</li>
                                    ))}
                                    {pred.recommendations.length > 2 && (
                                      <li className="text-blue-600 dark:text-blue-400">+{pred.recommendations.length - 2} more</li>
                                    )}
                                  </ul>
                                ) : 'N/A'}
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

            {behaviorStatus === 'failed' && (
              <div className="text-center">
                <div className="text-6xl mb-4">❌</div>
                <p className="text-lg font-medium text-red-600 dark:text-red-400">
                  Behavior Analysis Failed
                </p>
                <Button onClick={handleAnalyzeBehaviors} className="mt-4">
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation between steps */}
      {currentStep > 1 && currentStep !== 4 && (
        <div className="mt-6 flex justify-between">
          <Button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="bg-gray-500 hover:bg-gray-600"
          >
            ← Previous Step
          </Button>
        </div>
      )}
      </div>
    </Layout>
  );
}
