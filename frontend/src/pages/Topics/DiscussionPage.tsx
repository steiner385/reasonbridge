/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DiscussionLayout } from '../../components/discussion-layout/DiscussionLayout';
import { ConversationPanel } from '../../components/discussion-layout/ConversationPanel';
import { MetadataPanel } from '../../components/discussion-layout/MetadataPanel';
import { useTopicNavigation } from '../../hooks/useTopicNavigation';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useTopics } from '../../lib/useTopics';
import { useTopic } from '../../lib/useTopic';
import { usePropositions } from '../../hooks/usePropositions';
import { useCommonGroundAnalysis } from '../../lib/useCommonGroundAnalysis';
import { useBridgingSuggestions } from '../../lib/useBridgingSuggestions';
import { useToast } from '../../contexts/ToastContext';
import { FactCheckProvider } from '../../contexts/FactCheckContext';
import { responseService } from '../../services/responseService';
import type { PreviewFeedbackItem, FeedbackSensitivity } from '../../lib/feedback-api';
import type { CreateResponseRequest } from '../../types/response';

/**
 * Main discussion page component implementing the two-panel discussion interface
 *
 * @remarks
 * This component orchestrates the discussion experience with a 2-panel layout:
 * - **Center Panel**: Conversation thread with responses and composer
 * - **Right Panel**: Metadata including propositions, common ground analysis, and preview feedback
 *
 * Topic navigation is handled by the unified sidebar (see Sidebar.tsx), which adapts
 * to show topic search/filter/list when on /topics or /discussions routes.
 *
 * **Key Features**:
 * - Preview feedback during composition (displayed in right panel)
 * - Unsaved changes protection: warns before the page unloads (refresh/close/
 *   external navigation) while a response is being composed
 * - Proposition/response highlighting and cross-panel interactions
 * - Responsive design (desktop 2-panel, tablet 2-panel, mobile single-panel)
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
  const queryClient = useQueryClient();
  const toast = useToast();
  const [highlightedResponseIds, setHighlightedResponseIds] = useState<Set<string>>(new Set());

  // Composition state for preview feedback in right panel
  const [isComposing, setIsComposing] = useState(false);
  const [previewFeedback, setPreviewFeedback] = useState<PreviewFeedbackItem[]>([]);
  const [isLoadingPreviewFeedback, setIsLoadingPreviewFeedback] = useState(false);
  const [readyToPost, setReadyToPost] = useState(true);
  const [previewSummary, setPreviewSummary] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSensitivity, setPreviewSensitivity] = useState<FeedbackSensitivity>('MEDIUM');

  // Memoize query params to prevent creating new object reference on every render
  // This ensures React Query doesn't see a "new" query key each render
  const topicsQueryParams = useMemo(
    () => ({
      status: 'ACTIVE' as const,
      sortBy: 'responseCount' as const,
      sortOrder: 'desc' as const,
      page: 1,
      limit: 100,
    }),
    [],
  );

  // Fetch active topics to find the active topic in the list
  // (Topic navigation with search/filter is handled by the unified sidebar)
  const { data } = useTopics(topicsQueryParams);

  // Memoize topics array to prevent creating new empty array on every render
  // This ensures useMemo dependencies remain stable
  const topics = useMemo(() => data?.data || [], [data?.data]);

  // Find the active topic object in the list
  const topicInList = useMemo(() => {
    if (!activeTopicId) return null;
    return topics.find((t) => t.id === activeTopicId) || null;
  }, [activeTopicId, topics]);

  // Fallback: fetch individual topic if not found in list
  // This handles newly created topics that might not be in the filtered list yet
  // Only fetch if we have an activeTopicId but didn't find it in the list
  const shouldFetchIndividual = !!activeTopicId && !topicInList;
  const { data: individualTopic } = useTopic(shouldFetchIndividual ? activeTopicId : undefined);

  // Use topic from list, or fall back to individual fetch
  const activeTopic = topicInList || individualTopic || null;

  // Memoize keywords to prevent creating new array on every render
  const keywords = useMemo(() => activeTopic?.tags?.map((t) => t.name), [activeTopic?.tags]);

  // Update document meta tags for SEO
  useDocumentMeta({
    title: activeTopic?.title,
    description: activeTopic?.description?.substring(0, 160),
    keywords,
    canonical: activeTopic
      ? `${window.location.origin}/discussions?topic=${activeTopic.id}`
      : undefined,
    ogType: 'article',
  });

  // Fetch propositions for the active topic
  const { data: rawPropositions = [] } = usePropositions(activeTopic?.id || null);

  // Fetch common ground analysis for the active topic
  const { data: commonGroundAnalysis, isLoading: isLoadingCommonGround } = useCommonGroundAnalysis(
    activeTopicId ?? undefined,
  );

  // Fetch bridging suggestions for the active topic
  const { data: bridgingSuggestionsData, isLoading: isLoadingBridging } = useBridgingSuggestions(
    activeTopicId ?? undefined,
  );

  // Transform propositions to match PropositionItem type expected by MetadataPanel
  const propositions = useMemo(() => {
    return rawPropositions.map((p) => ({
      id: p.id,
      statement: p.statement,
      alignmentData: {
        supportCount: p.supportCount,
        opposeCount: p.opposeCount,
        nuancedCount: p.nuancedCount,
        consensusScore: null, // Not available from backend yet
      },
      relatedResponseIds: p.responses.map((r) => r.responseId),
    }));
  }, [rawPropositions]);

  // Handle proposition hover - highlight related responses
  // Memoized with useCallback to prevent unnecessary re-renders
  const handlePropositionHover = useCallback(
    (propositionId: string | null) => {
      if (propositionId === null) {
        setHighlightedResponseIds(new Set());
        return;
      }
      // Find the proposition and highlight its related responses
      const proposition = propositions.find((p) => p.id === propositionId);
      if (proposition) {
        setHighlightedResponseIds(new Set(proposition.relatedResponseIds));
      }
    },
    [propositions],
  );

  // Handle proposition click - scroll to and highlight related responses
  // Memoized with useCallback to prevent unnecessary re-renders
  const handlePropositionClick = useCallback(
    (_propositionId: string, relatedResponseIds: string[]) => {
      setHighlightedResponseIds(new Set(relatedResponseIds));

      // Scroll to first related response
      if (relatedResponseIds.length > 0) {
        const firstResponseId = relatedResponseIds[0];
        const element = document.querySelector(`[data-response-id="${firstResponseId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    [],
  );

  // Handle agreement zone click - highlight related responses
  // Memoized with useCallback to prevent unnecessary re-renders
  const handleAgreementZoneClick = useCallback((_zoneId: string, relatedResponseIds: string[]) => {
    setHighlightedResponseIds(new Set(relatedResponseIds));

    // Scroll to first related response
    if (relatedResponseIds.length > 0) {
      const firstResponseId = relatedResponseIds[0];
      const element = document.querySelector(`[data-response-id="${firstResponseId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  // Handle preview feedback changes from ResponseComposer
  // Memoized with useCallback to prevent infinite re-render loop when passed to child components
  const handlePreviewFeedbackChange = useCallback(
    (
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
    },
    [], // No dependencies needed - uses only setState functions which are stable
  );

  // Handle composition state changes (when user starts/stops composing)
  // Memoized with useCallback to prevent unnecessary re-renders
  const handleCompositionStateChange = useCallback((composing: boolean) => {
    setIsComposing(composing);
    if (!composing) {
      // Clear preview feedback when composition ends
      setPreviewFeedback([]);
      setPreviewSummary('');
      setPreviewError(null);
      setReadyToPost(true);
      setIsLoadingPreviewFeedback(false);
    }
  }, []);

  // Handle refetching responses (called when user clicks "Load new responses")
  const handleRefetchResponses = useCallback(() => {
    if (activeTopicId) {
      queryClient.invalidateQueries({ queryKey: ['responses', activeTopicId] });
    }
  }, [queryClient, activeTopicId]);

  // Handle refreshing common ground analysis (called when user clicks "Refresh")
  const handleRefreshCommonGround = useCallback(() => {
    if (activeTopicId) {
      queryClient.invalidateQueries({ queryKey: ['commonGroundAnalysis', activeTopicId] });
    }
  }, [queryClient, activeTopicId]);

  // Handle inline reply submission (memoized to prevent unnecessary re-renders)
  const handleReplySubmit = useCallback(
    async (response: CreateResponseRequest) => {
      if (!response.parentId) {
        toast.error('Cannot submit reply: missing parent response ID');
        return;
      }

      try {
        // Call the API to create the reply
        await responseService.replyToResponse(response.parentId, {
          content: response.content,
          citations: response.citedSources?.map((url) => ({ url })),
        });

        // Clear composition state after successful submission
        handleCompositionStateChange(false);

        // Invalidate responses query to refetch updated list with new reply
        if (activeTopic?.id) {
          await queryClient.invalidateQueries({ queryKey: ['responses', activeTopic.id] });
        }

        toast.success('Reply posted successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to post reply';
        toast.error(message);
      }
    },
    [handleCompositionStateChange, activeTopic, queryClient, toast],
  );

  // Unsaved-changes protection: while a response is being composed, warn the user
  // before the browser unloads the page (refresh, tab close, or navigation to an
  // external URL) so an in-progress draft isn't discarded silently.
  //
  // (The previous in-app "switch topics" confirmation dialog was dead code — its
  // open-state setters were never called and topic switching happens in the
  // external unified Sidebar, outside this component — so it was removed in
  // favour of this working guard. See issue #1335.)
  useEffect(() => {
    if (!isComposing) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers require returnValue to be set to trigger the prompt.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isComposing]);

  // Data fetching is implemented above via React Query hooks:
  // - usePropositions: fetches propositions for the active topic
  // - useCommonGroundAnalysis: fetches common ground analysis (refetch via handleRefreshCommonGround)
  // - useBridgingSuggestions: fetches bridging suggestions
  // Optional optimization: implement tab-based lazy loading via onTabActivate callback

  return (
    <FactCheckProvider>
      <DiscussionLayout
        hideSidebar={true}
        centerPanel={
          <ConversationPanel
            topic={activeTopic}
            highlightedResponseIds={highlightedResponseIds}
            showComposer
            height={typeof window !== 'undefined' ? window.innerHeight : 800}
            onPreviewFeedbackChange={handlePreviewFeedbackChange}
            onCompositionStateChange={handleCompositionStateChange}
            onReplySubmit={handleReplySubmit}
            onRefetchResponses={handleRefetchResponses}
          />
        }
        rightPanel={
          <MetadataPanel
            topic={activeTopic}
            propositions={propositions}
            commonGroundAnalysis={commonGroundAnalysis ?? null}
            bridgingSuggestions={bridgingSuggestionsData ?? null}
            isLoadingCommonGround={isLoadingCommonGround}
            isLoadingBridging={isLoadingBridging}
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
            onRefreshCommonGround={handleRefreshCommonGround}
          />
        }
      />
    </FactCheckProvider>
  );
}
