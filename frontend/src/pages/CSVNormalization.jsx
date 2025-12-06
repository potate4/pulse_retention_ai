import { useState } from 'react'
import Layout from '../components/Layout'
import { csvNormalizationAPI } from '../api/csvNormalization'
import Button from '../components/Button'
import Input from '../components/Input'
import {
  HiUpload,
  HiCheckCircle,
  HiXCircle,
  HiExclamationCircle,
  HiDownload,
  HiClipboardCopy,
  HiSparkles,
  HiCode,
  HiRefresh,
  HiPlus,
  HiX,
  HiLightBulb
} from 'react-icons/hi'
import { FiFileText, FiClock } from 'react-icons/fi'

const CSVNormalization = () => {
  const [file, setFile] = useState(null)
  const [schemaFields, setSchemaFields] = useState([
    { column_name: '', description: '' }
  ])
  const [maxAttempts, setMaxAttempts] = useState(5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setError(null)
    } else {
      setFile(null)
      setError('Please select a valid CSV file')
    }
  }

  const handleSchemaFieldChange = (index, field, value) => {
    const newFields = [...schemaFields]
    newFields[index][field] = value
    setSchemaFields(newFields)
  }

  const addSchemaField = () => {
    setSchemaFields([...schemaFields, { column_name: '', description: '' }])
  }

  const removeSchemaField = (index) => {
    if (schemaFields.length > 1) {
      const newFields = schemaFields.filter((_, i) => i !== index)
      setSchemaFields(newFields)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    // Validate inputs
    if (!file) {
      setError('Please select a CSV file')
      return
    }

    const validFields = schemaFields.filter(
      f => f.column_name.trim() !== '' && f.description.trim() !== ''
    )

    if (validFields.length === 0) {
      setError('Please add at least one schema field with both name and description')
      return
    }

    setLoading(true)

    try {
      const response = await csvNormalizationAPI.normalizeCSV(
        file,
        validFields,
        maxAttempts
      )

      if (response.success) {
        setResult(response)
      } else {
        setError(response.message || 'Normalization failed')
      }
    } catch (err) {
      console.error('Error:', err)
      setError(
        err.response?.data?.detail ||
        err.message ||
        'An error occurred during normalization'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setSchemaFields([{ column_name: '', description: '' }])
    setMaxAttempts(5)
    setResult(null)
    setError(null)
  }

  const downloadCSV = () => {
    if (result?.output_csv_url) {
      window.open(result.output_csv_url, '_blank')
    }
  }

  const copyURL = () => {
    if (result?.output_csv_url) {
      navigator.clipboard.writeText(result.output_csv_url)
      alert('URL copied to clipboard!')
    }
  }

  return (
    <Layout activePage="csv-normalization">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-md">
              <FiFileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              CSV Normalization
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg ml-14">
            Upload a CSV file and define your expected schema. Our AI will automatically map and normalize your data.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                  Upload CSV File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-900 dark:text-gray-300
                             bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-300
                             dark:border-gray-600 cursor-pointer transition-all
                             file:mr-4 file:py-2.5 file:px-4
                             file:rounded-l-lg file:border-0
                             file:text-sm file:font-semibold
                             file:bg-gradient-to-r file:from-teal-50 file:to-cyan-50
                             file:text-teal-700 dark:file:from-teal-900 dark:file:to-cyan-900
                             dark:file:text-teal-300
                             hover:file:from-teal-100 hover:file:to-cyan-100
                             dark:hover:file:from-teal-800 dark:hover:file:to-cyan-800
                             file:shadow-sm hover:file:shadow-md"
                  />
                </div>
                {file && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                    <HiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>

              {/* Schema Fields */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Expected Schema
                  </label>
                  <button
                    type="button"
                    onClick={addSchemaField}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                  >
                    <HiPlus className="w-4 h-4" />
                    Add Field
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {schemaFields.map((field, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-800/50 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          Field {index + 1}
                        </span>
                        {schemaFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSchemaField(index)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <HiX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <Input
                        type="text"
                        placeholder="Column name (e.g., customer_id)"
                        value={field.column_name}
                        onChange={(e) =>
                          handleSchemaFieldChange(index, 'column_name', e.target.value)
                        }
                        className="mb-3"
                      />
                      <Input
                        type="text"
                        placeholder="Description (e.g., Unique customer identifier)"
                        value={field.description}
                        onChange={(e) =>
                          handleSchemaFieldChange(index, 'description', e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Max Attempts */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  Max LLM Attempts (1-10)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading || !file}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md hover:shadow-lg transition-all"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <HiSparkles className="w-4 h-4" />
                      Normalize CSV
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="bg-gray-500 hover:bg-gray-600 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <HiRefresh className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column - Results/Instructions */}
          <div className="space-y-6">
            {/* Instructions */}
            {!result && !error && !loading && (
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-lg shadow-md">
                    <HiSparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-blue-900 dark:text-blue-300">
                      How it works
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                      Simple 5-step process powered by AI
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      1
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Upload CSV File</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Upload your CSV file with any column structure - no formatting required</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      2
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Define Schema</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Add fields with clear descriptions to define your expected output structure</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      3
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">AI Analysis</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Our LLM analyzes your data and intelligently generates a normalization script</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      4
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Auto Validation</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">The script is automatically validated and executed with error handling</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      5
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Download Result</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Download your perfectly normalized CSV from the generated public URL</p>
                    </div>
                  </div>
                </div>

              
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-6 border-2 border-amber-200 dark:border-amber-800 shadow-md">
                <div className="flex items-center mb-5">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-amber-600 dark:border-amber-400 mr-4 flex-shrink-0"></div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300">
                      Processing CSV...
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      This may take a minute. The AI is analyzing your data and generating a normalization script.
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5 text-sm text-amber-800 dark:text-amber-300 pl-14">
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4" />
                    <p>Summarizing CSV structure...</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiSparkles className="w-4 h-4" />
                    <p>Generating normalization script...</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiCheckCircle className="w-4 h-4" />
                    <p>Validating output...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl p-6 border-2 border-red-200 dark:border-red-800 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <HiExclamationCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <h3 className="text-lg font-bold text-red-900 dark:text-red-300">
                    Error
                  </h3>
                </div>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap pl-9">
                  {error}
                </p>
              </div>
            )}

            {/* Success State */}
            {result && result.success && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800 shadow-md">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <HiCheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-green-900 dark:text-green-300">
                    Normalization Successful!
                  </h3>
                </div>

                <div className="space-y-5">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Attempts</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {result.attempts}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Status</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        Ready
                      </p>
                    </div>
                  </div>

                  {/* URL Display */}
                  {result.output_csv_url && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                        Download URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={result.output_csv_url}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-300 font-mono"
                        />
                        <button
                          onClick={copyURL}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
                        >
                          <HiClipboardCopy className="w-4 h-4" />
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      onClick={downloadCSV} 
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <HiDownload className="w-4 h-4" />
                      Download CSV
                    </Button>
                    <Button
                      onClick={handleReset}
                      className="bg-gray-500 hover:bg-gray-600 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <HiRefresh className="w-4 h-4" />
                      New Upload
                    </Button>
                  </div>

                  {/* Generated Script Preview */}
                  {result.generated_script && (
                    <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                      <summary className="cursor-pointer p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <HiCode className="w-4 h-4" />
                        View Generated Script
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded-b-lg overflow-x-auto text-gray-800 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">
                        {result.generated_script}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Failed Result */}
            {result && !result.success && (
              <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl p-6 border-2 border-red-200 dark:border-red-800 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <HiXCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <h3 className="text-xl font-bold text-red-900 dark:text-red-300">
                    Normalization Failed
                  </h3>
                </div>
                <p className="text-sm text-red-700 dark:text-red-400 mb-4 pl-9">
                  {result.message}
                </p>
                {result.error_details && (
                  <details className="text-sm bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                    <summary className="cursor-pointer font-semibold text-red-800 dark:text-red-300 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2">
                      <HiExclamationCircle className="w-4 h-4" />
                      Error Details
                    </summary>
                    <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/40 p-4 rounded-b-lg overflow-x-auto border-t border-red-200 dark:border-red-800">
                      {JSON.stringify(result.error_details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CSVNormalization
