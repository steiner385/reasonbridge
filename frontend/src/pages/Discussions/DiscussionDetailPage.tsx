/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Discussion Detail Page (Feature 009)
 *
 * Displays a single discussion with:
 * - Discussion title and metadata
 * - Initial response
 * - All subsequent responses
 * - Form to add new responses
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDiscussion } from '../../hooks/useDiscussions';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ResponseList } from '../../components/responses/ResponseList';
import { CreateResponseForm } from '../../components/responses/CreateResponseForm';

export function DiscussionDetailPage() {
  const { discussionId } = useParams<{ discussionId: string }>();
  const [showResponseForm, setShowResponseForm] = useState(false);

  const { data: discussion, isLoading, error } = useDiscussion(discussionId!);
  const showSkeleton = useDelayedLoading(isLoading);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card variant="elevated" padding="lg">
          <div className="text-center text-red-600">
            <h2 className="text-xl font-semibold mb-2">Error Loading Discussion</h2>
            <p className="text-gray-600">{error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (showSkeleton) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card variant="elevated" padding="lg">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!discussion) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link to={`/topics/${discussion.topicId}`} className="text-blue-600 hover:underline">
          ← Back to Topic
        </Link>
      </nav>

      {/* Discussion Header */}
      <Card variant="elevated" padding="lg" className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{discussion.title}</h1>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-4">
            <div>
              Started by <span className="font-medium">{discussion.creator.displayName}</span>
            </div>
            <div>{formatDate(discussion.createdAt)}</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>{discussion.responseCount} responses</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>{discussion.participantCount} participants</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        {discussion.status !== 'ACTIVE' && (
          <div className="mb-4">
            <span
              className={`inline-block px-3 py-1 text-sm font-medium rounded ${
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

      {/* Add Response Button */}
      {!showResponseForm && discussion.status === 'ACTIVE' && (
        <div className="mb-6">
          <Button variant="primary" onClick={() => setShowResponseForm(true)} className="w-full">
            Add Response
          </Button>
        </div>
      )}

      {/* Response Form */}
      {showResponseForm && (
        <Card variant="elevated" padding="lg" className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Your Response</h2>
          <CreateResponseForm
            discussionId={discussionId!}
            onSuccess={() => setShowResponseForm(false)}
            onCancel={() => setShowResponseForm(false)}
          />
        </Card>
      )}

      {/* Responses Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Responses ({discussion.responseCount})
        </h2>
        <ResponseList discussionId={discussionId!} />
      </div>
    </div>
  );
}
