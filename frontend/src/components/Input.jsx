const Input = ({ label, type = 'text', name, value, onChange, error, placeholder, required = false }) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
          {label}
          {required && <span className="text-primary-magenta ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2 border rounded-lg bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary-teal ${
          error ? 'border-primary-magenta' : 'border-light-border dark:border-dark-border'
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-primary-magenta">{error}</p>
      )}
    </div>
  )
}

export default Input

