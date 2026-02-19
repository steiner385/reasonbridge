/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';

interface ConsentRequiredRouteProps {
  children: React.ReactNode;
}

/**
 * Message shown when consent has been withdrawn
 */
function ConsentWithdrawnMessage() {
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
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Parental Consent Withdrawn
          </h2>
        </CardHeader>
        <CardBody>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your parent or guardian has withdrawn consent for your account. You can view content on
            ReasonBridge, but you cannot create topics or post responses.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            If you believe this is a mistake, please ask your parent or guardian to restore consent
            via the parental dashboard link in their email.
          </p>
          <Button variant="secondary" onClick={() => (window.location.href = '/')}>
            Browse Topics
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * Route guard component that ensures minors have verified parental consent
 *
 * @remarks
 * This component wraps protected routes that require verified parental consent.
 * For minors without verified consent:
 * - PENDING status: Redirects to /parental-consent/pending
 * - WITHDRAWN status: Shows a message explaining restricted access
 *
 * Adults and minors with VERIFIED consent can access the wrapped content.
 *
 * @example
 * ```tsx
 * <Route
 *   path="/topics/create"
 *   element={
 *     <ProtectedRoute>
 *       <ConsentRequiredRoute>
 *         <CreateTopicPage />
 *       </ConsentRequiredRoute>
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
export function ConsentRequiredRoute({ children }: ConsentRequiredRouteProps) {
  const { user, isLoading } = useAuthContext();

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // If not logged in, let ProtectedRoute handle the redirect
  if (!user) {
    return <>{children}</>;
  }

  // If user is not a minor, no consent needed
  if (!user.isMinor) {
    return <>{children}</>;
  }

  // If user is a minor, check consent status
  switch (user.parentConsentStatus) {
    case 'VERIFIED':
    case 'NOT_REQUIRED':
      // Consent verified or not required, allow access
      return <>{children}</>;

    case 'PENDING':
      // Redirect to pending consent page
      return <Navigate to="/parental-consent/pending" replace />;

    case 'WITHDRAWN':
      // Show withdrawn message
      return <ConsentWithdrawnMessage />;

    default:
      // Unknown status, redirect to pending to be safe
      return <Navigate to="/parental-consent/pending" replace />;
  }
}

export default ConsentRequiredRoute;
