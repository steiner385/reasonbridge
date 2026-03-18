/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TrendingTopics Component
 *
 * Displays a list of trending topics based on recent activity.
 * Shows activity metrics and allows navigation to topic details.
 */

import { Link } from 'react-router-dom';
import { useTrendingTopics } from '../../hooks/useRecommendations';
import Card, { CardHeader, CardBody } from '../ui/Card';
import type { TrendingTopic } from '../../types/recommendations';

interface TrendingTopicsProps {
  /** Number of hours to look back for trending calculation */
  hours?: number;
  /** Maximum number of topics to show */
  limit?: number;
  /** Optional tag filter */
  tags?: string[];
  /** Show compact version */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get activity level color based on score
 */
function getActivityColor(score: number): string {
  if (score >= 0.7) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (score >= 0.4)
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

/**
 * Trending topic card
 */
function TrendingTopicCard({ topic, compact }: { topic: TrendingTopic; compact: boolean }) {
  return (
    <Link
      to={`/topics/${topic.slug}`}
      className={`block ${compact ? 'p-2' : 'p-3'} rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className={`shrink-0 ${compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center`}
        >
          #{topic.rank}
        </div>

        <div className="flex-1 min-w-0">
          <h4
            className={`font-medium text-gray-900 dark:text-gray-100 truncate ${compact ? 'text-sm' : ''}`}
          >
            {topic.title}
          </h4>

          {!compact && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
              {topic.description}
            </p>
          )}

          <div className={`flex items-center gap-2 flex-wrap ${compact ? 'mt-1' : 'mt-2'}`}>
            {/* Activity metrics */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getActivityColor(topic.trendingScore)}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              {topic.recentResponseCount} responses
            </span>

            <span className="text-xs text-gray-500 dark:text-gray-400">
              {topic.recentParticipantCount} participants
            </span>
          </div>

          {/* Tags */}
          {!compact && topic.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {topic.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                >
                  {tag.name}
                </span>
              ))}
              {topic.tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{topic.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function TrendingTopics({
  hours = 24,
  limit = 5,
  tags,
  compact = false,
  className = '',
}: TrendingTopicsProps) {
  const { data, isLoading, error } = useTrendingTopics({ hours, limit, tags });

  if (error) {
    return (
      <Card className={className}>
        <CardBody>
          <p className="text-sm text-gray-500 dark:text-gray-400">Unable to load trending topics</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
              />
            </svg>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Trending</h3>
          </div>
          {data && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last {data.timeWindowHours}h
            </span>
          )}
        </div>
      </CardHeader>

      <CardBody>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-3 p-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.topics.length ? (
          <div className="space-y-2">
            {data.topics.map((topic) => (
              <TrendingTopicCard key={topic.id} topic={topic} compact={compact} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No trending topics right now
          </p>
        )}

        {data?.topics.length ? (
          <Link
            to="/topics?sort=trending"
            className="block mt-4 text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            View all trending topics
          </Link>
        ) : null}
      </CardBody>
    </Card>
  );
}

export default TrendingTopics;
