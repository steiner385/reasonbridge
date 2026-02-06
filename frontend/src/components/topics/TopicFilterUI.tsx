/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

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

  const handleSortOrderToggle = () => {
    const newSortOrder = filters.sortOrder === 'desc' ? 'asc' : 'desc';
    onFiltersChange({ ...filters, sortOrder: newSortOrder, page: 1 });
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

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center">
              Sort by:
            </span>
            <div className="flex gap-1">
              <select
                data-testid="sort-select"
                aria-label="Sort by"
                className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors"
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
              <button
                type="button"
                onClick={handleSortOrderToggle}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors"
                aria-label={`Sort order: ${filters.sortOrder === 'desc' ? 'Descending' : 'Ascending'}`}
                title={
                  filters.sortOrder === 'desc'
                    ? 'Sort descending (high to low)'
                    : 'Sort ascending (low to high)'
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-600 dark:text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {filters.sortOrder === 'desc' ? (
                    // Descending icon (arrow down)
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  ) : (
                    // Ascending icon (arrow up)
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  )}
                </svg>
              </button>
            </div>
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
