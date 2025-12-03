import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Input from '../components/Input'
import Select from '../components/Select'
import Button from '../components/Button'
import Loading from '../components/Loading'
import ThemeToggle from '../components/ThemeToggle'
import logoMain from '../../../logo main.png'

const Signup = () => {
  const navigate = useNavigate()
  const { signup, loading, error, clearError } = useAuthStore()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    org_name: '',
    org_type: '',
  })

  const [formErrors, setFormErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
    // Clear auth error when user starts typing
    if (error) {
      clearError()
    }
  }

  const validate = () => {
    const errors = {}
    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid'
    }
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    if (!formData.org_name.trim()) {
      errors.org_name = 'Organization name is required'
    }
    if (!formData.org_type) {
      errors.org_type = 'Organization type is required'
    }
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const { confirmPassword, ...signupData } = formData
    const result = await signup(signupData)
    if (result.success) {
      navigate('/login')
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-primary-navy dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Theme Toggle */}
      <ThemeToggle />
      
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-teal opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-magenta opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-slate opacity-5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Card Container */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl border border-light-border dark:border-dark-border overflow-hidden transition-all duration-300 hover:shadow-3xl">
          {/* Card Header with Logo */}
          <div className="bg-gradient-to-r from-primary-teal to-primary-slate dark:from-primary-navy dark:to-primary-slate px-8 pt-10 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <img src={logoMain} alt="Pulse" className="h-16 sm:h-20 object-contain filter drop-shadow-lg" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Get Started
            </h2>
            <p className="text-teal-100 text-sm">
              Create your account to unlock powerful retention insights
            </p>
          </div>

          {/* Card Body */}
          <div className="px-8 py-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Full Name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={formErrors.name}
                    placeholder="Enter your full name"
                    required
                  />
                  <Input
                    label="Email address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={formErrors.email}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={formErrors.password}
                    placeholder="Enter your password"
                    required
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={formErrors.confirmPassword}
                    placeholder="Confirm your password"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Organization Name"
                    type="text"
                    name="org_name"
                    value={formData.org_name}
                    onChange={handleChange}
                    error={formErrors.org_name}
                    placeholder="Enter your organization name"
                    required
                  />
                  <Select
                    label="Organization Type"
                    name="org_type"
                    value={formData.org_type}
                    onChange={handleChange}
                    error={formErrors.org_type}
                    placeholder="Select organization type"
                    required
                    options={[
                      { value: 'banking', label: 'Banking' },
                      { value: 'telecom', label: 'Telecom' },
                      { value: 'ecommerce', label: 'E-commerce' },
                    ]}
                  />
                </div>
              </div>

              <div className="pt-3">
                <Button type="submit" disabled={loading} className="w-full py-3 text-base font-semibold transform transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>

              <div className="relative pt-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-light-border dark:border-dark-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-light-surface dark:bg-dark-surface text-light-text-secondary dark:text-dark-text-secondary">
                    Already have an account?
                  </span>
                </div>
              </div>

              <div className="text-center">
                <Link 
                  to="/login" 
                  className="inline-flex items-center font-medium text-primary-teal hover:text-primary-slate dark:text-primary-teal dark:hover:text-primary-slate transition-colors duration-200"
                >
                  Sign in to your existing account
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
          © {new Date().getFullYear()} Pulse. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default Signup

