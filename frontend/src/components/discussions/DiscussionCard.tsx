/**
 * T029 [P] [US1] - Discussion Card Component (Feature 009)
 *
 * Displays a discussion summary in list view
 * Shows: title, creator, response count, participant count, last activity time
 */

import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import type { DiscussionResponse } from '../../services/discussionService';

export interface DiscussionCardProps {
  discussion: DiscussionResponse;
}

export function DiscussionCard({ discussion }: DiscussionCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link to={`/discussions/${discussion.id}`} className="block">
      <Card
        variant="elevated"
        padding="lg"
        className="transition-all hover:shadow-lg hover:border-blue-300"
      >
        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
          {discussion.title}
        </h3>

        {/* Creator info */}
        <div className="text-sm text-gray-600 mb-4">
          Started by <span className="font-medium">{discussion.creator.displayName}</span>
          <span className="mx-1">·</span>
          <time dateTime={discussion.createdAt}>{formatDate(discussion.createdAt)}</time>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {/* Response Count */}
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>
              {discussion.responseCount} response{discussion.responseCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Participant Count */}
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>
              {discussion.participantCount} participant
              {discussion.participantCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Last Activity */}
          <div className="flex items-center gap-1 ml-auto">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Last activity {formatDate(discussion.lastActivityAt)}</span>
          </div>
        </div>

        {/* Status Badge (if not active) */}
        {discussion.status !== 'ACTIVE' && (
          <div className="mt-3">
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                discussion.status === 'ARCHIVED'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {discussion.status}
            </span>
          </div>
        )}
      </Card>
    </Link>
  );
}
