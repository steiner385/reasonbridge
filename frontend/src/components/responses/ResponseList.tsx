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
 */

import { useMemo } from 'react';
import { List } from 'react-window';
import { useResponses } from '../../hooks/useResponses';
import Card from '../ui/Card';
import type { CreateResponseRequest } from '../../types/response';
import { ResponseItem } from './ResponseItem';

export interface ResponseListProps {
  discussionId: string;
  enableThreading?: boolean;
  /** Height of the list container in pixels (for virtual scrolling) */
  height?: number;
  /** Height of each response item in pixels */
  itemHeight?: number;
  /** Map of highlighted response IDs (for proposition interaction) */
  highlightedResponseIds?: Set<string>;
  /** Callback when inline reply is submitted */
  onReplySubmit?: (response: CreateResponseRequest) => Promise<void>;
  /** Callback for preview feedback changes (for right panel) */
  onPreviewFeedbackChange?: (
    feedback: any,
    readyToPost: boolean,
    summary: string,
    isLoading?: boolean,
    error?: string | null,
  ) => void;
}

export function ResponseList({
  discussionId,
  enableThreading = false,
  height = 600,
  itemHeight = 220,
  highlightedResponseIds = new Set(),
  onReplySubmit,
  onPreviewFeedbackChange,
}: ResponseListProps) {
  const {
    data: responses,
    isLoading,
    error,
  } = useResponses(discussionId, {
    buildThreadTree: enableThreading,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="outlined" padding="lg">
            <div className="animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
        <div className="text-center text-red-600">
          <p className="font-medium">Failed to load responses</p>
          <p className="text-sm text-gray-600 mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <Card variant="outlined" padding="lg">
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg">No responses yet</p>
          <p className="text-sm mt-2">Be the first to share your perspective</p>
        </div>
      </Card>
    );
  }

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
        const response = responses[index];
        if (!response) return null;

        const isHighlighted = highlightedResponseIds.has(response.id);

        return (
          <div style={style} className="px-2" {...ariaAttributes}>
            <div
              className={`
                transition-all duration-300
                ${isHighlighted ? 'ring-2 ring-primary-500 rounded-lg' : ''}
              `}
              data-response-id={response.id}
            >
              <ResponseItem
                response={response}
                discussionId={discussionId}
                showReplies={enableThreading}
                onReplySubmit={onReplySubmit}
                onPreviewFeedbackChange={onPreviewFeedbackChange}
              />
            </div>
          </div>
        );
      },
    [
      responses,
      discussionId,
      enableThreading,
      highlightedResponseIds,
      onReplySubmit,
      onPreviewFeedbackChange,
    ],
  );

  return (
    <div className="response-list" role="list" aria-label="Responses">
      <List<{}>
        defaultHeight={height}
        rowCount={responses.length}
        rowHeight={itemHeight}
        overscanCount={3}
        rowComponent={Row}
        rowProps={{}}
      />
    </div>
  );
}
