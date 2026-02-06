/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, type RegistrationFormData } from '../../schemas/auth';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';

export type { RegistrationFormData };

export interface RegistrationFormProps {
  /**
   * Callback when the form is submitted with valid data
   */
  onSubmit: (data: RegistrationFormData) => void | Promise<void>;

  /**
   * Whether the form is in a loading/submitting state
   */
  isLoading?: boolean;

  /**
   * Error message to display at the form level
   */
  error?: string;

  /**
   * Custom CSS class name for the form wrapper
   */
  className?: string;
}

function RegistrationForm({
  onSubmit,
  isLoading = false,
  error,
  className = '',
}: RegistrationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur', // Validate on blur
    reValidateMode: 'onChange', // Re-validate on change after first blur
  });

  // Scroll to first error on submit
  const handleFormSubmit = async (data: RegistrationFormData) => {
    try {
      await onSubmit(data);
    } catch {
      // Error handling is done in parent component
      // Scroll to first error field if validation errors exist
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const errorElement = document.getElementById(firstErrorField);
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement?.focus();
      }
    }
  };

  return (
    <Card variant="default" padding="lg" className={className}>
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Account</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Join the discussion platform to participate in thoughtful conversations
        </p>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-lg bg-fallacy-light dark:bg-red-900/20 border border-fallacy-DEFAULT dark:border-red-700 p-4">
              <p className="text-sm text-fallacy-dark dark:text-red-300">{error}</p>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            id="email"
            {...register('email')}
            error={touchedFields.email ? errors.email?.message : undefined}
            required
            fullWidth
            placeholder="you@example.com"
            autoComplete="email"
          />

          <Input
            label="Display Name"
            type="text"
            id="displayName"
            {...register('displayName')}
            error={touchedFields.displayName ? errors.displayName?.message : undefined}
            helperText="This is how your name will appear to other users (3-50 characters)"
            required
            fullWidth
            placeholder="Your Name"
            autoComplete="username"
          />

          <Input
            label="Password"
            type="password"
            id="password"
            {...register('password')}
            error={touchedFields.password ? errors.password?.message : undefined}
            helperText="Must be at least 12 characters with uppercase, lowercase, number, and special character"
            required
            fullWidth
            placeholder="Create a strong password"
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            {...register('confirmPassword')}
            error={touchedFields.confirmPassword ? errors.confirmPassword?.message : undefined}
            required
            fullWidth
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-300">
            Already have an account?{' '}
            <a
              href="/"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              Sign in
            </a>
          </p>
        </form>
      </CardBody>
    </Card>
  );
}

export default RegistrationForm;
