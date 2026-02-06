/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { authService } from '../services/authService';

/**
 * EmailVerificationPage component - 6-digit code verification with auto-focus
 * Allows users to verify their email address and resend verification codes
 */
export const EmailVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs for input fields
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [resendCooldown]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newCode.every((digit) => digit !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle right arrow
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length === 6) {
          setCode(digits);
          inputRefs.current[5]?.focus();
          handleVerify(digits.join(''));
        }
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');

    if (digits.length === 6) {
      setCode(digits);
      inputRefs.current[5]?.focus();
      handleVerify(digits.join(''));
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');

    if (codeToVerify.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await authService.verifyEmail(codeToVerify);

      // Check onboarding progress and redirect accordingly
      if (response.onboardingProgress.topicsSelected) {
        navigate('/home', { replace: true });
      } else {
        navigate('/onboarding/topics', { replace: true });
      }
    } catch (err) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      setError(message);
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      setError('');
      setSuccessMessage('');

      await authService.resendVerification();

      setSuccessMessage('Verification code sent! Check your email.');
      setResendCooldown(60); // 60 second cooldown
      setIsResending(false);
    } catch (err) {
      setIsResending(false);
      const message = err instanceof Error ? err.message : 'Failed to resend verification email.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            We sent a 6-digit code to your email address. Enter it below to continue.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Error Message */}
          {error && (
            <div
              className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div
              className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          {/* 6-Digit Code Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
              Verification Code
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  aria-label={`Digit ${index + 1}`}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Verify Button */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => handleVerify()}
            isLoading={isLoading}
            disabled={isLoading || code.join('').length !== 6}
            className="mb-4"
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </Button>

          {/* Resend Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Didn't receive the code?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium focus:outline-none focus:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending
                ? 'Sending...'
                : resendCooldown > 0
                  ? `Resend code (${resendCooldown}s)`
                  : 'Resend verification code'}
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              authService.logout();
              navigate('/', { replace: true });
            }}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-200 focus:outline-none focus:underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
