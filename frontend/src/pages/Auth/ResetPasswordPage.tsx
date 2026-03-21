/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';

const resetPasswordSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    code: z
      .string()
      .length(6, 'Code must be 6 digits')
      .regex(/^\d{6}$/, 'Code must be 6 digits'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Reset Password page - enter code and new password
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get email from navigation state if available
  const emailFromState = (location.state as { email?: string })?.email || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromState,
    },
  });

  // Pre-fill email if coming from forgot password page
  useEffect(() => {
    if (emailFromState) {
      setValue('email', emailFromState);
    }
  }, [emailFromState, setValue]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await authService.resetPassword(data.email, data.code, data.newPassword);
      setIsSuccess(true);
      toast.success('Password reset successful!');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card variant="elevated" padding="lg">
            <CardBody>
              <div className="text-center py-4">
                <div className="text-green-500 mb-4">
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Password Reset Successful!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your password has been updated. Redirecting to login...
                </p>
                <Link to="/login">
                  <Button variant="primary" fullWidth>
                    Go to Login
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Reset Your Password
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Enter the 6-digit code from your email and choose a new password.
            </p>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                id="email"
                {...register('email')}
                error={errors.email?.message}
                required
                fullWidth
                placeholder="you@example.com"
                autoComplete="email"
              />

              <Input
                label="Reset Code"
                type="text"
                id="code"
                {...register('code')}
                error={errors.code?.message}
                required
                fullWidth
                placeholder="123456"
                autoComplete="one-time-code"
                maxLength={6}
                inputMode="numeric"
              />

              <div>
                <Input
                  label="New Password"
                  type="password"
                  id="newPassword"
                  {...register('newPassword')}
                  error={errors.newPassword?.message}
                  required
                  fullWidth
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Must be at least 12 characters with uppercase, lowercase, number, and special
                  character.
                </p>
              </div>

              <Input
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                required
                fullWidth
                placeholder="Confirm your password"
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
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="mt-4 text-center space-y-2">
          <Link
            to="/forgot-password"
            className="block text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            Request a new code
          </Link>
          <Link
            to="/login"
            className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
