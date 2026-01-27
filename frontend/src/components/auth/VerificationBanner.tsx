import React, { useState } from 'react';
import Button from '../ui/Button';
import { authService } from '../../services/authService';

export interface VerificationBannerProps {
  /**
   * User's email address
   */
  email?: string;

  /**
   * Callback when verification code is sent successfully
   */
  onResendSuccess?: () => void;

  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * VerificationBanner component - Banner for unverified users with resend option
 * Displays a prominent notification and allows users to resend verification email
 */
function VerificationBanner({ email, onResendSuccess, className = '' }: VerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  // Resend cooldown effect
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [resendCooldown]);

  const handleResend = async () => {
    try {
      setIsResending(true);
      setError('');
      setSuccessMessage('');

      await authService.resendVerification();

      setSuccessMessage('Verification email sent! Check your inbox.');
      setResendCooldown(60); // 60 second cooldown
      setIsResending(false);
      onResendSuccess?.();
    } catch (err) {
      setIsResending(false);
      const message = err instanceof Error ? err.message : 'Failed to send verification email.';
      setError(message);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={`bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Email verification required
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              Please verify your email address{email ? ` (${email})` : ''} to access all features.
              Check your inbox for the verification email.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded">
                <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
              </div>
            )}

            {/* Resend Button */}
            <div className="mt-3 flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResend}
                isLoading={isResending}
                disabled={isResending || resendCooldown > 0}
                className="border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Resend (${resendCooldown}s)`
                    : 'Resend verification email'}
              </Button>
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <div className="ml-auto pl-3">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="inline-flex text-yellow-400 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded"
            aria-label="Dismiss notification"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerificationBanner;
