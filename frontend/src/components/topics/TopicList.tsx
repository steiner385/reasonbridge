/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { List } from 'react-window';
import type { Topic } from '../../types/topic';
import { TopicListItem } from './TopicListItem';

/**
 * TopicList props
 */
export interface TopicListProps {
  /** Array of topics to display */
  topics: Topic[];
  /** Currently selected topic ID */
  activeTopicId: string | null;
  /** Callback when a topic is clicked */
  onTopicClick: (topicId: string) => void;
  /** Map of topic IDs to unread status */
  unreadMap?: Map<string, boolean>;
  /** Height of each topic list item in pixels */
  itemHeight?: number;
  /** Total height of the list container in pixels */
  height: number;
  /** CSS class name */
  className?: string;
}

/**
 * Virtualized topic list component
 * Efficiently renders large lists of topics using react-window
 * Supports virtual scrolling for 500+ topics at 60fps
 */
export function TopicList({
  topics,
  activeTopicId,
  onTopicClick,
  unreadMap = new Map(),
  itemHeight = 80,
  height,
  className = '',
}: TopicListProps) {
  // Memoize row renderer to prevent unnecessary re-renders
  const Row = useMemo(
    () =>
      ({
        index,
        style,
        ariaAttributes,
      }: {
        index: number;
        style: React.CSSProperties;
        ariaAttributes: {
          'aria-posinset': number;
          'aria-setsize': number;
          role: 'listitem';
        };
      }) => {
        const topic = topics[index];
        if (!topic) return null;

        const isActive = activeTopicId === topic.id;
        const hasUnread = unreadMap.get(topic.id) || false;

        return (
          <div style={style} {...ariaAttributes}>
            <TopicListItem
              topic={topic}
              isActive={isActive}
              hasUnread={hasUnread}
              onClick={onTopicClick}
            />
          </div>
        );
      },
    [topics, activeTopicId, onTopicClick, unreadMap],
  );

  // Empty state
  if (topics.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
        role="status"
        aria-live="polite"
      >
        <svg
          className="w-12 h-12 text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="text-sm text-gray-600 font-medium mb-1">No topics found</p>
        <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div
      className={`topic-list ${className}`}
      data-testid="topic-list"
      role="list"
      aria-label="Topic list"
    >
      <List<{}>
        defaultHeight={height}
        rowCount={topics.length}
        rowHeight={itemHeight}
        overscanCount={5}
        rowComponent={Row}
        rowProps={{}}
      />
    </div>
  );
}
