import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { GetTopicsParams } from '../../types/topic';

export interface TopicFilterUIProps {
  /**
   * Current filter values
   */
  filters: GetTopicsParams;

  /**
   * Callback when filters change
   */
  onFiltersChange: (filters: GetTopicsParams) => void;

  /**
   * Whether to show tag filter input
   */
  showTagFilter?: boolean;
}

/**
 * Topic filtering UI component
 * Provides controls for filtering topics by status, sort order, and tags
 */
export function TopicFilterUI({
  filters,
  onFiltersChange,
  showTagFilter = true,
}: TopicFilterUIProps) {
  const [tagInput, setTagInput] = useState(filters.tag || '');

  const handleStatusFilter = (status?: 'SEEDING' | 'ACTIVE' | 'ARCHIVED') => {
    const newFilters: GetTopicsParams = { ...filters, page: 1 };
    if (status) {
      newFilters.status = status;
    } else {
      delete newFilters.status;
    }
    onFiltersChange(newFilters);
  };

  const handleSortChange = (sortBy: 'createdAt' | 'participantCount' | 'responseCount') => {
    onFiltersChange({ ...filters, sortBy, page: 1 });
  };

  const handleTagFilter = () => {
    const trimmedTag = tagInput.trim();
    const newFilters: GetTopicsParams = { ...filters, page: 1 };

    if (trimmedTag) {
      newFilters.tag = trimmedTag;
    } else {
      delete newFilters.tag;
    }

    onFiltersChange(newFilters);
  };

  const handleClearTag = () => {
    setTagInput('');
    const newFilters: GetTopicsParams = { ...filters, page: 1 };
    delete newFilters.tag;
    onFiltersChange(newFilters);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTagFilter();
    }
  };

  return (
    <Card padding="md">
      <div className="space-y-4">
        {/* Status Filter Row */}
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
              onChange={(e) =>
                handleSortChange(
                  e.target.value as 'createdAt' | 'participantCount' | 'responseCount',
                )
              }
            >
              <option value="createdAt">Newest First</option>
              <option value="participantCount">Most Participants</option>
              <option value="responseCount">Most Responses</option>
            </select>
          </div>
        </div>

        {/* Tag Filter Row */}
        {showTagFilter && (
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Filter by tag"
                placeholder="Enter tag name..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                inputSize="sm"
                fullWidth
              />
            </div>
            <Button size="sm" variant="primary" onClick={handleTagFilter}>
              Apply
            </Button>
            {filters.tag && (
              <Button size="sm" variant="outline" onClick={handleClearTag}>
                Clear Tag
              </Button>
            )}
          </div>
        )}

        {/* Active Filters Display */}
        {(filters.status || filters.tag) && (
          <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-gray-200">
            <span className="text-xs font-medium text-gray-600">Active filters:</span>
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                Status: {filters.status}
              </span>
            )}
            {filters.tag && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                Tag: {filters.tag}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
