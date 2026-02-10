/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuthContext } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';

interface ConsentStatus {
  status: 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'WITHDRAWN';
  parentEmail?: string | null;
  expiresAt?: string | null;
  verifiedAt?: string | null;
}

interface ResendResponse {
  message: string;
  expiresAt: string;
}

/**
 * Page shown to minor users when their parental consent is pending
 *
 * @remarks
 * This page:
 * - Shows the current consent status
 * - Allows resending the consent email
 * - Provides guidance on next steps
 */
function ConsentPendingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (authLoading) return;

      if (!isAuthenticated) {
        navigate('/');
        return;
      }

      try {
        const data = await apiClient.get<ConsentStatus>('/parental-consent/status');
        setStatus(data);

        // If consent is verified, redirect to home
        if (data.status === 'VERIFIED') {
          navigate('/');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [isAuthenticated, authLoading, navigate]);

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await apiClient.post<ResendResponse>('/parental-consent/resend');
      setSuccessMessage(data.message);

      // Refresh status
      const newStatus = await apiClient.get<ConsentStatus>('/parental-consent/status');
      setStatus(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const expiresAt = status?.expiresAt ? new Date(status.expiresAt) : null;
  const formattedExpiry = expiresAt
    ? expiresAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <Card variant="default" padding="lg" className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Parental Consent Required
          </h2>
        </CardHeader>

        <CardBody>
          <div className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4">
                <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
              </div>
            )}

            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Hi {user?.displayName || 'there'}! We&apos;ve sent a consent request to your parent
                or guardian.
              </p>

              {status?.parentEmail && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email sent to:</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {status.parentEmail}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-400">
                The consent link expires on <strong>{formattedExpiry}</strong>
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <li>1. Your parent/guardian will receive an email with a consent link</li>
                <li>2. They click the link to verify their consent</li>
                <li>3. Once verified, you&apos;ll have full access to the platform</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                isLoading={isResending}
                onClick={handleResend}
              >
                Resend Consent Email
              </Button>
              <Button variant="ghost" size="md" fullWidth onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default ConsentPendingPage;
