/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { ResponseList } from '../responses/ResponseList';
import ResponseComposer from '../responses/ResponseComposer';
import { useDiscussionLayout } from '../../contexts/DiscussionLayoutContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { Topic } from '../../types/topic';
import type { PreviewFeedbackItem } from '../../lib/feedback-api';
import type { CreateResponseRequest } from '../../types/response';

/**
 * ConversationPanel props
 */
export interface ConversationPanelProps {
  /** Active topic being discussed */
  topic: Topic | null;
  /** Set of highlighted response IDs (from proposition interaction) */
  highlightedResponseIds?: Set<string>;
  /** Whether to show response composer */
  showComposer?: boolean;
  /** Height of the panel in pixels (for virtual scrolling) */
  height?: number;
  /** Callback when preview feedback changes (for right panel display) */
  onPreviewFeedbackChange?: (
    feedback: PreviewFeedbackItem[],
    readyToPost: boolean,
    summary: string,
    isLoading?: boolean,
    error?: string | null,
  ) => void;
  /** Callback when composition state changes */
  onCompositionStateChange?: (isComposing: boolean) => void;
  /** Callback when top-level response is submitted */
  onResponseSubmit?: (response: CreateResponseRequest) => Promise<void>;
  /** Callback when inline reply is submitted */
  onReplySubmit?: (response: CreateResponseRequest) => Promise<void>;
  /** CSS class name */
  className?: string;
}

/**
 * Conversation panel for center section
 * Displays topic title, description, and threaded responses
 */
export function ConversationPanel({
  topic,
  highlightedResponseIds = new Set(),
  showComposer = true,
  height,
  onPreviewFeedbackChange,
  onCompositionStateChange: _onCompositionStateChange,
  onResponseSubmit,
  onReplySubmit,
  className = '',
}: ConversationPanelProps) {
  const responseListContainerRef = useRef<HTMLDivElement>(null);
  const { toggleLeftPanelOverlay } = useDiscussionLayout();
  const breakpoint = useBreakpoint();
  const { subscribe } = useWebSocket();

  const [newResponseCount, setNewResponseCount] = useState(0);
  const [topicStatusChange, setTopicStatusChange] = useState<{
    oldStatus: string;
    newStatus: string;
  } | null>(null);

  const showHamburgerMenu = breakpoint === 'tablet' || breakpoint === 'mobile';

  // Subscribe to WebSocket messages for new responses
  useEffect(() => {
    if (!topic?.id) return;

    const unsubscribeNewResponse = subscribe('NEW_RESPONSE', (message) => {
      if (message.payload.topicId === topic.id) {
        setNewResponseCount((prev) => prev + 1);
      }
    });

    const unsubscribeStatusChange = subscribe('TOPIC_STATUS_CHANGE', (message) => {
      if (message.type === 'TOPIC_STATUS_CHANGE' && message.payload.topicId === topic.id) {
        setTopicStatusChange({
          oldStatus: message.payload.oldStatus,
          newStatus: message.payload.newStatus,
        });
      }
    });

    return () => {
      unsubscribeNewResponse();
      unsubscribeStatusChange();
    };
  }, [topic?.id, subscribe]);

  // Scroll to bottom of response list
  const scrollToBottom = useCallback(() => {
    if (responseListContainerRef.current) {
      const container = responseListContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // Wrap onReplySubmit to add auto-scroll after submission
  const handleReplySubmitWithScroll = useCallback(
    async (response: CreateResponseRequest) => {
      if (onReplySubmit) {
        await onReplySubmit(response);
        // Auto-scroll to bottom after successful submission
        setTimeout(scrollToBottom, 300); // Slight delay to allow DOM update
      }
    },
    [onReplySubmit, scrollToBottom],
  );

  // Handle loading new responses
  const handleLoadNewResponses = useCallback(() => {
    setNewResponseCount(0);
    // TODO: Trigger refetch of responses from API
    // This will be implemented when we have real API integration
    scrollToBottom();
  }, [scrollToBottom]);

  // Handle dismissing topic status change banner
  const handleDismissStatusChange = useCallback(() => {
    setTopicStatusChange(null);
  }, []);
  // Empty state when no topic selected
  if (!topic) {
    return (
      <div
        className={`conversation-panel flex flex-col items-center justify-center h-full p-8 text-center ${className}`}
      >
        <svg
          className="w-16 h-16 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a topic to start</h2>
        <p className="text-sm text-gray-600">
          Choose a topic from the left panel to view the conversation
        </p>
      </div>
    );
  }

  return (
    <div className={`conversation-panel flex flex-col h-full ${className}`}>
      {/* Topic Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4">
          {/* Hamburger Menu Button (Tablet/Mobile) */}
          {showHamburgerMenu && toggleLeftPanelOverlay && (
            <button
              type="button"
              onClick={toggleLeftPanelOverlay}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              aria-label="Open topic navigation"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{topic.title}</h1>
            <p className="text-sm text-gray-600 line-clamp-2">{topic.description}</p>
          </div>

          {/* Topic Status Badge */}
          <div className="flex-shrink-0">
            <span
              className={`
                inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                ${
                  topic.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : topic.status === 'SEEDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }
              `}
            >
              {topic.status}
            </span>
          </div>
        </div>

        {/* Topic Metadata */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>{topic.participantCount} participants</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span>{topic.responseCount} responses</span>
          </div>

          {topic.currentDiversityScore !== null && (
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>Diversity: {topic.currentDiversityScore.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {topic.tags && topic.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {topic.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* New Responses Notification Banner */}
      {newResponseCount > 0 && (
        <div className="flex-shrink-0 px-6 py-3 bg-primary-50 border-b border-primary-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-primary-900">
              <svg
                className="w-5 h-5 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="font-medium">
                {newResponseCount} new {newResponseCount === 1 ? 'response' : 'responses'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLoadNewResponses}
              className="px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors"
            >
              Click to load
            </button>
          </div>
        </div>
      )}

      {/* Topic Status Change Banner */}
      {topicStatusChange && (
        <div
          className={`flex-shrink-0 px-6 py-3 border-b ${
            topicStatusChange.newStatus === 'ARCHIVED'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200'
          }`}
          role="alert"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <svg
                className={`w-5 h-5 ${topicStatusChange.newStatus === 'ARCHIVED' ? 'text-yellow-600' : 'text-blue-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                className={
                  topicStatusChange.newStatus === 'ARCHIVED' ? 'text-yellow-900' : 'text-blue-900'
                }
              >
                Topic is now <strong>{topicStatusChange.newStatus.toLowerCase()}</strong>
                {topicStatusChange.newStatus === 'ARCHIVED' && ' - read-only'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismissStatusChange}
              className="p-1 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Response List */}
      <div ref={responseListContainerRef} className="flex-1 overflow-auto px-6 py-4">
        <ResponseList
          discussionId={topic.id}
          enableThreading
          height={height ? height - 280 : 520}
          highlightedResponseIds={highlightedResponseIds}
          onReplySubmit={handleReplySubmitWithScroll}
          onPreviewFeedbackChange={onPreviewFeedbackChange}
        />
      </div>

      {/* Response Composer (sticky bottom) */}
      {showComposer && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <ResponseComposer
            topicId={topic.id}
            onSubmit={onResponseSubmit || (() => Promise.resolve())}
            onPreviewFeedbackChange={onPreviewFeedbackChange}
            showPreviewFeedbackInline={false}
          />
        </div>
      )}
    </div>
  );
}
