/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

interface ChildActivitySummary {
  childDisplayName: string;
  accountCreatedAt: string;
  consentStatus: 'VERIFIED' | 'PENDING' | 'WITHDRAWN';
  consentVerifiedAt?: string;
  lastActivityAt?: string;
  activitySummary: {
    topicsParticipated: number;
    responsesPosted: number;
  };
}

/**
 * Parental Dashboard page for viewing child activity and managing consent
 *
 * @remarks
 * This page allows parents to:
 * - View their child's activity summary
 * - See when the account was created
 * - See when consent was verified
 * - Withdraw consent if desired
 *
 * Authentication is via the consent token in the URL, not login.
 */
function ParentalDashboardPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ChildActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!token) {
        setError('Invalid dashboard link');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/parental-dashboard/child/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Invalid or expired dashboard link');
          }
          throw new Error('Failed to load dashboard');
        }

        const data = await response.json();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [token]);

  const handleWithdrawConsent = async () => {
    if (!token) return;

    setIsWithdrawing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/parental-dashboard/withdraw/${token}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to withdraw consent');
      }

      setWithdrawSuccess(true);
      setShowWithdrawModal(false);

      // Refresh summary after withdrawal
      const summaryResponse = await fetch(`${API_BASE_URL}/parental-dashboard/child/${token}`);
      if (summaryResponse.ok) {
        setSummary(await summaryResponse.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw consent');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card variant="default" padding="lg" className="max-w-md w-full text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-700 dark:text-red-400"
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Error</h2>
          </CardHeader>
          <CardBody>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <Button variant="primary" onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Parental Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor and manage your child&apos;s ReasonBridge account
          </p>
        </div>

        {/* Success Message */}
        {withdrawSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-green-700 dark:text-green-300 font-medium">
                Consent has been successfully withdrawn
              </p>
            </div>
          </div>
        )}

        {/* Child Info Card */}
        <Card variant="default" padding="lg" className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-primary-600 dark:text-primary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {summary.childDisplayName}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Account created {formatDate(summary.accountCreatedAt)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {/* Consent Status */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Consent Status
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    summary.consentStatus === 'VERIFIED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : summary.consentStatus === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {summary.consentStatus}
                </span>
                {summary.consentVerifiedAt && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Verified {formatDate(summary.consentVerifiedAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Activity Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {summary.activitySummary.topicsParticipated}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Topics Participated</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {summary.activitySummary.responsesPosted}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Responses Posted</p>
              </div>
            </div>

            {/* Last Activity */}
            {summary.lastActivityAt && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Last Activity
                </h3>
                <p className="text-gray-900 dark:text-gray-100">
                  {formatDate(summary.lastActivityAt)}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Withdraw Consent Card */}
        {summary.consentStatus !== 'WITHDRAWN' && (
          <Card variant="default" padding="lg" className="border-red-200 dark:border-red-800">
            <CardBody>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-red-700 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Withdraw Consent
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    If you wish to withdraw your consent, your child will have restricted access to
                    ReasonBridge. They will be able to view content but not participate in
                    discussions.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={isWithdrawing}
                  >
                    Withdraw Consent
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* About ReasonBridge */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            ReasonBridge is a platform for thoughtful, evidence-based discussions. We take child
            safety seriously and provide parents with full control over their children&apos;s
            accounts.
          </p>
        </div>
      </div>

      {/* Withdraw Confirmation Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Confirm Consent Withdrawal"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowWithdrawModal(false)}
              disabled={isWithdrawing}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleWithdrawConsent} isLoading={isWithdrawing}>
              Yes, Withdraw Consent
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to withdraw your consent for{' '}
            <strong>{summary.childDisplayName}</strong>&apos;s ReasonBridge account?
          </p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>What happens after withdrawal:</strong>
            </p>
            <ul className="text-sm text-amber-600 dark:text-amber-400 list-disc list-inside mt-2">
              <li>Your child will have read-only access to the platform</li>
              <li>They will not be able to create topics or post responses</li>
              <li>Existing content will remain visible</li>
              <li>You can grant consent again at any time</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ParentalDashboardPage;
