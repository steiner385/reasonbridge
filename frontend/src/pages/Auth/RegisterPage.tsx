import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RegistrationFormData } from '../../components/auth/RegistrationForm';
import RegistrationForm from '../../components/auth/RegistrationForm';
import { apiClient, ApiError } from '../../lib/api';

interface RegisterResponse {
  userId: string;
  email: string;
  displayName: string;
  message: string;
  requiresEmailVerification: boolean;
}

/**
 * Registration page that renders the RegistrationForm component
 * and handles user registration flow.
 */
function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    setError(undefined);

    try {
      await apiClient.post<RegisterResponse>('/auth/register', {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });

      // Registration successful - redirect to landing page
      // User will need to verify email before logging in
      navigate('/', {
        state: {
          message: 'Registration successful! Please check your email to verify your account.',
        },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle specific API errors
        if (err.status === 409) {
          setError('An account with this email already exists.');
        } else if (err.status === 400) {
          setError('Invalid registration data. Please check your input.');
        } else {
          setError(err.message || 'Failed to create account. Please try again.');
        }
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to create account. Please try again.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <RegistrationForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        {...(error ? { error } : {})}
      />
    </div>
  );
}

export default RegisterPage;
