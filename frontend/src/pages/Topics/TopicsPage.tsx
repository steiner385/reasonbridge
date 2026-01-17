import { useState } from 'react';
import { useTopics } from '../../lib/useTopics';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { TopicCard } from '../../components/topics';
import type { GetTopicsParams } from '../../types/topic';

function TopicsPage() {
  const [filters, setFilters] = useState<GetTopicsParams>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data, isLoading, error } = useTopics(filters);

  const handleStatusFilter = (status?: 'SEEDING' | 'ACTIVE' | 'ARCHIVED') => {
    const newFilters: GetTopicsParams = { ...filters, page: 1 };
    if (status) {
      newFilters.status = status;
    } else {
      delete newFilters.status;
    }
    setFilters(newFilters);
  };

  const handleSortChange = (sortBy: 'createdAt' | 'participantCount' | 'responseCount') => {
    setFilters({ ...filters, sortBy, page: 1 });
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
        <p className="text-gray-600">
          Browse and join rational discussions on various topics
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6" padding="md">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 self-center">Status:</span>
            <Button
              size="sm"
              variant={!filters.status ? 'primary' : 'outline'}
              onClick={() => handleStatusFilter(undefined)}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filters.status === 'SEEDING' ? 'primary' : 'outline'}
              onClick={() => handleStatusFilter('SEEDING')}
            >
              Seeding
            </Button>
            <Button
              size="sm"
              variant={filters.status === 'ACTIVE' ? 'primary' : 'outline'}
              onClick={() => handleStatusFilter('ACTIVE')}
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={filters.status === 'ARCHIVED' ? 'primary' : 'outline'}
              onClick={() => handleStatusFilter('ARCHIVED')}
            >
              Archived
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 self-center">Sort by:</span>
            <select
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filters.sortBy || 'createdAt'}
              onChange={(e) => handleSortChange(e.target.value as 'createdAt' | 'participantCount' | 'responseCount')}
            >
              <option value="createdAt">Newest First</option>
              <option value="participantCount">Most Participants</option>
              <option value="responseCount">Most Responses</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading topics...</p>
        </div>
      )}

      {/* Topic List */}
      {!isLoading && data && (
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
              data.data.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))
            )}
          </div>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((data.meta.page - 1) * data.meta.limit) + 1} to{' '}
                  {Math.min(data.meta.page * data.meta.limit, data.meta.total)} of{' '}
                  {data.meta.total} topics
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
                      .filter(page => {
                        const current = data.meta.page;
                        return page === 1 ||
                               page === data.meta.totalPages ||
                               (page >= current - 1 && page <= current + 1);
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
