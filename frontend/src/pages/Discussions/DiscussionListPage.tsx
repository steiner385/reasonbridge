/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T027 [P] [US1] - Discussion List Page (Feature 009)
 *
 * Main page for viewing discussions within a topic
 * Features:
 * - Paginated list of discussions
 * - Filtering by status
 * - Sorting by activity, recency, or response count
 * - "Start Discussion" button for verified users
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDiscussions } from '../../hooks/useDiscussions';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { DiscussionCard } from '../../components/discussions/DiscussionCard';
import { CreateDiscussionForm } from '../../components/discussions/CreateDiscussionForm';
import type { ListDiscussionsQuery } from '../../services/discussionService';

export function DiscussionListPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<ListDiscussionsQuery>({
    topicId,
    status: 'ACTIVE',
    sortBy: 'lastActivityAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useDiscussions(filters);
  const showSkeleton = useDelayedLoading(isLoading);

  const handleSortChange = (sortBy: 'lastActivityAt' | 'createdAt' | 'responseCount') => {
    setFilters({ ...filters, sortBy, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDiscussionCreated = (discussionId: string) => {
    setShowCreateForm(false);
    navigate(`/discussions/${discussionId}`);
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card variant="elevated" padding="lg">
          <div className="text-center text-fallacy-DEFAULT">
            <h2 className="text-xl font-semibold mb-2">Error Loading Discussions</h2>
            <p className="text-gray-600">{error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Discussions</h1>
            <p className="text-gray-600">Join rational discussions and share your perspectives</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(true)}
            className="whitespace-nowrap"
          >
            Start Discussion
          </Button>
        </div>
      </div>

      {/* Create Discussion Form */}
      {showCreateForm && topicId && (
        <Card variant="elevated" padding="lg" className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Start a New Discussion</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close form"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <CreateDiscussionForm
            topicId={topicId}
            onSuccess={handleDiscussionCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </Card>
      )}

      {/* Filters and Sorting */}
      <Card variant="outlined" padding="md" className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                handleSortChange(e.target.value as 'lastActivityAt' | 'createdAt' | 'responseCount')
              }
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="lastActivityAt">Recent Activity</option>
              <option value="createdAt">Newest First</option>
              <option value="responseCount">Most Responses</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            {data && `${data.meta.totalItems} discussion${data.meta.totalItems !== 1 ? 's' : ''}`}
          </div>
        </div>
      </Card>

      {/* Loading Skeleton */}
      {showSkeleton && (
        <div className="space-y-4 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="elevated" padding="lg">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="flex gap-4 text-sm">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Discussion List */}
      {!showSkeleton && data && (
        <>
          <div className="space-y-4 mb-6">
            {data.data.length === 0 ? (
              <Card variant="elevated" padding="lg">
                <div className="text-center text-gray-600 py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <p className="text-lg font-medium mb-2">No discussions yet</p>
                  <p className="text-sm mb-4">Be the first to start a discussion on this topic!</p>
                  <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                    Start Discussion
                  </Button>
                </div>
              </Card>
            ) : (
              data.data.map((discussion) => (
                <DiscussionCard key={discussion.id} discussion={discussion} />
              ))
            )}
          </div>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {data.meta.currentPage} of {data.meta.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!data.meta.hasPreviousPage}
                    onClick={() => handlePageChange(data.meta.currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!data.meta.hasNextPage}
                    onClick={() => handlePageChange(data.meta.currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
