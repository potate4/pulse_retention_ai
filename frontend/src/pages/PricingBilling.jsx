import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { paymentAPI } from '../api/payment';
import bkashLogo from '/bkash_logo.png';
import nagadLogo from '/nagad_logo.jpg';

// Simple icon components
const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const XCircleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const PricingBilling = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or yearly
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card'); // card, bkash, nagad
  const [isProcessing, setIsProcessing] = useState(false);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 20000,
      description: 'Perfect for small businesses starting with customer retention',
      features: [
        'Up to 1,000 customers',
        'Basic churn prediction',
        'Email campaigns',
        'Basic analytics',
        'Customer segmentation',
        'Email support',
      ],
      notIncluded: [
        'Advanced AI predictions',
        'ROI dashboard',
        'Behavior analysis',
        'Priority support',
      ],
      color: 'from-blue-500 to-blue-600',
      popular: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 35000,
      description: 'Most popular for growing businesses',
      features: [
        'Up to 5,000 customers',
        'Advanced churn prediction',
        'Personalized email campaigns',
        'Advanced analytics',
        'RFM segmentation',
        'ROI dashboard',
        'Behavior analysis',
        'API access',
        'Priority email support',
      ],
      notIncluded: [
        'Dedicated account manager',
        'Custom integrations',
      ],
      color: 'from-purple-500 to-purple-600',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 50000,
      description: 'Complete solution for large enterprises',
      features: [
        'Unlimited customers',
        'AI-powered predictions',
        'Multi-channel campaigns',
        'Custom analytics',
        'Advanced segmentation',
        'ROI & profit analysis',
        'Behavior insights',
        'Full API access',
        'Embeddable widget',
        'Custom integrations',
        'Dedicated account manager',
        '24/7 Priority support',
        'Custom training',
      ],
      notIncluded: [],
      color: 'from-indigo-500 to-indigo-600',
      popular: false,
    },
  ];

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;
    
    setIsProcessing(true);
    
    try {
      // All payment methods (bkash, nagad, card) go through SSLCommerz
      // SSLCommerz will show the appropriate payment method interface
      const response = await paymentAPI.initiatePayment(
        selectedPlan.id,
        billingCycle,
        paymentMethod  // Pass the selected method (bkash, nagad, or card)
      );
      
      // Store plan info in sessionStorage for callback
      sessionStorage.setItem('pending_subscription', JSON.stringify({
        planId: selectedPlan.id,
        billingCycle: billingCycle,
        paymentId: response.payment_id
      }));
      
      // Redirect to SSLCommerz payment page
      // SSLCommerz will show the payment method options (bKash, Nagad, Card, etc.)
      window.location.href = response.payment_url;
    } catch (error) {
      console.error('Payment initiation error:', error);
      alert(`Failed to initiate payment: ${error.response?.data?.detail || error.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Pricing & Billing
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Choose the perfect plan for your business needs
            </p>

            {/* Billing Cycle Toggle */}
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-800">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'yearly'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Yearly
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  plan.popular ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-0.5 text-xs font-semibold rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                {/* Color Bar */}
                <div className={`h-1.5 bg-gradient-to-r ${plan.color}`}></div>

                {/* Card Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 h-10">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      ৳{billingCycle === 'yearly' ? (plan.price * 12 * 0.8).toLocaleString() : plan.price.toLocaleString()}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1 text-sm">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold text-white bg-gradient-to-r ${plan.color} hover:opacity-90 transition-opacity mb-4 text-sm`}
                  >
                    Get Started
                  </button>

                  {/* Features List */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                      What's included:
                    </p>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feature, index) => (
                      <div key={index} className="flex items-start opacity-50">
                        <XCircleIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We accept Credit/Debit Cards, bKash, and Nagad for your convenience.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Can I upgrade or downgrade my plan?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Yes! You can upgrade or downgrade at any time. Changes will be reflected in your next billing cycle.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Is there a free trial?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Yes, we offer a 14-day free trial for all plans. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6" style={{ margin: 'auto' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Complete Your Purchase
            </h2>
            
            {/* Selected Plan */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-600 dark:text-gray-400">Selected Plan</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {selectedPlan?.name}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                ৳{billingCycle === 'yearly' ? (selectedPlan?.price * 12 * 0.8).toLocaleString() : selectedPlan?.price.toLocaleString()}
                <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
                  /{billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-900 dark:text-white mb-2">
                Select Payment Method
              </label>
              <div className="space-y-2">
                {/* Card Payment */}
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-2"
                  />
                  <div className="flex items-center flex-1">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">Credit/Debit Card</p>
                      <p className="text-xs text-gray-500">Visa, Mastercard, Amex via SSLCommerz</p>
                    </div>
                    <div className="text-xl">💳</div>
                  </div>
                </label>

                {/* bKash */}
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'bkash' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="bkash"
                    checked={paymentMethod === 'bkash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-2"
                  />
                  <div className="flex items-center flex-1">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">bKash</p>
                      <p className="text-xs text-gray-500">Via SSLCommerz</p>
                    </div>
                    <img src={bkashLogo} alt="bKash" className="h-6 w-auto" />
                  </div>
                </label>

                {/* Nagad */}
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'nagad' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="nagad"
                    checked={paymentMethod === 'nagad'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-2"
                  />
                  <div className="flex items-center flex-1">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">Nagad</p>
                      <p className="text-xs text-gray-500">Via SSLCommerz</p>
                    </div>
                    <img src={nagadLogo} alt="Nagad" className="h-6 w-auto" />
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PricingBilling;

