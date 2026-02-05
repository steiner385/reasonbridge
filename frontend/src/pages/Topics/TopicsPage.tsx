/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTopics } from '../../lib/useTopics';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { TopicCard, TopicFilterUI } from '../../components/topics';
import TopicCardSkeleton from '../../components/ui/skeletons/TopicCardSkeleton';
import { CreateTopicModal } from '../../components/topics/CreateTopicModal';
import type { GetTopicsParams } from '../../types/topic';

const WELCOME_BANNER_DISMISSED_KEY = 'reasonbridge_welcome_banner_dismissed';

function TopicsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState<GetTopicsParams>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data, isLoading, error } = useTopics(filters);
  const showSkeleton = useDelayedLoading(isLoading);
  const prevWelcomeParamRef = useRef(searchParams.get('welcome'));

  // Check for welcome param and dismissed state
  useEffect(() => {
    const welcomeParam = searchParams.get('welcome');
    // Only update if welcome param actually changed
    if (welcomeParam !== prevWelcomeParamRef.current) {
      const isWelcome = welcomeParam === 'true';
      const isDismissed = localStorage.getItem(WELCOME_BANNER_DISMISSED_KEY) === 'true';
      // Schedule state update asynchronously to avoid cascading renders
      const timer = setTimeout(() => {
        setShowWelcomeBanner(isWelcome && !isDismissed);
      }, 0);
      prevWelcomeParamRef.current = welcomeParam;
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [searchParams]);

  const handleDismissWelcome = () => {
    localStorage.setItem(WELCOME_BANNER_DISMISSED_KEY, 'true');
    setShowWelcomeBanner(false);
  };

  const handleFiltersChange = (newFilters: GetTopicsParams) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleCreateSuccess = (topicId: string) => {
    // Navigate to the newly created topic
    navigate(`/topics/${topicId}`);
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card variant="elevated" padding="lg">
          <div className="text-center text-fallacy-DEFAULT dark:text-red-400">
            <h2 className="text-xl font-semibold mb-2">Error Loading Topics</h2>
            <p className="text-gray-600 dark:text-gray-300">
              {error instanceof Error ? error.message : 'Failed to load topics'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
<<<<<<< HEAD
      <div className="mb-6">
        <h1 className="text-fluid-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Discussion Topics
        </h1>
        <p className="text-fluid-base text-gray-600 dark:text-gray-300">
          Browse and join rational discussions on various topics
        </p>
=======
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discussion Topics</h1>
          <p className="text-gray-600">Browse and join rational discussions on various topics</p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Topic
        </Button>
>>>>>>> aac17ac (feat: Implement comprehensive topic management (Feature 016))
      </div>

      {/* Welcome Banner */}
      {showWelcomeBanner && (
        <div
          role="status"
          className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-200">
                Welcome back to ReasonBridge!
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Ready to continue exploring discussions and finding common ground?
              </p>
            </div>
          </div>
          <button
            onClick={handleDismissWelcome}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
            aria-label="Dismiss welcome banner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <TopicFilterUI
          filters={filters}
          onFiltersChange={handleFiltersChange}
          showTagFilter={true}
        />
      </div>

      {/* Loading State - Skeleton cards (with 100ms delay to prevent flash) */}
      {showSkeleton && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <TopicCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Topic List */}
      {!showSkeleton && data && data.data && (
        <>
          {data.data.length === 0 ? (
            <div className="mb-6">
              <Card variant="elevated" padding="lg">
                <div className="text-center text-gray-600 dark:text-gray-300">
                  <p className="text-lg">No topics found</p>
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {data.data.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.meta && data.meta.totalPages > 1 && (
            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Showing {(data.meta.page - 1) * data.meta.limit + 1} to{' '}
                  {Math.min(data.meta.page * data.meta.limit, data.meta.total)} of {data.meta.total}{' '}
                  topics
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={data.meta.page === 1}
                    onClick={() => handlePageChange(data.meta.page - 1)}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: data.meta.totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        const current = data.meta.page;
                        return (
                          page === 1 ||
                          page === data.meta.totalPages ||
                          (page >= current - 1 && page <= current + 1)
                        );
                      })
                      .map((page, idx, arr) => (
                        <div key={page} className="flex items-center">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="px-2 text-gray-400 dark:text-gray-600">...</span>
                          )}
                          <Button
                            size="sm"
                            variant={page === data.meta.page ? 'primary' : 'outline'}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        </div>
                      ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={data.meta.page === data.meta.totalPages}
                    onClick={() => handlePageChange(data.meta.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Create Topic Modal */}
      <CreateTopicModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

export default TopicsPage;
