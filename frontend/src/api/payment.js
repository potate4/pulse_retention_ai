import client from './client'

export const paymentAPI = {
  /**
   * Initiate payment for a subscription plan
   * @param {string} planId - Plan ID ('starter', 'professional', 'enterprise')
   * @param {string} billingCycle - 'monthly' or 'yearly'
   * @param {string} paymentMethod - 'bkash', 'card', 'nagad'
   * @returns {Promise} Payment initiation response with payment_url
   */
  initiatePayment: async (planId, billingCycle, paymentMethod) => {
    const response = await client.post('/payment/initiate', {
      plan_id: planId,
      billing_cycle: billingCycle,
      payment_method: paymentMethod
    })
    return response.data
  },

  /**
   * Verify payment and activate subscription
   * @param {string} paymentId - Payment ID from bKash
   * @param {string} planId - Plan ID to activate
   * @param {string} billingCycle - Billing cycle
   * @returns {Promise} Payment verification response
   */
  verifyPayment: async (paymentId, planId, billingCycle) => {
    const response = await client.post(`/payment/verify/${paymentId}`, null, {
      params: {
        plan_id: planId,
        billing_cycle: billingCycle
      }
    })
    return response.data
  },

  /**
   * Get payment status
   * @param {string} paymentId - Payment ID
   * @returns {Promise} Payment status response
   */
  getPaymentStatus: async (paymentId) => {
    const response = await client.get(`/payment/status/${paymentId}`)
    return response.data
  },

  /**
   * Get current user's subscription
   * @returns {Promise} Current subscription details
   */
  getCurrentSubscription: async () => {
    const response = await client.get('/payment/subscription/current')
    return response.data
  },

  /**
   * Verify SSLCommerz payment and activate subscription
   * @param {string} valId - Validation ID from SSLCommerz
   * @param {number} amount - Payment amount
   * @param {string} planId - Plan ID to activate
   * @param {string} billingCycle - Billing cycle
   * @returns {Promise} Payment verification response
   */
  verifySSLCommerzPayment: async (valId, amount, planId, billingCycle) => {
    const response = await client.post('/payment/sslcommerz/verify', null, {
      params: {
        val_id: valId,
        amount: amount,
        plan_id: planId,
        billing_cycle: billingCycle
      }
    })
    return response.data
  }
}

