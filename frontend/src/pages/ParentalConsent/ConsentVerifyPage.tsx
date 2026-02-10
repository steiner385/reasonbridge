/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface VerifyResult {
  success: boolean;
  childDisplayName?: string;
  error?: string;
}

/**
 * Page for parents to verify their consent
 *
 * @remarks
 * This page:
 * - Extracts the token from the URL
 * - Calls the verification API
 * - Shows success or error message
 */
function ConsentVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] || 'http://localhost:3001';

  useEffect(() => {
    const verifyConsent = async () => {
      if (!token) {
        setResult({ success: false, error: 'No consent token provided' });
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/parental-consent/verify/${token}`);
        const data = await response.json();
        setResult(data);
      } catch {
        setResult({ success: false, error: 'Failed to verify consent. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    };

    verifyConsent();
  }, [token, apiBaseUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Verifying consent...</p>
        </div>
      </div>
    );
  }

  if (result?.success) {
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
                className="w-8 h-8 text-red-600 dark:text-red-400"
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
              {result?.error || 'We could not verify your consent.'}
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
