import React from 'react';
import type { SocialProof } from '../../services/demoService';

interface DemoMetricsProps {
  socialProof: SocialProof;
}

/**
 * DemoMetrics component displays platform social proof statistics
 * Shows aggregate metrics to demonstrate platform effectiveness
 */
export const DemoMetrics: React.FC<DemoMetricsProps> = ({ socialProof }) => {
  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Real Results from Real Discussions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Common Ground Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Common Ground Found
            </span>
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatPercentage(socialProof.averageCommonGroundScore)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Average across discussions
          </p>
        </div>

        {/* Total Participants */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Participants
            </span>
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatNumber(socialProof.totalParticipants)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Contributing diverse perspectives
          </p>
        </div>

        {/* Platform Satisfaction */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              User Satisfaction
            </span>
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatPercentage(socialProof.platformSatisfaction)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Report positive experience
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Join thousands finding common ground through thoughtful discussion
        </p>
      </div>
    </div>
  );
};
