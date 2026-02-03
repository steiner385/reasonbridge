import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import type { LoginFormData } from '../../components/auth/LoginForm';
import { apiClient, ApiError } from '../../lib/api';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

/**
 * Login page that renders the LoginForm component
 * and handles user authentication flow.
 */
function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email: data.email,
        password: data.password,
      });

      // Store auth tokens
      localStorage.setItem('auth_token', response.accessToken);
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Login successful - redirect to home page
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle specific API errors
        if (err.status === 401) {
          setError('Invalid email or password.');
        } else if (err.status === 400) {
          setError('Invalid login data. Please check your input.');
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
      <LoginForm onSubmit={handleSubmit} isLoading={isLoading} {...(error ? { error } : {})} />
    </div>
  );
}

export default LoginPage;
