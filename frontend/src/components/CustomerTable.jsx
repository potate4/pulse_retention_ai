import React from 'react'

/**
 * CustomerTable Component
 * Displays customers with checkbox selection
 */
const CustomerTable = ({ customers, selectedCustomers, onSelectionChange, loading }) => {
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(customers.map(c => c.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (customerId) => {
    if (selectedCustomers.includes(customerId)) {
      onSelectionChange(selectedCustomers.filter(id => id !== customerId))
    } else {
      onSelectionChange([...selectedCustomers, customerId])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal"></div>
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-light-text-secondary dark:text-dark-text-secondary">
        <p>No customers found in this segment</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-light-border dark:divide-dark-border">
        <thead className="bg-light-bg dark:bg-dark-bg">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedCustomers.length === customers.length && customers.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-primary-teal rounded border-light-border dark:border-dark-border focus:ring-primary-teal"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Churn Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
              Purchase Amount
            </th>
          </tr>
        </thead>
        <tbody className="bg-light-surface dark:bg-dark-surface divide-y divide-light-border dark:divide-dark-border">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className={`hover:bg-light-bg dark:hover:bg-dark-bg ${selectedCustomers.includes(customer.id) ? 'bg-primary-teal/10 dark:bg-primary-teal/20' : ''}`}
            >
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={() => handleSelectOne(customer.id)}
                  className="h-4 w-4 text-primary-teal rounded border-light-border dark:border-dark-border focus:ring-primary-teal"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                {customer.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {customer.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {customer.phone || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-secondary dark:text-dark-text-secondary">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  customer.churn_score > 0.7 ? 'bg-primary-magenta/20 text-primary-magenta dark:bg-primary-magenta/30 dark:text-primary-magenta' :
                  customer.churn_score > 0.4 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {(customer.churn_score * 100).toFixed(0)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-secondary dark:text-dark-text-secondary">
                ৳{customer.custom_fields?.purchase_amount?.toLocaleString() || 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-6 py-3 bg-light-bg dark:bg-dark-bg text-sm text-light-text-secondary dark:text-dark-text-secondary">
        {selectedCustomers.length} of {customers.length} customers selected
      </div>
    </div>
  )
}

export default CustomerTable
