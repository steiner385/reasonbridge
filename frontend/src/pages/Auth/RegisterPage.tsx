import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RegistrationFormData } from '../../components/auth/RegistrationForm';
import RegistrationForm from '../../components/auth/RegistrationForm';

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
      // TODO: Replace with actual API call to user-service
      // For now, simulate registration

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Handle email verification flow
      // For now, redirect to login on success
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
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
