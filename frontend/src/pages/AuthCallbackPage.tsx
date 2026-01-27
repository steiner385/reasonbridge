import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AuthResponse } from '../services/authService';

/**
 * AuthCallbackPage component - OAuth callback handler
 * Parses tokens from OAuth callback, stores JWT, and redirects appropriately
 */
export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse hash fragment for tokens (OAuth typically uses fragment)
        const hashParams = new URLSearchParams(location.hash.substring(1));

        // Also check query params as fallback
        const queryParams = new URLSearchParams(location.search);

        // Get tokens from either hash or query params
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const state = hashParams.get('state') || queryParams.get('state');
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription =
          hashParams.get('error_description') || queryParams.get('error_description');

        // Check for OAuth errors
        if (errorParam) {
          throw new Error(errorDescription || `OAuth error: ${errorParam}`);
        }

        // Validate state to prevent CSRF attacks
        const storedState = sessionStorage.getItem('oauth_state');

        if (state && storedState && state !== storedState) {
          throw new Error('Invalid state parameter. Possible CSRF attack.');
        }

        // Clean up stored OAuth state
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_provider');

        if (!accessToken) {
          throw new Error('No access token received from OAuth provider');
        }

        // Store tokens
        localStorage.setItem('authToken', accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // Parse user data and onboarding progress from token or make API call
        // For now, we'll make an API call to get user info
        const response = await fetch(
          `${import.meta.env['VITE_API_URL'] || 'http://localhost:3000'}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch user information');
        }

        const userData: AuthResponse = await response.json();

        // Redirect based on onboarding progress
        if (!userData.user.emailVerified) {
          navigate('/verify-email', { replace: true });
        } else if (!userData.onboardingProgress.topicsSelected) {
          navigate('/onboarding/topics', { replace: true });
        } else if (!userData.onboardingProgress.orientationViewed) {
          navigate('/onboarding/orientation', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
        console.error('OAuth callback error:', err);

        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 5000);
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {error ? (
          // Error State
          <div>
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Authentication Failed
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to login page...</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium focus:outline-none focus:underline"
            >
              Go to Login Now
            </button>
          </div>
        ) : (
          // Loading State
          <div>
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <svg
                className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Completing Sign In
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we set up your account...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
