import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentAPI } from '../api/payment';
import Layout from '../components/Layout';

const SSLCommerzCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'failed', 'cancelled'
  const [message, setMessage] = useState('Verifying payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get parameters from SSLCommerz callback
        const valId = searchParams.get('val_id');
        const amount = searchParams.get('amount');
        const statusParam = searchParams.get('status');
        
        // Get pending subscription info from sessionStorage
        const pendingSubscription = sessionStorage.getItem('pending_subscription');
        
        if (!pendingSubscription) {
          setStatus('failed');
          setMessage('Subscription information not found');
          setTimeout(() => navigate('/pricing-billing'), 3000);
          return;
        }

        const { planId, billingCycle } = JSON.parse(pendingSubscription);

        // Check if payment was successful
        if (statusParam === 'VALID' && valId && amount) {
          // Verify payment and activate subscription
          const result = await paymentAPI.verifySSLCommerzPayment(
            valId,
            parseFloat(amount),
            planId,
            billingCycle
          );

          if (result.status === 'success') {
            setStatus('success');
            setMessage('Payment successful! Your subscription has been activated.');
            
            // Clear pending subscription
            sessionStorage.removeItem('pending_subscription');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              navigate('/', { state: { paymentSuccess: true } });
            }, 2000);
          } else {
            setStatus('failed');
            setMessage(result.message || 'Payment verification failed');
            setTimeout(() => navigate('/pricing-billing'), 3000);
          }
        } else if (statusParam === 'FAILED' || statusParam === 'CANCELLED') {
          setStatus(statusParam === 'CANCELLED' ? 'cancelled' : 'failed');
          setMessage(statusParam === 'CANCELLED' ? 'Payment was cancelled.' : 'Payment failed.');
          setTimeout(() => navigate('/pricing-billing'), 3000);
        } else {
          setStatus('failed');
          setMessage('Invalid payment response');
          setTimeout(() => navigate('/pricing-billing'), 3000);
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage(error.response?.data?.detail || error.message || 'Payment verification failed');
        setTimeout(() => navigate('/pricing-billing'), 3000);
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          {status === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Processing Payment
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirecting to dashboard...
              </p>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirecting to pricing page...
              </p>
            </>
          )}

          {status === 'cancelled' && (
            <>
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Cancelled
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirecting to pricing page...
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SSLCommerzCallback;

