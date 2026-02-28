/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T036 [P] [US2] - Response List Component with Virtual Scrolling
 *
 * Displays all responses for a discussion in chronological order
 * Uses virtual scrolling for efficient rendering of 500+ responses
 * Supports threading display for nested replies (Phase 5)
 *
 * @remarks
 * **Compact Mode**: When enabled, responses are grouped by author (messages
 * from the same author within 5 minutes appear as a visual group) and
 * rendered in a smaller format with hover-only actions.
 *
 * **Message Grouping**: Uses `groupResponses` utility to identify consecutive
 * messages from the same author, enabling the Discord/Slack-like collapsed
 * header pattern where only the first message in a group shows avatar/name/time.
 */

import { useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useResponses } from '../../hooks/useResponses';
import { useReadState } from '../../hooks/useReadState';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import Card from '../ui/Card';
import type { CreateResponseRequest } from '../../types/response';
import type { PreviewFeedbackItem } from '../../lib/feedback-api';
import { groupResponses, type GroupedResponse } from '../../lib/groupResponses';
import type { ResponseDetail } from '../../services/discussionService';
import { ResponseItem } from './ResponseItem';
import { NewMessagesDivider } from './NewMessagesDivider';
import { TypingIndicator } from './TypingIndicator';

export interface ResponseListProps {
  discussionId: string;
  enableThreading?: boolean;
  /** Height of the list container in pixels (for virtual scrolling) */
  height?: number;
  /** Estimated height of each response item (used for initial layout) */
  estimatedItemHeight?: number;
  /** Map of highlighted response IDs (for proposition interaction) */
  highlightedResponseIds?: Set<string>;
  /** Callback when inline reply is submitted */
  onReplySubmit?: (response: CreateResponseRequest) => Promise<void>;
  /** Callback for preview feedback changes (for right panel) */
  onPreviewFeedbackChange?: (
    feedback: PreviewFeedbackItem[],
    readyToPost: boolean,
    summary: string,
    isLoading?: boolean,
    error?: string | null,
  ) => void;
  /** Enable compact mode with message grouping and hover actions */
  compact?: boolean;
}

/** Estimated item heights for different modes (TanStack Virtual will measure actual heights) */
const DEFAULT_ESTIMATED_HEIGHT = 160;
const COMPACT_ESTIMATED_HEIGHT = 100;

/**
 * Adapter to make ResponseDetail compatible with GroupableResponse
 * ResponseDetail has author.id but our utility expects author.id directly
 */
function adaptResponseForGrouping(response: ResponseDetail): ResponseDetail & {
  author: { id: string; displayName: string };
} {
  return response as ResponseDetail & { author: { id: string; displayName: string } };
}

export function ResponseList({
  discussionId,
  enableThreading = false,
  height = 600,
  estimatedItemHeight,
  highlightedResponseIds = new Set(),
  onReplySubmit,
  onPreviewFeedbackChange,
  compact = false,
}: ResponseListProps) {
  const {
    data: responses,
    isLoading,
    error,
  } = useResponses(discussionId, {
    buildThreadTree: enableThreading,
  });

  // Read state for showing new messages divider
  const { readState } = useReadState(discussionId);

  // Typing indicator for showing who is typing
  const { typingMessage } = useTypingIndicator({ topicId: discussionId });

  // Ref for the scroll container (required by TanStack Virtual)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate estimated item height based on compact mode
  const effectiveEstimatedHeight =
    estimatedItemHeight ?? (compact ? COMPACT_ESTIMATED_HEIGHT : DEFAULT_ESTIMATED_HEIGHT);

  // Apply message grouping when responses are available
  // CRITICAL: This useMemo must be called unconditionally to maintain hook order
  const groupedResponses = useMemo<GroupedResponse<ResponseDetail>[]>(() => {
    if (!responses || responses.length === 0) {
      return [];
    }
    // Group responses by author within 5-minute windows
    return groupResponses(responses.map(adaptResponseForGrouping), {
      timeThresholdMs: 5 * 60 * 1000, // 5 minutes
      breakOnThreadChange: true,
    });
  }, [responses]);

  // Find the index where new messages divider should appear
  // This is the first response AFTER the last-read response
  const newMessagesDividerIndex = useMemo(() => {
    if (!readState?.lastResponseId || !groupedResponses.length) {
      return -1; // No divider needed
    }

    const lastReadIndex = groupedResponses.findIndex(
      (g) => g.response.id === readState.lastResponseId,
    );

    // If last read response found and there are responses after it, show divider
    if (lastReadIndex >= 0 && lastReadIndex < groupedResponses.length - 1) {
      return lastReadIndex + 1;
    }

    return -1; // No new messages
  }, [readState?.lastResponseId, groupedResponses]);

  // Count of new (unread) messages
  const newMessageCount = useMemo(() => {
    if (newMessagesDividerIndex < 0 || !groupedResponses.length) {
      return 0;
    }
    return groupedResponses.length - newMessagesDividerIndex;
  }, [newMessagesDividerIndex, groupedResponses.length]);

  // Estimate size based on content length (longer content = taller row)
  const estimateSize = useCallback(
    (index: number) => {
      if (!groupedResponses || !groupedResponses[index]) {
        return effectiveEstimatedHeight;
      }
      const grouped = groupedResponses[index];
      const contentLength = grouped.response.content?.length || 0;
      const hasCitations = (grouped.response.citations?.length || 0) > 0;
      const hasReplies = (grouped.response.replies?.length || 0) > 0;

      // Base height + content adjustment + extras
      let estimated = effectiveEstimatedHeight;

      // Add height for longer content (roughly 20px per 100 chars over 200)
      if (contentLength > 200) {
        estimated += Math.min((contentLength - 200) / 5, 100);
      }

      // Add height for citations
      if (hasCitations) {
        estimated += 60;
      }

      // Add space for new messages divider if present
      if (index === newMessagesDividerIndex) {
        estimated += 40;
      }

      // Add space for nested replies indicator
      if (hasReplies) {
        estimated += 30;
      }

      return estimated;
    },
    [groupedResponses, effectiveEstimatedHeight, newMessagesDividerIndex],
  );

  // CRITICAL: Initialize virtualizer BEFORE any early returns to maintain consistent hook calls
  // React Error #310 occurs when hooks are called conditionally (different number between renders)
  const virtualizer = useVirtualizer({
    count: groupedResponses.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize,
    overscan: compact ? 5 : 3,
  });

  // Memoized render function for each row
  const renderRow = useCallback(
    (index: number, measureRef: (node: HTMLElement | null) => void) => {
      if (!groupedResponses || !groupedResponses[index]) return null;

      const grouped = groupedResponses[index];
      const response = grouped.response;
      const isHighlighted = highlightedResponseIds.has(response.id);
      const showDivider = index === newMessagesDividerIndex;

      return (
        <div
          ref={measureRef}
          className="px-2"
          role="listitem"
          aria-posinset={index + 1}
          aria-setsize={groupedResponses.length}
        >
          {/* New Messages Divider - shown before first unread response */}
          {showDivider && <NewMessagesDivider newMessageCount={newMessageCount} className="mb-2" />}
          <div
            className={`
                transition-all duration-300
                ${isHighlighted ? 'ring-2 ring-primary-500 rounded-lg' : ''}
              `}
            data-response-id={response.id}
            data-group-id={grouped.groupId}
          >
            <ResponseItem
              response={response}
              discussionId={discussionId}
              showReplies={enableThreading}
              onReplySubmit={onReplySubmit}
              onPreviewFeedbackChange={onPreviewFeedbackChange}
              compact={compact}
              isGroupStart={grouped.isGroupStart}
              isGroupEnd={grouped.isGroupEnd}
            />
          </div>
        </div>
      );
    },
    [
      groupedResponses,
      discussionId,
      enableThreading,
      highlightedResponseIds,
      onReplySubmit,
      onPreviewFeedbackChange,
      compact,
      newMessagesDividerIndex,
      newMessageCount,
    ],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="outlined" padding={compact ? 'sm' : 'lg'}>
            <div className="animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`${compact ? 'w-6 h-6' : 'w-10 h-10'} bg-gray-200 dark:bg-gray-700 rounded-full`}
                />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="text-center text-red-700 dark:text-red-400">
          <p className="font-medium">Failed to load responses</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <Card variant="outlined" padding="lg">
        <div className="text-center text-gray-600 dark:text-gray-400 py-8">
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg">No responses yet</p>
          <p className="text-sm mt-2">Be the first to share your perspective</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="response-list" data-compact={compact}>
      {/* Scroll container with dynamic height measurement via TanStack Virtual */}
      <div
        ref={scrollContainerRef}
        className="overflow-auto"
        style={{
          height,
          overflowAnchor: 'none', // Prevent scroll anchoring jitter during measurement
        }}
        role="list"
        aria-label="Responses"
      >
        {/* Inner container sized to total virtual height */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Render only visible items */}
          {virtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(virtualRow.index, virtualizer.measureElement)}
            </div>
          ))}
        </div>
      </div>
      {/* Typing Indicator - shows at the bottom when users are typing */}
      <TypingIndicator message={typingMessage} className="mt-2 px-2" />
    </div>
  );
}
