import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginFormData } from '../../components/auth/LoginForm';
import LoginForm from '../../components/auth/LoginForm';

/**
 * Login page that renders the LoginForm component
 * and handles authentication flow.
 */
function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(undefined);

    try {
      // TODO: Replace with actual API call to user-service
      // For now, simulate authentication

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Store auth token and user data
      // For now, redirect to home on success
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in. Please try again.');
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
