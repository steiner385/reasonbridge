/**
 * T044 [P] [US2] - Response Item Component (Feature 009)
 *
 * Displays an individual response with:
 * - Author info and timestamp
 * - Response content
 * - Citations (if any)
 * - Edit indicator (if edited)
 * - Reply button and nested replies (Phase 5)
 */

import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { ResponseDetail } from '../../services/discussionService';

export interface ResponseItemProps {
  response: ResponseDetail;
  discussionId: string;
  showReplies?: boolean;
  depth?: number;
}

export function ResponseItem({
  response,
  discussionId,
  showReplies = false,
  depth = 0,
}: ResponseItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);

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

  // Maximum visual nesting depth
  const maxDepth = 5;
  const visualDepth = Math.min(depth, maxDepth);
  const indentClass = visualDepth > 0 ? `ml-${Math.min(visualDepth * 4, 16)}` : '';

  return (
    <div className={indentClass}>
      <Card
        variant={depth === 0 ? 'elevated' : 'outline'}
        padding="lg"
        className="transition-colors hover:bg-gray-50"
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar Placeholder */}
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {response.author.displayName.charAt(0).toUpperCase()}
          </div>

          {/* Author and Timestamp */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{response.author.displayName}</span>
              <span className="text-sm text-gray-500">
                <time dateTime={response.createdAt}>{formatDate(response.createdAt)}</time>
              </span>
              {/* Edit Indicator */}
              {response.editCount > 0 && response.editedAt && (
                <span className="text-sm text-gray-500 italic">
                  (edited {formatDate(response.editedAt)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none mb-4">
          <p className="text-gray-800 whitespace-pre-wrap">{response.content}</p>
        </div>

        {/* Citations */}
        {response.citations && response.citations.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Sources:</p>
            <ul className="space-y-1">
              {response.citations.map((citation, index) => (
                <li key={citation.id} className="text-sm">
                  <a
                    href={citation.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {citation.title || citation.originalUrl}
                  </a>
                  {citation.validationStatus === 'BROKEN' && (
                    <span className="ml-2 text-xs text-red-600">(broken link)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Reply Button (Phase 5) */}
          {showReplies && depth < maxDepth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-gray-600 hover:text-blue-600"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Reply
              {response.replyCount != null && response.replyCount > 0 && (
                <span className="ml-1">({response.replyCount})</span>
              )}
            </Button>
          )}
        </div>

        {/* Reply Form Placeholder (Phase 5) */}
        {showReplyForm && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Reply form will be available in Phase 5 (Threaded Replies)
            </p>
          </div>
        )}
      </Card>

      {/* Nested Replies (Phase 5) */}
      {showReplies && response.replies && response.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {response.replies.map((reply) => (
            <ResponseItem
              key={reply.id}
              response={reply}
              discussionId={discussionId}
              showReplies={showReplies}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
