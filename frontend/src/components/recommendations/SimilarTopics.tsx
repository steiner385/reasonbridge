/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SimilarTopics Component
 *
 * Displays topics similar to a given topic based on shared tags
 * and content similarity. Useful for topic detail pages.
 */

import { Link } from 'react-router-dom';
import { useSimilarTopics } from '../../hooks/useRecommendations';
import Card, { CardHeader, CardBody } from '../ui/Card';
import type { SimilarTopic } from '../../types/recommendations';

interface SimilarTopicsProps {
  /** The topic ID to find similar topics for */
  topicId: string;
  /** Maximum number of similar topics to show */
  limit?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get similarity badge color based on score
 */
function getSimilarityColor(score: number): string {
  if (score >= 0.7) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (score >= 0.4) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

/**
 * Similar topic card
 */
function SimilarTopicCard({ topic }: { topic: SimilarTopic }) {
  const similarityPercent = Math.round(topic.similarityScore * 100);

  return (
    <Link
      to={`/topics/${topic.slug}`}
      className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{topic.title}</h4>

          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
            {topic.description}
          </p>

          {/* Shared tags */}
          {topic.sharedTags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">Shared:</span>
              {topic.sharedTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded"
                >
                  {tag}
                </span>
              ))}
              {topic.sharedTags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{topic.sharedTags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Similarity score badge */}
        <span
          className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded ${getSimilarityColor(topic.similarityScore)}`}
          title={`${similarityPercent}% similar`}
        >
          {similarityPercent}%
        </span>
      </div>
    </Link>
  );
}

export function SimilarTopics({ topicId, limit = 5, className = '' }: SimilarTopicsProps) {
  const { data, isLoading, error } = useSimilarTopics(topicId, limit);

  // Don't render anything if no topic ID or no similar topics
  if (!topicId || (data && data.similarTopics.length === 0)) {
    return null;
  }

  if (error) {
    return null; // Silently fail - similar topics are not critical
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-500"
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
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Related Discussions</h3>
        </div>
      </CardHeader>

      <CardBody>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse p-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {data?.similarTopics.map((topic) => (
              <SimilarTopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default SimilarTopics;
