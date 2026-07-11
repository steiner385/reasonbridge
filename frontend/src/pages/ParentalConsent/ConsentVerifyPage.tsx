/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PrivacyPolicySummary, { type RegulationType } from './PrivacyPolicySummary';

interface ConsentDetails {
  childDisplayName: string;
  regulation?: RegulationType;
  valid: boolean;
  error?: string;
}

interface VerifyResult {
  success: boolean;
  childDisplayName?: string;
  error?: string;
}

type PageState = 'loading' | 'review' | 'verifying' | 'success' | 'error';

/**
 * Extracts a human-readable error message from a consent API payload.
 *
 * @remarks
 * The consent endpoints return `{ valid/success, error }` payloads, but generic
 * HTTP failures (e.g. an unknown route) come back as the NestJS error envelope
 * `{ statusCode, message, error: 'Not Found' }`, where `error` is just the HTTP
 * status text. Only trust `error` when the payload matches the consent
 * contract; otherwise fall back to a user-friendly message.
 */
function extractConsentError(
  data: unknown,
  contractFlag: 'valid' | 'success',
  fallback: string,
): string {
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if (typeof payload[contractFlag] === 'boolean' && typeof payload['error'] === 'string') {
      return payload['error'];
    }
  }
  return fallback;
}

/**
 * Page for parents to verify their consent
 *
 * @remarks
 * This page implements a two-step consent flow:
 * 1. Shows privacy policy summary and consent checkbox for parent review
 * 2. On explicit consent, calls the verification API
 * 3. Shows success or error message
 *
 * This ensures parents have reviewed the privacy policy before granting consent.
 */
function ConsentVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [consentDetails, setConsentDetails] = useState<ConsentDetails | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default to '/api' to match apiClient (lib/api.ts), routed via the nginx/vite
  // proxy, instead of a hardcoded host:port (see issue #1334).
  const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] || '/api';

  // Fetch consent details without auto-verifying
  useEffect(() => {
    const fetchConsentDetails = async () => {
      if (!token) {
        setErrorMessage('No consent token provided');
        setPageState('error');
        return;
      }

      try {
        // Fetch consent details (GET request to preview endpoint)
        const response = await fetch(`${apiBaseUrl}/parental-consent/preview/${token}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
          setErrorMessage(extractConsentError(data, 'valid', 'Invalid or expired consent link'));
          setPageState('error');
          return;
        }

        setConsentDetails(data);
        setPageState('review');
      } catch {
        setErrorMessage('Failed to load consent details. Please try again.');
        setPageState('error');
      }
    };

    fetchConsentDetails();
  }, [token, apiBaseUrl]);

  // Handle explicit consent verification
  const handleGrantConsent = useCallback(async () => {
    if (!token || !isConsentChecked) return;

    setPageState('verifying');

    try {
      const response = await fetch(`${apiBaseUrl}/parental-consent/verify/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (data.success) {
        setResult(data);
        setPageState('success');
      } else {
        setErrorMessage(extractConsentError(data, 'success', 'Invalid or expired consent link'));
        setPageState('error');
      }
    } catch {
      setErrorMessage('Failed to verify consent. Please try again.');
      setPageState('error');
    }
  }, [token, apiBaseUrl, isConsentChecked]);

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading consent details...</p>
        </div>
      </div>
    );
  }

  // Verifying state
  if (pageState === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Verifying consent...</p>
        </div>
      </div>
    );
  }

  // Review state - show privacy summary and consent checkbox
  if (pageState === 'review' && consentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
        <Card variant="default" padding="lg" className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary-600 dark:text-primary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
              Parental Consent Request
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center mt-2">
              {consentDetails.childDisplayName} has requested your permission to use ReasonBridge
            </p>
          </CardHeader>

          <CardBody>
            <div className="space-y-6">
              {/* Privacy Policy Summary */}
              <PrivacyPolicySummary
                childName={consentDetails.childDisplayName}
                regulation={consentDetails.regulation || 'COPPA'}
              />

              {/* Consent Checkbox */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isConsentChecked}
                    onChange={(e) => setIsConsentChecked(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    aria-describedby="consent-description"
                  />
                  <span
                    id="consent-description"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    I have read and understand the privacy policy summary above. I grant consent for{' '}
                    <strong>{consentDetails.childDisplayName}</strong> to use ReasonBridge and
                    understand I can withdraw this consent at any time.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleGrantConsent}
                  disabled={!isConsentChecked}
                >
                  Grant Consent
                </Button>
                <Button variant="secondary" size="lg" fullWidth onClick={() => navigate('/')}>
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                By granting consent, you agree to our{' '}
                <a
                  href="/terms"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/privacy"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Success state
  if (pageState === 'success' && result?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
        <Card variant="default" padding="lg" className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
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
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
              Consent Verified!
            </h2>
          </CardHeader>

          <CardBody>
            <div className="space-y-6 text-center">
              <p className="text-gray-600 dark:text-gray-300">
                Thank you for granting consent for <strong>{result.childDisplayName}</strong> to use
                ReasonBridge.
              </p>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                  What happens now?
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {result.childDisplayName} now has full access to the platform. They can
                  participate in discussions, share ideas, and learn critical thinking skills in a
                  safe, moderated environment.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  About ReasonBridge
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 text-left">
                  <li>- Structured debates and thoughtful discussions</li>
                  <li>- AI-powered feedback to encourage good reasoning</li>
                  <li>- Bias detection and claim verification</li>
                  <li>- A moderated, safe environment</li>
                </ul>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                You can withdraw consent at any time by contacting our support team.
              </p>

              <Button variant="primary" size="md" onClick={() => navigate('/')}>
                Visit ReasonBridge
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <Card variant="default" padding="lg" className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
            Verification Failed
          </h2>
        </CardHeader>

        <CardBody>
          <div className="space-y-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              {errorMessage || result?.error || 'We could not verify your consent.'}
            </p>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">Common Issues</h4>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-2 text-left">
                <li>- The consent link may have expired (valid for 7 days)</li>
                <li>- The link may have already been used</li>
                <li>- The link may be incomplete - make sure you copied the entire URL</li>
              </ul>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              If you believe this is an error, please ask your child to resend the consent request
              from their account settings.
            </p>

            <Button variant="secondary" size="md" onClick={() => navigate('/')}>
              Go to Homepage
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default ConsentVerifyPage;
