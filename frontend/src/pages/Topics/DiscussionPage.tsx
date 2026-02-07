/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { DiscussionLayout } from '../../components/discussion-layout/DiscussionLayout';
import { TopicNavigationPanel } from '../../components/discussion-layout/TopicNavigationPanel';
import { ConversationPanel } from '../../components/discussion-layout/ConversationPanel';
import { MetadataPanel } from '../../components/discussion-layout/MetadataPanel';
import { useTopicNavigation } from '../../hooks/useTopicNavigation';
import { useTopics } from '../../lib/useTopics';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { PreviewFeedbackItem, FeedbackSensitivity } from '../../lib/feedback-api';
import type { CreateResponseRequest } from '../../types/response';

/**
 * Main discussion page component implementing the redesigned three-panel discussion interface
 *
 * @remarks
 * This component orchestrates the entire discussion experience with:
 * - **Left Panel**: Topic navigation with search, filters, and unread badges
 * - **Center Panel**: Conversation thread with responses and composer
 * - **Right Panel**: Metadata including propositions, common ground analysis, and preview feedback
 *
 * **Key Features**:
 * - Real-time updates via WebSocket (new responses, topic status changes)
 * - Responsive design (desktop 3-panel, tablet 2-panel + overlay, mobile single-panel)
 * - Unread badge management across topics
 * - Preview feedback during composition (displayed in right panel)
 * - Unsaved changes protection when switching topics
 * - Proposition/response highlighting and cross-panel interactions
 *
 * **URL Pattern**: `/discussions?topic=<topicId>`
 *
 * @example
 * ```tsx
 * // Routed at /discussions
 * <Route path="/discussions" element={<DiscussionPage />} />
 * ```
 */
export function DiscussionPage() {
  const { activeTopicId } = useTopicNavigation();
  const [unreadMap, setUnreadMap] = useState<Map<string, boolean>>(new Map());
  const [highlightedResponseIds, setHighlightedResponseIds] = useState<Set<string>>(new Set());
  const { subscribe } = useWebSocket();

  // Composition state for preview feedback in right panel
  const [isComposing, setIsComposing] = useState(false);
  const [previewFeedback, setPreviewFeedback] = useState<PreviewFeedbackItem[]>([]);
  const [isLoadingPreviewFeedback, setIsLoadingPreviewFeedback] = useState(false);
  const [readyToPost, setReadyToPost] = useState(true);
  const [previewSummary, setPreviewSummary] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSensitivity, setPreviewSensitivity] = useState<FeedbackSensitivity>('MEDIUM');

  // Unsaved changes confirmation state
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingTopicId, setPendingTopicId] = useState<string | null>(null);

  // Fetch active topics with high limit for client-side filtering
  const { data, isLoading, error } = useTopics({
    status: 'ACTIVE',
    sortBy: 'responseCount',
    sortOrder: 'desc',
    page: 1,
    limit: 100,
  });

  const topics = data?.data || [];
  const errorMessage = error ? 'Failed to load topics. Please try again.' : null;

  // Find the active topic object
  const activeTopic = useMemo(() => {
    if (!activeTopicId) return null;
    return topics.find((t) => t.id === activeTopicId) || null;
  }, [activeTopicId, topics]);

  // Handle proposition hover - highlight related responses
  const handlePropositionHover = (propositionId: string | null) => {
    if (propositionId === null) {
      setHighlightedResponseIds(new Set());
    }
    // TODO: Fetch related response IDs from proposition data
    // For now, this is a placeholder - will be implemented with real data
  };

  // Handle proposition click - scroll to and highlight related responses
  const handlePropositionClick = (_propositionId: string, relatedResponseIds: string[]) => {
    setHighlightedResponseIds(new Set(relatedResponseIds));

    // Scroll to first related response
    if (relatedResponseIds.length > 0) {
      const firstResponseId = relatedResponseIds[0];
      const element = document.querySelector(`[data-response-id="${firstResponseId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle agreement zone click - highlight related responses
  const handleAgreementZoneClick = (_zoneId: string, relatedResponseIds: string[]) => {
    setHighlightedResponseIds(new Set(relatedResponseIds));

    // Scroll to first related response
    if (relatedResponseIds.length > 0) {
      const firstResponseId = relatedResponseIds[0];
      const element = document.querySelector(`[data-response-id="${firstResponseId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle preview feedback changes from ResponseComposer
  const handlePreviewFeedbackChange = (
    feedback: PreviewFeedbackItem[],
    ready: boolean,
    summary: string,
    isLoading = false,
    error: string | null = null,
  ) => {
    setPreviewFeedback(feedback);
    setReadyToPost(ready);
    setPreviewSummary(summary);
    setIsLoadingPreviewFeedback(isLoading);
    setPreviewError(error);

    // Set composing state when there's content being edited
    if (feedback.length > 0 || isLoading || summary) {
      setIsComposing(true);
    }
  };

  // Handle composition state changes (when user starts/stops composing)
  const handleCompositionStateChange = (composing: boolean) => {
    setIsComposing(composing);
    if (!composing) {
      // Clear preview feedback when composition ends
      setPreviewFeedback([]);
      setPreviewSummary('');
      setPreviewError(null);
      setReadyToPost(true);
      setIsLoadingPreviewFeedback(false);
    }
  };

  // Handle inline reply submission
  const handleReplySubmit = async (response: CreateResponseRequest) => {
    // TODO: Implement actual API call to submit reply
    // For now, just placeholder - API integration will be added later

    // Clear composition state after submission
    handleCompositionStateChange(false);

    // TODO: Invalidate responses query to refetch updated list
    // queryClient.invalidateQueries(['responses', activeTopic?.id]);
  };

  // Subscribe to new response WebSocket messages to update unread badges
  useEffect(() => {
    const unsubscribe = subscribe('NEW_RESPONSE', (message) => {
      const topicId = message.payload.topicId;

      // Don't mark as unread if it's the currently active topic
      if (topicId !== activeTopicId) {
        setUnreadMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(topicId, true);
          return newMap;
        });
      }
    });

    return unsubscribe;
  }, [activeTopicId, subscribe]);

  // Clear unread status when a topic becomes active
  useEffect(() => {
    if (activeTopicId) {
      // Schedule state update asynchronously to avoid cascading renders
      setTimeout(() => {
        setUnreadMap((prev) => {
          const newMap = new Map(prev);
          newMap.delete(activeTopicId);
          return newMap;
        });
      }, 0);
    }
  }, [activeTopicId]);

  // Handle unsaved changes confirmation
  const handleConfirmLeave = () => {
    if (pendingTopicId) {
      setShowUnsavedChangesDialog(false);
      setIsComposing(false);
      // TODO: Navigate to pending topic when navigation API is implemented
      // navigateToTopic(pendingTopicId);
      setPendingTopicId(null);
    }
  };

  const handleCancelLeave = () => {
    setShowUnsavedChangesDialog(false);
    setPendingTopicId(null);
  };

  // TODO: Implement lazy loading for common ground and bridging suggestions (T045, T046)
  // TODO: Fetch real propositions data - for now empty array
  // For now, these are null/empty - will be implemented later in Phase 4

  return (
    <>
      {/* Unsaved Changes Confirmation Dialog */}
      {showUnsavedChangesDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-labelledby="unsaved-changes-title"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 id="unsaved-changes-title" className="text-lg font-semibold text-gray-900 mb-2">
              Unsaved Changes
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              You have unsaved changes in your response. Are you sure you want to leave? Your
              changes will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelLeave}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}

      <DiscussionLayout
        leftPanel={
          <TopicNavigationPanel
            topics={topics}
            unreadMap={unreadMap}
            isLoading={isLoading}
            error={errorMessage}
            height={typeof window !== 'undefined' ? window.innerHeight : 800}
          />
        }
        centerPanel={
          <ConversationPanel
            topic={activeTopic}
            highlightedResponseIds={highlightedResponseIds}
            showComposer
            height={typeof window !== 'undefined' ? window.innerHeight : 800}
            onPreviewFeedbackChange={handlePreviewFeedbackChange}
            onCompositionStateChange={handleCompositionStateChange}
            onReplySubmit={handleReplySubmit}
          />
        }
        rightPanel={
          <MetadataPanel
            topic={activeTopic}
            propositions={[]}
            commonGroundAnalysis={null}
            bridgingSuggestions={null}
            isLoadingCommonGround={false}
            isLoadingBridging={false}
            onPropositionHover={handlePropositionHover}
            onPropositionClick={handlePropositionClick}
            onAgreementZoneClick={handleAgreementZoneClick}
            previewFeedback={previewFeedback}
            isLoadingPreviewFeedback={isLoadingPreviewFeedback}
            readyToPost={readyToPost}
            previewSummary={previewSummary}
            previewError={previewError}
            previewSensitivity={previewSensitivity}
            onPreviewSensitivityChange={setPreviewSensitivity}
            isComposing={isComposing}
            height={typeof window !== 'undefined' ? window.innerHeight : 800}
          />
        }
      />
    </>
  );
}
