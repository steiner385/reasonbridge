/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Topic } from '../../services/onboardingService';

export interface TopicCardProps {
  /**
   * The topic data to display
   */
  topic: Topic;

  /**
   * Whether the topic is selected
   */
  isSelected: boolean;

  /**
   * Priority number if selected (1-3)
   */
  priority?: number;

  /**
   * Callback when the topic is clicked
   */
  onClick: () => void;

  /**
   * Callback when a priority is selected
   */
  onPrioritySelect?: (priority: number) => void;

  /**
   * Whether priority selection UI is enabled
   */
  enablePrioritySelection?: boolean;
}

/**
 * Get activity level badge styling based on activity level
 */
const getActivityBadge = (activityLevel: string) => {
  switch (activityLevel) {
    case 'HIGH':
      return {
        color:
          'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
        icon: (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ),
        text: 'High Activity',
      };
    case 'MEDIUM':
      return {
        color:
          'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
        icon: (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        ),
        text: 'Medium Activity',
      };
    case 'LOW':
      return {
        color:
          'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
        icon: (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
        text: 'Low Activity',
      };
    default:
      return {
        color:
          'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
        icon: null,
        text: 'Unknown',
      };
  }
};

/**
 * TopicCard component - Displays a topic with name, description, and activity level
 * Features selection state, priority badges, and activity indicators
 */
export const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  isSelected,
  priority,
  onClick,
  onPrioritySelect,
  enablePrioritySelection = false,
}) => {
  const activityBadge = getActivityBadge(topic.activityLevel);

  return (
    <div
      className={`
        relative rounded-lg border-2 p-4 cursor-pointer transition-all
        ${
          isSelected
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-700 shadow-md'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
        }
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${topic.name} - ${activityBadge.text}. ${isSelected ? 'Selected' : 'Not selected'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Priority Badge (top right) */}
      {isSelected && priority && (
        <div
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm shadow-md"
          aria-label={`Priority ${priority}`}
        >
          {priority}
        </div>
      )}

      {/* Topic Name */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 pr-10">
        {topic.name}
      </h3>

      {/* Topic Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{topic.description}</p>

      {/* Activity Badge and Stats */}
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${activityBadge.color}`}
        >
          {activityBadge.icon}
          {activityBadge.text}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1" title="Active discussions">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clipRule="evenodd"
              />
            </svg>
            {topic.activeDiscussionCount}
          </span>
          <span className="flex items-center gap-1" title="Participants">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {topic.participantCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Priority Selection (when enabled and selected) */}
      {isSelected && enablePrioritySelection && onPrioritySelect && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Set Priority (1 = highest):
          </label>
          <div className="flex gap-2">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrioritySelect(p);
                }}
                className={`
                  flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    priority === p
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
                aria-label={`Set priority to ${p}`}
                aria-pressed={priority === p}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selection Checkbox */}
      <div className="absolute bottom-2 left-2">
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${isSelected ? 'bg-primary-600 border-primary-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}
          `}
          aria-hidden="true"
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicCard;
