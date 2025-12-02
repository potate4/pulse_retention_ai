const Button = ({ children, type = 'button', onClick, disabled = false, variant = 'primary', className = '' }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-primary-teal text-white hover:bg-primary-slate focus:ring-primary-teal dark:bg-primary-teal dark:hover:bg-primary-slate',
    secondary: 'bg-gray-200 dark:bg-dark-surface text-gray-800 dark:text-dark-text-primary hover:bg-gray-300 dark:hover:bg-primary-navy focus:ring-gray-500 dark:focus:ring-primary-teal border border-light-border dark:border-dark-border',
    danger: 'bg-primary-magenta text-white hover:bg-primary-mauve focus:ring-primary-magenta dark:bg-primary-magenta dark:hover:bg-primary-mauve',
  }

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  )
}

export default Button

