/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Orientation Page Component
 *
 * Displays the orientation overlay for new users after topic selection.
 * Handles marking orientation as viewed/skipped and redirects to next step.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import OrientationOverlay from '../../components/onboarding/OrientationOverlay';
import {
  onboardingService,
  type OnboardingProgressResponse,
} from '../../services/onboardingService';

/**
 * OrientationPage component
 */
const OrientationPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await onboardingService.getOnboardingProgress();

      // Check if user should see orientation
      if (!data.progress.orientationViewed) {
        setShowOverlay(true);
      } else {
        // Already viewed, redirect to next step
        redirectToNextStep(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orientation');
      console.error('Failed to fetch onboarding progress:', err);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Fetch onboarding progress to determine next step
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const redirectToNextStep = (progressData: OnboardingProgressResponse) => {
    if (progressData.nextAction) {
      navigate(progressData.nextAction.actionUrl);
    } else {
      // Default to home if no next action
      navigate('/');
    }
  };

  const handleComplete = async () => {
    try {
      setShowOverlay(false);
      await onboardingService.markOrientationViewed(true, false);

      // Fetch updated progress to get next action
      const updatedProgress = await onboardingService.getOnboardingProgress();
      redirectToNextStep(updatedProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save orientation progress');
      console.error('Failed to mark orientation as viewed:', err);
    }
  };

  const handleSkip = async () => {
    try {
      setShowOverlay(false);
      await onboardingService.markOrientationViewed(false, true);

      // Fetch updated progress to get next action
      const updatedProgress = await onboardingService.getOnboardingProgress();
      redirectToNextStep(updatedProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip orientation');
      console.error('Failed to mark orientation as skipped:', err);
    }
  };

  const handleDismiss = async () => {
    try {
      setShowOverlay(false);
      await onboardingService.markOrientationViewed(false, true);

      // Fetch updated progress to get next action
      const updatedProgress = await onboardingService.getOnboardingProgress();
      redirectToNextStep(updatedProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss orientation');
      console.error('Failed to dismiss orientation:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading orientation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900 text-center">
            Something went wrong
          </h3>
          <p className="mt-2 text-sm text-gray-600 text-center">{error}</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={fetchProgress}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content - visible underneath overlay with blur */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to ReasonBridge</h1>
          <p className="text-xl text-gray-600">
            Let's take a quick tour of how our platform helps you engage in meaningful discussions.
          </p>
        </div>

        {/* Placeholder content showing platform features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Proposition-Based Discussions
            </h3>
            <p className="text-gray-600">
              Break down complex topics into clear, votable propositions.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Insights</h3>
            <p className="text-gray-600">
              Get helpful feedback to improve your arguments and find common ground.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Common Ground</h3>
            <p className="text-gray-600">
              Visualize where participants agree and discover shared values.
            </p>
          </div>
        </div>
      </div>

      {/* Orientation overlay */}
      <OrientationOverlay
        isOpen={showOverlay}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onDismiss={handleDismiss}
      />
    </div>
  );
};

export default OrientationPage;
