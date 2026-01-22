import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { LoginFormData } from '../../components/auth/LoginForm';
import LoginForm from '../../components/auth/LoginForm';
import { apiClient, ApiError } from '../../lib/api';

interface LoginResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface LocationState {
  message?: string;
}

/**
 * Login page that renders the LoginForm component
 * and handles authentication flow.
 */
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [successMessage] = useState<string | undefined>(locationState?.message);

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email: data.email,
        password: data.password,
      });

      // Store the auth token
      apiClient.setAuthToken(response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);

      // Redirect to home on success
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle specific API errors
        if (err.status === 401) {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(err.message || 'Failed to sign in. Please try again.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          {successMessage}
        </div>
      )}
      <LoginForm onSubmit={handleSubmit} isLoading={isLoading} {...(error ? { error } : {})} />
    </div>
  );
}

export default LoginPage;
