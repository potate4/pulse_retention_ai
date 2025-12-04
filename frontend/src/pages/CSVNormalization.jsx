import { useState } from 'react'
import Layout from '../components/Layout'
import { csvNormalizationAPI } from '../api/csvNormalization'
import Button from '../components/Button'
import Input from '../components/Input'

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            CSV Normalization
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload a CSV file and define your expected schema. Our LLM will automatically map and normalize your data.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload CSV File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-900 dark:text-gray-300
                             bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300
                             dark:border-gray-600 cursor-pointer
                             file:mr-4 file:py-2 file:px-4
                             file:rounded-l-lg file:border-0
                             file:text-sm file:font-semibold
                             file:bg-indigo-50 dark:file:bg-indigo-900
                             file:text-indigo-700 dark:file:text-indigo-300
                             hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800"
                  />
                </div>
                {file && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {/* Schema Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expected Schema
                  </label>
                  <button
                    type="button"
                    onClick={addSchemaField}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    + Add Field
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {schemaFields.map((field, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Field {index + 1}
                        </span>
                        {schemaFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSchemaField(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            ✕
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
                        className="mb-2"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading || !file}
                  className="flex-1"
                >
                  {loading ? 'Processing...' : 'Normalize CSV'}
                </Button>
                <Button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="bg-gray-500 hover:bg-gray-600"
                >
                  Reset
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column - Results/Instructions */}
          <div className="space-y-6">
            {/* Instructions */}
            {!result && !error && !loading && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
                  How it works
                </h3>
                <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>Upload your CSV file with any column structure</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Define your expected schema by adding fields with clear descriptions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Our LLM analyzes your data and generates a normalization script</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">4.</span>
                    <span>The script is validated and executed automatically</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">5.</span>
                    <span>Download your normalized CSV from the public URL</span>
                  </li>
                </ol>
                <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/40 rounded">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Tip:</strong> Be specific in your field descriptions. Mention data types (string, numeric, date) and formats (YYYY-MM-DD) for best results.
                  </p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-700 dark:border-yellow-300 mr-4"></div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300">
                      Processing CSV...
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      This may take a minute. The LLM is analyzing your data and generating a normalization script.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                  <p>⏳ Summarizing CSV structure...</p>
                  <p>🤖 Generating normalization script...</p>
                  <p>✅ Validating output...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
                  Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                  {error}
                </p>
              </div>
            )}

            {/* Success State */}
            {result && result.success && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-4">
                  ✓ Normalization Successful!
                </h3>

                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Attempts</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {result.attempts}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Status</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        Ready
                      </p>
                    </div>
                  </div>

                  {/* URL Display */}
                  {result.output_csv_url && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Download URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={result.output_csv_url}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-300"
                        />
                        <button
                          onClick={copyURL}
                          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={downloadCSV} className="flex-1">
                      Download CSV
                    </Button>
                    <Button
                      onClick={handleReset}
                      className="bg-gray-500 hover:bg-gray-600"
                    >
                      New Upload
                    </Button>
                  </div>

                  {/* Generated Script Preview */}
                  {result.generated_script && (
                    <details className="bg-white dark:bg-gray-800 rounded p-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                        View Generated Script
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto text-gray-800 dark:text-gray-300">
                        {result.generated_script}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Failed Result */}
            {result && !result.success && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
                  Normalization Failed
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                  {result.message}
                </p>
                {result.error_details && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-red-800 dark:text-red-300">
                      Error Details
                    </summary>
                    <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/40 p-3 rounded overflow-x-auto">
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
