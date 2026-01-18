/**
 * Verification Page
 * Main page for managing user verification and trust indicators
 */

import { useState } from 'react';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { PhoneVerificationForm } from '../../components/verification/PhoneVerificationForm';
import { VerificationStatusDisplay } from '../../components/verification/VerificationStatusDisplay';

type VerificationView = 'overview' | 'phone' | 'government-id' | 'video';

export const VerificationPage: React.FC = () => {
  const { data: user, isLoading, isError } = useCurrentUser();
  const [currentView, setCurrentView] = useState<VerificationView>('overview');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-64 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Verification</h2>
            <p className="text-red-700">
              Unable to load your verification information. Please try again later.
            </p>
          </div>
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

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Options</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setCurrentView('phone')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition group"
                >
                  <div className="text-2xl mb-2">📱</div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">
                    Phone Verification
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Verify with SMS confirmation
                  </p>
                </button>

                <button
                  onClick={() => setCurrentView('government-id')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition group"
                >
                  <div className="text-2xl mb-2">🪪</div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">
                    Government ID
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload ID document
                  </p>
                </button>

                <button
                  onClick={() => setCurrentView('video')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition group"
                >
                  <div className="text-2xl mb-2">🎥</div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">
                    Video Verification
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Record verification video
                  </p>
                </button>

                <div className="p-4 border-2 border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
                  <div className="text-2xl mb-2">🧪</div>
                  <h4 className="font-semibold text-gray-900">
                    Coming Soon
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
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
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
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
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
            >
              ← Back to Overview
            </button>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Government ID Verification</h3>
              <p className="text-gray-600 mb-4">
                This verification method is not yet available. Please check back soon or try another method.
              </p>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <button
              onClick={() => setCurrentView('overview')}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
            >
              ← Back to Overview
            </button>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Verification</h3>
              <p className="text-gray-600 mb-4">
                This verification method is not yet available. Please check back soon or try another method.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Verification</h1>
          <p className="text-gray-600">
            Verify your identity to unlock trust badges and enhanced features in discussions.
          </p>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
};
