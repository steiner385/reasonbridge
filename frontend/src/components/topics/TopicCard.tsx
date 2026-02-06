/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '../ui/Card';
import type { Topic } from '../../types/topic';

export interface TopicCardProps {
  /**
   * The topic data to display
   */
  topic: Topic;

  /**
   * Whether to show the full description or truncate it
   */
  truncateDescription?: boolean;

  /**
   * Custom CSS class name for the card wrapper
   */
  className?: string;

  /**
   * Callback when the card is clicked
   */
  onClick?: () => void;
}

function TopicCard({ topic, truncateDescription = true, className = '', onClick }: TopicCardProps) {
  const getStatusColor = (status: Topic['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'SEEDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card
      variant="default"
      padding="lg"
      hoverable
      clickable={!!onClick}
      className={className}
      onClick={onClick}
      data-testid="topic-card"
    >
      <CardHeader title={topic.title}>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(topic.status)}`}>
            {topic.status}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(topic.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>

      <CardBody>
        <p className={`text-gray-700 mb-4 ${truncateDescription ? 'line-clamp-2' : ''}`}>
          {topic.description}
        </p>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>{topic.participantCount} participants</span>
          </div>

          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span>{topic.responseCount} responses</span>
          </div>

          {topic.currentDiversityScore !== null && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>Diversity: {topic.currentDiversityScore.toFixed(1)}</span>
            </div>
          )}
        </div>

        {topic.tags && topic.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {topic.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <Link
          to={`/topics/${topic.id}`}
          className="inline-block text-primary-600 hover:text-primary-700 font-medium text-sm"
        >
          View Discussion →
        </Link>
      </CardBody>
    </Card>
  );
}

export default TopicCard;
