import { useState, useEffect, useRef } from 'react';
import { churnAPI } from '../api/churn';
import { useAuthStore } from '../stores/authStore';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import {
  HiChartBar,
  HiArrowLeft,
  HiDownload,
  HiSearch,
  HiSparkles,
  HiLightBulb,
  HiCheckCircle,
  HiExclamationCircle
} from 'react-icons/hi';
import { FiFileText } from 'react-icons/fi';

/**
 * Predictions Page
 *
 * Dedicated page for:
 * - Viewing all prediction batches
 * - Uploading new prediction CSVs
 * - Viewing batch details and results
 * - Downloading prediction results
 */
export default function Predictions() {
  const { user } = useAuthStore();

  // Batch list state
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 });

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Selected batch state
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [predictionsPagination, setPredictionsPagination] = useState({ limit: 10, offset: 0, total: 0 });

  // LLM Analysis state
  const [expandedRow, setExpandedRow] = useState(null);
  const [analysisData, setAnalysisData] = useState({});
  const [loadingAnalysis, setLoadingAnalysis] = useState({});

  // Polling
  const batchPollingInterval = useRef(null);

  // Error handling
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load batches on mount
  useEffect(() => {
    loadBatches();

    // Cleanup polling on unmount
    return () => {
      if (batchPollingInterval.current) {
        clearInterval(batchPollingInterval.current);
      }
    };
  }, []);

  // Load all prediction batches
  const loadBatches = async (limit = 20, offset = 0) => {
    try {
      setLoading(true);
      const response = await churnAPI.getPredictionBatches(user.id, limit, offset);
      setBatches(response.batches || []);
      setPagination({
        limit,
        offset,
        total: response.total || 0
      });
    } catch (err) {
      setError('Failed to load prediction batches');
      console.error('Error loading batches:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
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

  // Upload new prediction batch
  const handleBulkUpload = async () => {
    if (!uploadFile) {
      setError('Please select a CSV file');
      return;
    }

    setUploadLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await churnAPI.predictBulk(
        user.id,
        uploadFile,
        batchName || `Batch ${new Date().toLocaleString()}`
      );

      if (response.success) {
        setSuccess(`Batch "${response.batch_name}" uploaded successfully! Processing predictions...`);
        setSelectedBatch(response.batch_id);

        // Reset upload form
        setUploadFile(null);
        setBatchName('');
        setShowUploadModal(false);

        // Reload batches list
        loadBatches();

        // Start polling for the new batch
        startBatchPolling(response.batch_id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error uploading prediction batch');
    } finally {
      setUploadLoading(false);
    }
  };

  // Start polling for batch completion
  const startBatchPolling = (batchId) => {
    // Clear any existing polling
    if (batchPollingInterval.current) {
      clearInterval(batchPollingInterval.current);
    }

    batchPollingInterval.current = setInterval(async () => {
      try {
        const batchData = await churnAPI.getPredictionBatch(user.id, batchId);
        setBatchDetails(batchData);

        // Update batch in list
        setBatches(prev => prev.map(b =>
          b.batch_id === batchId ? { ...b, status: batchData.status } : b
        ));

        if (batchData.status === 'completed') {
          clearInterval(batchPollingInterval.current);
          setSuccess('Batch processing completed!');

          // Load predictions for this batch
          loadBatchPredictions(batchId);
        } else if (batchData.status === 'failed') {
          clearInterval(batchPollingInterval.current);
          setError(batchData.error_message || 'Batch processing failed');
        }
      } catch (err) {
        console.error('Error polling batch status:', err);
      }
    }, 3000);
  };

  // Load predictions for a specific batch
  const loadBatchPredictions = async (batchId, limit = 10, offset = 0) => {
    try {
      const response = await churnAPI.getBatchPredictions(
        user.id,
        batchId,
        limit,
        offset
      );

      setPredictions(response.predictions || []);
      setPredictionsPagination({
        limit,
        offset,
        total: response.total || 0
      });
    } catch (err) {
      console.error('Error loading batch predictions:', err);
      setError('Failed to load predictions');
    }
  };

  // Handle batch selection
  const handleSelectBatch = async (batchId) => {
    setSelectedBatch(batchId);
    setError(null);
    setSuccess(null);

    try {
      const batchData = await churnAPI.getPredictionBatch(user.id, batchId);
      setBatchDetails(batchData);

      if (batchData.status === 'completed') {
        loadBatchPredictions(batchId);
      } else if (batchData.status === 'processing') {
        startBatchPolling(batchId);
      }
    } catch (err) {
      setError('Error loading batch details');
    }
  };

  // Pagination handlers
  const handleNextPage = () => {
    const nextOffset = pagination.offset + pagination.limit;
    if (nextOffset < pagination.total) {
      loadBatches(pagination.limit, nextOffset);
    }
  };

  const handlePrevPage = () => {
    const prevOffset = Math.max(0, pagination.offset - pagination.limit);
    loadBatches(pagination.limit, prevOffset);
  };

  const handlePredictionNextPage = () => {
    const nextOffset = predictionsPagination.offset + predictionsPagination.limit;
    if (nextOffset < predictionsPagination.total) {
      loadBatchPredictions(selectedBatch, predictionsPagination.limit, nextOffset);
    }
  };

  const handlePredictionPrevPage = () => {
    const prevOffset = Math.max(0, predictionsPagination.offset - predictionsPagination.limit);
    loadBatchPredictions(selectedBatch, predictionsPagination.limit, prevOffset);
  };

  // Handle LLM analysis toggle
  const handleAnalyzeChurn = async (customerId, churnProbability, riskLevel) => {
    // If row is already expanded, just collapse it
    if (expandedRow === customerId) {
      setExpandedRow(null);
      return;
    }

    // If we already have the analysis, just expand the row
    if (analysisData[customerId]) {
      setExpandedRow(customerId);
      return;
    }

    // Otherwise, fetch new analysis
    setLoadingAnalysis(prev => ({ ...prev, [customerId]: true }));
    setExpandedRow(customerId);

    try {
      const result = await churnAPI.analyzeChurnReason(
        user.id,
        customerId,
        churnProbability,
        riskLevel
      );

      setAnalysisData(prev => ({ ...prev, [customerId]: result }));
    } catch (err) {
      console.error('Error analyzing churn reason:', err);
      setError('Failed to analyze churn reason');
      setExpandedRow(null);
    } finally {
      setLoadingAnalysis(prev => ({ ...prev, [customerId]: false }));
    }
  };

  return (
    <Layout activePage="predictions">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Prediction Batches
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your churn prediction batches
            </p>
          </div>
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            + New Prediction Batch
          </Button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <HiCheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <HiExclamationCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Batches List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                All Batches ({pagination.total})
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-4">Loading batches...</p>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
                    <HiChartBar className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">
                    No prediction batches yet
                  </p>
                  <Button onClick={() => setShowUploadModal(true)} className="text-sm">
                    Upload Your First Batch
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <div
                      key={batch.batch_id}
                      onClick={() => handleSelectBatch(batch.batch_id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${
                        selectedBatch === batch.batch_id
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                          {batch.batch_name}
                        </h3>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                          batch.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          batch.status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {batch.status}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          <span className="font-semibold">{batch.total_customers}</span> customers
                        </p>
                        {batch.avg_churn_probability && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Avg Risk: <span className="font-semibold text-orange-600 dark:text-orange-400">{(parseFloat(batch.avg_churn_probability) * 100).toFixed(1)}%</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 pt-1 border-t border-gray-200 dark:border-gray-700">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {pagination.total > pagination.limit && (
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={handlePrevPage}
                        disabled={pagination.offset === 0}
                        className="text-sm"
                      >
                        ← Previous
                      </Button>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
                      </span>
                      <Button
                        onClick={handleNextPage}
                        disabled={pagination.offset + pagination.limit >= pagination.total}
                        className="text-sm"
                      >
                        Next →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Batch Details */}
          <div className="lg:col-span-2">
            {!selectedBatch ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
                <div className="inline-flex p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 shadow-lg">
                  <HiArrowLeft className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Select a Batch
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Click on a batch from the list to view details and predictions
                </p>
              </div>
            ) : !batchDetails ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading batch details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Batch Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {batchDetails.batch_name}
                    </h2>
                    {batchDetails.output_file_url && (
                      <a
                        href={batchDetails.output_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
                      >
                        <HiDownload className="w-5 h-5" />
                        Download CSV
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-5 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium mb-2">Total Customers</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {batchDetails.total_customers}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-5 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium mb-2">Avg Churn Risk</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {batchDetails.avg_churn_probability
                          ? `${(parseFloat(batchDetails.avg_churn_probability) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-5 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
                      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium mb-2">Status</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400 capitalize">
                        {batchDetails.status}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-5 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm">
                      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium mb-2">Created</p>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {new Date(batchDetails.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Risk Distribution */}
                  {batchDetails.risk_distribution && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Risk Distribution
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(batchDetails.risk_distribution).map(([risk, count]) => (
                          <div key={risk} className={`p-3 rounded-lg text-center ${
                            risk === 'Low' ? 'bg-green-100 dark:bg-green-900/30' :
                            risk === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                            risk === 'High' ? 'bg-orange-100 dark:bg-orange-900/30' :
                            'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            <p className={`text-xs font-medium ${
                              risk === 'Low' ? 'text-green-800 dark:text-green-400' :
                              risk === 'Medium' ? 'text-yellow-800 dark:text-yellow-400' :
                              risk === 'High' ? 'text-orange-800 dark:text-orange-400' :
                              'text-red-800 dark:text-red-400'
                            }`}>
                              {risk} Risk
                            </p>
                            <p className={`text-2xl font-bold ${
                              risk === 'Low' ? 'text-green-900 dark:text-green-300' :
                              risk === 'Medium' ? 'text-yellow-900 dark:text-yellow-300' :
                              risk === 'High' ? 'text-orange-900 dark:text-orange-300' :
                              'text-red-900 dark:text-red-300'
                            }`}>
                              {count}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Predictions Table */}
                {batchDetails.status === 'processing' ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Processing Predictions...
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      This may take a few moments. Results will appear automatically.
                    </p>
                  </div>
                ) : predictions.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      Customer Predictions
                    </h3>

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
                              Risk Level
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Predicted At
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {predictions.map((pred, idx) => (
                            <>
                              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {pred.customer_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                  <div className="flex items-center">
                                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                      <div
                                        className={`h-2 rounded-full ${
                                          parseFloat(pred.churn_probability) > 0.7 ? 'bg-red-600' :
                                          parseFloat(pred.churn_probability) > 0.5 ? 'bg-orange-500' :
                                          parseFloat(pred.churn_probability) > 0.3 ? 'bg-yellow-500' :
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${parseFloat(pred.churn_probability) * 100}%` }}
                                      ></div>
                                    </div>
                                    {(parseFloat(pred.churn_probability) * 100).toFixed(1)}%
                                  </div>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <button
                                    onClick={() => handleAnalyzeChurn(
                                      pred.customer_id,
                                      parseFloat(pred.churn_probability),
                                      pred.risk_segment
                                    )}
                                    disabled={loadingAnalysis[pred.customer_id]}
                                    className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg text-xs font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                                  >
                                    {loadingAnalysis[pred.customer_id] ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                        <span>Loading...</span>
                                      </>
                                    ) : expandedRow === pred.customer_id ? (
                                      'Hide'
                                    ) : (
                                      <>
                                        <HiSearch className="w-3.5 h-3.5" />
                                        <span>Analyze</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>

                              {/* Expandable Analysis Row */}
                              {expandedRow === pred.customer_id && (
                                <tr key={`${idx}-expanded`} className="bg-blue-50 dark:bg-blue-900/20">
                                  <td colSpan="5" className="px-6 py-4">
                                    {loadingAnalysis[pred.customer_id] ? (
                                      <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                                        <span className="text-gray-600 dark:text-gray-400">Analyzing churn patterns...</span>
                                      </div>
                                    ) : analysisData[pred.customer_id] ? (
                                      <div className="space-y-5">
                                        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                          <div className="flex-shrink-0 p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                                            <HiSparkles className="w-5 h-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-base">AI Analysis</h4>
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                              {analysisData[pred.customer_id].analysis}
                                            </p>
                                          </div>
                                        </div>

                                        {analysisData[pred.customer_id].key_patterns && analysisData[pred.customer_id].key_patterns.length > 0 && (
                                          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <div className="flex-shrink-0 p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                                              <HiChartBar className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                              <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-base">Key Patterns</h4>
                                              <ul className="list-disc list-inside space-y-1.5">
                                                {analysisData[pred.customer_id].key_patterns.map((pattern, i) => (
                                                  <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">{pattern}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          </div>
                                        )}

                                        {analysisData[pred.customer_id].retention_tips && analysisData[pred.customer_id].retention_tips.length > 0 && (
                                          <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <div className="flex-shrink-0 p-2 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg">
                                              <HiLightBulb className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                              <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-base">Retention Recommendations</h4>
                                              <ul className="list-disc list-inside space-y-1.5">
                                                {analysisData[pred.customer_id].retention_tips.map((tip, i) => (
                                                  <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">{tip}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">No analysis available</p>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Predictions Pagination */}
                    {predictionsPagination.total > predictionsPagination.limit && (
                      <div className="mt-4 flex justify-between items-center">
                        <Button
                          onClick={handlePredictionPrevPage}
                          disabled={predictionsPagination.offset === 0}
                        >
                          ← Previous
                        </Button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {predictionsPagination.offset + 1} - {Math.min(predictionsPagination.offset + predictionsPagination.limit, predictionsPagination.total)} of {predictionsPagination.total}
                        </span>
                        <Button
                          onClick={handlePredictionNextPage}
                          disabled={predictionsPagination.offset + predictionsPagination.limit >= predictionsPagination.total}
                        >
                          Next →
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Upload Prediction Batch
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                Upload a CSV file with customer transaction data to generate churn predictions.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Batch Name (Optional)
                  </label>
                  <Input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g., Q1 2024 Customers"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CSV File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-900 dark:text-white
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-gradient-to-r file:from-blue-50 file:to-indigo-50 file:text-blue-700
                        hover:file:from-blue-100 hover:file:to-indigo-100
                        dark:file:from-blue-900 dark:file:to-indigo-900 dark:file:text-blue-300
                        dark:hover:file:from-blue-800 dark:hover:file:to-indigo-800
                        file:shadow-sm hover:file:shadow-md file:transition-all"
                    />
                  </div>
                  {uploadFile && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                      <HiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                        Selected: <span className="font-semibold">{uploadFile.name}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Required columns:</strong> customer_id, event_date
                    <br />
                    <strong>Optional:</strong> amount, event_type
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleBulkUpload}
                    disabled={!uploadFile || uploadLoading}
                    className="flex-1"
                  >
                    {uploadLoading ? 'Uploading...' : 'Upload & Predict'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadFile(null);
                      setBatchName('');
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
