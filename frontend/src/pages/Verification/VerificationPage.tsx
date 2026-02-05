/**
 * Verification Page
 * Main page for managing user verification and trust indicators
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { useAuth } from '../../hooks/useAuth';
import { PhoneVerificationForm } from '../../components/verification/PhoneVerificationForm';
import { VerificationStatusDisplay } from '../../components/verification/VerificationStatusDisplay';

type VerificationView = 'overview' | 'phone' | 'government-id' | 'video';

export const VerificationPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: user, isLoading, isError } = useCurrentUser();
  const [currentView, setCurrentView] = useState<VerificationView>('overview');

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-start gap-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6 flex-shrink-0 text-blue-600 dark:text-blue-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Authentication Required
              </h2>
              <p className="mt-2 text-blue-800 dark:text-blue-200">
                You need to be logged in to access account verification. Please log in or create an
                account to verify your identity and unlock trust badges.
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  to="/signup"
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Sign Up
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center rounded-lg border border-blue-600 bg-transparent px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if API call failed
  if (isError || !user) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Error Loading Verification
          </h2>
          <p className="text-red-700 dark:text-red-200">
            Unable to load your verification information. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <VerificationStatusDisplay currentVerificationLevel={user.verificationLevel} />

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Verification Options
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setCurrentView('phone')}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition group"
                >
                  <div className="text-2xl mb-2">📱</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Phone Verification
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Verify with SMS confirmation
                  </p>
                </button>

                <button
                  onClick={() => setCurrentView('government-id')}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition group"
                >
                  <div className="text-2xl mb-2">🪪</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Government ID
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Upload ID document
                  </p>
                </button>

                <button
                  onClick={() => setCurrentView('video')}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition group"
                >
                  <div className="text-2xl mb-2">🎥</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Video Verification
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Record verification video
                  </p>
                </button>

                <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg opacity-50 cursor-not-allowed">
                  <div className="text-2xl mb-2">🧪</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Coming Soon</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Additional methods
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'phone':
        return (
          <div className="space-y-4">
            <button
              onClick={() => setCurrentView('overview')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-2"
            >
              ← Back to Overview
            </button>
            <PhoneVerificationForm
              onSuccess={() => {
                setCurrentView('overview');
              }}
            />
          </div>
        );

      case 'government-id':
        return (
          <div className="space-y-4">
            <button
              onClick={() => setCurrentView('overview')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-2"
            >
              ← Back to Overview
            </button>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Government ID Verification
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This verification method is not yet available. Please check back soon or try another
                method.
              </p>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <button
              onClick={() => setCurrentView('overview')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-2"
            >
              ← Back to Overview
            </button>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Video Verification
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This verification method is not yet available. Please check back soon or try another
                method.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Account Verification
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Verify your identity to unlock trust badges and enhanced features in discussions.
        </p>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};
