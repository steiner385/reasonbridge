/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { TopicSearchFilter } from '../topics/TopicSearchFilter';
import { TopicList } from '../topics/TopicList';
import { useTopicNavigation } from '../../hooks/useTopicNavigation';
import { useDiscussionLayout } from '../../contexts/DiscussionLayoutContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { Topic } from '../../types/topic';

/**
 * TopicNavigationPanel props
 */
export interface TopicNavigationPanelProps {
  /** Array of all topics to display */
  topics: Topic[];
  /** Map of topic IDs to unread status */
  unreadMap?: Map<string, boolean>;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Height of the panel in pixels (for virtual scrolling) */
  height?: number;
  /** CSS class name */
  className?: string;
}

/**
 * Topic navigation panel for left sidebar
 * Provides search, filtering, and virtualized topic list
 */
export function TopicNavigationPanel({
  topics,
  unreadMap = new Map(),
  isLoading = false,
  error = null,
  height = 600,
  className = '',
}: TopicNavigationPanelProps) {
  const { activeTopicId, navigateToTopic } = useTopicNavigation();
  const { closeLeftPanelOverlay } = useDiscussionLayout();
  const breakpoint = useBreakpoint();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEEDING' | 'ACTIVE' | 'ARCHIVED' | null>(null);

  const showCloseButton = breakpoint === 'tablet' || breakpoint === 'mobile';

  // Filter topics based on search query and status
  const filteredTopics = useMemo(() => {
    let filtered = topics;

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((topic) => topic.status === statusFilter);
    }

    // Apply search query (client-side filtering)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (topic) =>
          topic.title.toLowerCase().includes(query) ||
          topic.description.toLowerCase().includes(query) ||
          topic.tags?.some((tag) => tag.name.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [topics, searchQuery, statusFilter]);

  // Auto-scroll to active topic when it changes
  useEffect(() => {
    if (activeTopicId && filteredTopics.length > 0) {
      const activeIndex = filteredTopics.findIndex((t) => t.id === activeTopicId);
      if (activeIndex !== -1) {
        // Could implement auto-scroll here if needed
        // For now, react-window handles this automatically
      }
    }
  }, [activeTopicId, filteredTopics]);

  // Calculate list height (total height - header - search filter)
  const listHeight = height - 120; // Reserve 120px for header and search

  return (
    <div className={`topic-navigation-panel flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Topics</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'}
          </p>
        </div>
        {/* Close button for tablet/mobile overlay */}
        {showCloseButton && closeLeftPanelOverlay && (
          <button
            type="button"
            onClick={closeLeftPanelOverlay}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close topic navigation"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
        <TopicSearchFilter
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search topics..."
          showStatusFilter
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      {/* Topic List */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="mx-4 my-3 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12" role="status">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 border-4 border-gray-300 border-t-primary-600 rounded-full animate-spin"
                aria-hidden="true"
              />
              <p className="text-sm text-gray-600">Loading topics...</p>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <TopicList
            topics={filteredTopics}
            activeTopicId={activeTopicId}
            onTopicClick={navigateToTopic}
            unreadMap={unreadMap}
            height={listHeight}
            itemHeight={80}
          />
        )}
      </div>

      {/* Active Filters Display */}
      {(searchQuery || statusFilter) && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600 font-medium">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                Search: "{searchQuery.substring(0, 20)}
                {searchQuery.length > 20 ? '...' : ''}"
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                Status: {statusFilter}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
