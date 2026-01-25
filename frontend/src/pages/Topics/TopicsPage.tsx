import { useState } from 'react';
import { useTopics } from '../../lib/useTopics';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { TopicCard, TopicFilterUI } from '../../components/topics';
import TopicCardSkeleton from '../../components/ui/skeletons/TopicCardSkeleton';
import type { GetTopicsParams } from '../../types/topic';

function TopicsPage() {
  const [filters, setFilters] = useState<GetTopicsParams>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data, isLoading, error } = useTopics(filters);
  const showSkeleton = useDelayedLoading(isLoading);

  const handleFiltersChange = (newFilters: GetTopicsParams) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card variant="elevated" padding="lg">
          <div className="text-center text-fallacy-DEFAULT">
            <h2 className="text-xl font-semibold mb-2">Error Loading Topics</h2>
            <p className="text-gray-600">
              {error instanceof Error ? error.message : 'Failed to load topics'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Discussion Topics</h1>
        <p className="text-gray-600">Browse and join rational discussions on various topics</p>
      </div>

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
        <div className="space-y-4 mb-6">
          {[1, 2, 3].map((i) => (
            <TopicCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Topic List */}
      {!showSkeleton && data && (
        <>
          <div className="space-y-4 mb-6">
            {data.data.length === 0 ? (
              <Card variant="elevated" padding="lg">
                <div className="text-center text-gray-600">
                  <p className="text-lg">No topics found</p>
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                </div>
              </Card>
            ) : (
              data.data.map((topic) => <TopicCard key={topic.id} topic={topic} />)
            )}
          </div>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
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
                            <span className="px-2 text-gray-400">...</span>
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
    </div>
  );
}

export default TopicsPage;
