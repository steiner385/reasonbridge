/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Forgot Password page - request password reset code
 */
function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submitError, setSubmitError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setSubmitError('');
    try {
      // Only reach the success screen on a 2xx response. Anti-enumeration is
      // handled entirely server-side (the endpoint always returns 200 with a
      // neutral message), so any thrown error here means a genuine failure —
      // rate limit (429), 5xx, or a network/offline error. Masking those as
      // success (the previous behaviour) left users waiting for a code that was
      // never generated (issue #1333).
      await authService.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      toast.success('If an account exists, a reset code has been sent to your email.');
    } catch {
      // Neutral, retryable message that does not reveal whether the account
      // exists — surfaces the real failure without aiding enumeration.
      const message = "We couldn't process your request. Please try again in a moment.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
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
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Check Your Email
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  If an account exists for <strong>{submittedEmail}</strong>, we&apos;ve sent a
                  6-digit code to reset your password. The code expires in 15 minutes.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() =>
                      navigate('/reset-password', { state: { email: submittedEmail } })
                    }
                  >
                    Enter Reset Code
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => {
                      setIsSubmitted(false);
                      setSubmittedEmail('');
                    }}
                  >
                    Try Different Email
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              &larr; Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reset Password</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Enter your email address and we&apos;ll send you a code to reset your password.
            </p>
          </CardHeader>

          <CardBody>
            {/* noValidate: let React Hook Form + Zod surface inline errors instead of
                native browser bubbles (type="email"/required would otherwise block
                submission before the resolver runs). */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {submitError && (
                <div
                  className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-sm text-red-800 dark:text-red-300">{submitError}</p>
                </div>
              )}

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
                autoFocus
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
