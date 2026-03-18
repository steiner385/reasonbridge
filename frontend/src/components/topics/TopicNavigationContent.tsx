/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback } from 'react';
import { useTopicNavigation } from '../../hooks/useTopicNavigation';
import type { Topic } from '../../types/topic';
import { TopicSearchFilter } from './TopicSearchFilter';
import { TopicList } from './TopicList';

/**
 * TopicNavigationContent props
 */
export interface TopicNavigationContentProps {
  /** Array of all topics to display */
  topics: Topic[];
  /** Map of topic IDs to unread status */
  unreadMap?: Map<string, boolean>;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Height of the content area in pixels (for virtual scrolling) */
  height?: number;
  /** Optional callback when a topic is selected */
  onTopicSelect?: (topicId: string) => void;
  /** CSS class name */
  className?: string;
}

/**
 * Reusable topic navigation content component
 *
 * @remarks
 * This component contains the core logic for topic navigation:
 * - Search input with debouncing
 * - Status filter (All, Seeding, Active, Archived)
 * - Virtualized topic list
 *
 * It can be used in:
 * - The unified sidebar (when on /topics or /discussions routes)
 * - TopicNavigationPanel (within DiscussionLayout)
 * - Mobile drawer (when on topic routes)
 *
 * @param props - Component props
 *
 * @example
 * ```tsx
 * <TopicNavigationContent
 *   topics={topics}
 *   unreadMap={unreadMap}
 *   isLoading={isLoading}
 *   height={600}
 * />
 * ```
 */
export function TopicNavigationContent({
  topics,
  unreadMap = new Map(),
  isLoading = false,
  error = null,
  height = 400,
  onTopicSelect,
  className = '',
}: TopicNavigationContentProps) {
  const { activeTopicId, navigateToTopic } = useTopicNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEEDING' | 'ACTIVE' | 'ARCHIVED' | null>(null);

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

  // Handle topic click (memoized to prevent unnecessary TopicList re-renders)
  const handleTopicClick = useCallback(
    (topicId: string) => {
      navigateToTopic(topicId);
      onTopicSelect?.(topicId);
    },
    [navigateToTopic, onTopicSelect],
  );

  // Calculate list height (subtract header and search filter areas)
  // Search filter is approximately 70px
  const listHeight = Math.max(200, height - 70);

  return (
    <div className={`topic-navigation-content flex flex-col h-full ${className}`}>
      {/* Search and Filter */}
      <div className="shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
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
          <div
            className="mx-3 my-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            role="alert"
          >
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8" role="status">
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-6 h-6 border-3 border-gray-300 border-t-primary-600 rounded-full animate-spin"
                aria-hidden="true"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400">Loading topics...</p>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <TopicList
            topics={filteredTopics}
            activeTopicId={activeTopicId}
            onTopicClick={handleTopicClick}
            unreadMap={unreadMap}
            height={listHeight}
            itemHeight={72}
          />
        )}
      </div>

      {/* Topic count footer */}
      <div className="shrink-0 px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'}
          {(searchQuery || statusFilter) && ' (filtered)'}
        </p>
      </div>
    </div>
  );
}
