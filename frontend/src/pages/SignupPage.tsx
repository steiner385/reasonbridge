import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailSignupForm, { type EmailSignupFormData } from '../components/auth/EmailSignupForm';
import OAuthButtons from '../components/auth/OAuthButtons';
import { authService } from '../services/authService';

/**
 * SignupPage component - User registration page with email/password and OAuth options
 * Redirects to email verification page after successful signup
 */
export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleEmailSignup = async (data: EmailSignupFormData) => {
    try {
      setIsLoading(true);
      setError('');

      // Get referral source and visitor session ID from localStorage if available
      const referralSource = localStorage.getItem('referralSource');
      const visitorSessionId = localStorage.getItem('visitorSessionId');

      await authService.signup({
        email: data.email,
        password: data.password,
        ...(referralSource && { referralSource }),
        ...(visitorSessionId && { visitorSessionId }),
      });

      // Clear referral tracking data
      localStorage.removeItem('referralSource');
      localStorage.removeItem('visitorSessionId');

      // Redirect to email verification page
      navigate('/verify-email', { replace: true });
    } catch (err) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(message);
    }
  };

  const handleOAuthError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Join the discussion platform to participate in thoughtful conversations
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Email Signup Form */}
          <EmailSignupForm onSubmit={handleEmailSignup} isLoading={isLoading} error={error} />

          {/* OAuth Buttons */}
          <OAuthButtons onError={handleOAuthError} className="mt-6" />

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/')}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium focus:outline-none focus:underline"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* Terms and Privacy */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By creating an account, you agree to our{' '}
              <a
                href="/terms"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="/privacy"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
