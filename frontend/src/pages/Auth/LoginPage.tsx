/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import type { LoginFormData } from '../../components/auth/LoginForm';
import { authService } from '../../services/authService';

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
      await authService.login({
        email: data.email,
        password: data.password,
      });

      // Login successful - redirect to topics page
      navigate('/topics', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Login Form - includes "Don't have an account?" link */}
        <LoginForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />

        {/* Back to Home */}
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
