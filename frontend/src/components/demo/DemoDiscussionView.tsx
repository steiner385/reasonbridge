import React from 'react';
import type { DemoDiscussion } from '../../services/demoService';

interface DemoDiscussionViewProps {
  discussion: DemoDiscussion;
  onJoinPrompt: () => void;
}

/**
 * DemoDiscussionView component displays a single demo discussion
 * Shows discussion details with common ground findings and view spectrum
 */
export const DemoDiscussionView: React.FC<DemoDiscussionViewProps> = ({
  discussion,
  onJoinPrompt,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const getTotalVotes = (): number => {
    const { viewsSpectrum } = discussion;
    return (
      viewsSpectrum.stronglySupport +
      viewsSpectrum.support +
      viewsSpectrum.neutral +
      viewsSpectrum.oppose +
      viewsSpectrum.stronglyOppose
    );
  };

  const getPositionPercentage = (count: number): number => {
    const total = getTotalVotes();
    return total > 0 ? (count / total) * 100 : 0;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 transition-transform hover:scale-[1.01]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 rounded-full">
            {discussion.topic}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(discussion.createdAt)}
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{discussion.title}</h3>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <svg
            className="w-4 h-4"
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
          <span>{discussion.participantCount} participants</span>
        </div>
        <div className="flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{discussion.propositionCount} propositions</span>
        </div>
      </div>

      {/* Common Ground Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Common Ground Found
          </span>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatPercentage(discussion.commonGroundScore)}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
            style={{ width: `${discussion.commonGroundScore * 100}%` }}
            role="progressbar"
            aria-valuenow={discussion.commonGroundScore * 100}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Top Common Ground */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Areas of Agreement:
        </h4>
        <ul className="space-y-2">
          {discussion.topCommonGround.map((point, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <svg
                className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Views Spectrum */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Participant Positions:
        </h4>
        <div className="space-y-2">
          {[
            {
              label: 'Strongly Support',
              count: discussion.viewsSpectrum.stronglySupport,
              color: 'bg-green-600',
            },
            { label: 'Support', count: discussion.viewsSpectrum.support, color: 'bg-green-400' },
            { label: 'Neutral', count: discussion.viewsSpectrum.neutral, color: 'bg-gray-400' },
            { label: 'Oppose', count: discussion.viewsSpectrum.oppose, color: 'bg-red-400' },
            {
              label: 'Strongly Oppose',
              count: discussion.viewsSpectrum.stronglyOppose,
              color: 'bg-red-600',
            },
          ].map(({ label, count, color }) => {
            const percentage = getPositionPercentage(count);
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 w-28">{label}</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`${color} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={onJoinPrompt}
        className="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Join to participate in this discussion"
      >
        View Full Discussion →
      </button>
    </div>
  );
};
