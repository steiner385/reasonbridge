/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { useTopic } from '../../lib/useTopic';
import { useCommonGroundAnalysis } from '../../lib/useCommonGroundAnalysis';
import { useCommonGroundUpdates } from '../../hooks/useCommonGroundUpdates';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BridgingSuggestionsSection, ShareButton } from '../../components/common-ground';
import { MobileActionBar } from '../../components/layouts';
import ResponseComposer from '../../components/responses/ResponseComposer';
import TopicDetailSkeleton from '../../components/ui/skeletons/TopicDetailSkeleton';
import { apiClient } from '../../lib/api';
import type { CommonGroundAnalysis, BridgingSuggestionsResponse } from '../../types/common-ground';
import type { CreateResponseRequest } from '../../types/response';

function TopicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: topic, isLoading, error } = useTopic(id);
  const { data: commonGroundAnalysis } = useCommonGroundAnalysis(id);
  const showSkeleton = useDelayedLoading(isLoading);

  // State to hold the current analysis (from HTTP or WebSocket)
  const [liveAnalysis, setLiveAnalysis] = useState<CommonGroundAnalysis | null>(
    commonGroundAnalysis || null,
  );

  // State for response submission
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // State for bridging suggestions (populated from API or derived from analysis)
  const [bridgingSuggestions, setBridgingSuggestions] =
    useState<BridgingSuggestionsResponse | null>(null);

  // Update live analysis when HTTP data loads
  useEffect(() => {
    if (commonGroundAnalysis && !liveAnalysis) {
      setLiveAnalysis(commonGroundAnalysis);
    }
  }, [commonGroundAnalysis, liveAnalysis]);

  // WebSocket subscription for real-time updates
  const handleCommonGroundUpdate = useCallback(
    (analysis: CommonGroundAnalysis, _isUpdate: boolean) => {
      setLiveAnalysis(analysis);
    },
    [],
  );

  // Handle response submission
  const handleSubmitResponse = useCallback(
    async (request: CreateResponseRequest) => {
      if (!id) return;

      setIsSubmittingResponse(true);
      try {
        await apiClient.post(`/topics/${id}/responses`, request);
        // Future: Refresh response list, show success message
      } finally {
        setIsSubmittingResponse(false);
      }
    },
    [id],
  );

  // Fetch bridging suggestions when analysis is available
  const fetchBridgingSuggestions = useCallback(async () => {
    if (!id) return;

    try {
      const suggestions = await apiClient.get<BridgingSuggestionsResponse>(
        `/topics/${id}/bridging-suggestions`,
      );
      setBridgingSuggestions(suggestions);
    } catch {
      // Silently fail - just don't show the section
    }
  }, [id]);

  // Fetch bridging suggestions when analysis loads
  useEffect(() => {
    if (liveAnalysis && !bridgingSuggestions) {
      fetchBridgingSuggestions();
    }
  }, [liveAnalysis, bridgingSuggestions, fetchBridgingSuggestions]);

  useCommonGroundUpdates({
    topicId: id || '',
    onUpdate: handleCommonGroundUpdate,
    enabled: !!id,
  });

  if (showSkeleton) {
    return <TopicDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card variant="elevated" padding="lg">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-fallacy-DEFAULT mb-2">Error Loading Topic</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error instanceof Error ? error.message : 'Failed to load topic'}
            </p>
            <Link to="/topics">
              <Button variant="primary">Back to Topics</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card variant="elevated" padding="lg">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Topic Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The topic you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Link to="/topics">
              <Button variant="primary">Back to Topics</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'SEEDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          to="/topics"
          className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Topics
        </Link>
      </div>

      {/* Main Topic Card */}
      <Card variant="elevated" padding="lg" className="mb-6">
        <CardHeader
          title={topic.title}
          action={
            <span
              className={`text-sm font-medium px-3 py-1.5 rounded ${getStatusColor(topic.status)}`}
            >
              {topic.status}
            </span>
          }
        >
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Created {new Date(topic.createdAt).toLocaleDateString()}</span>
            </div>
            {topic.activatedAt && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>Activated {new Date(topic.activatedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardBody>
          <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 text-fluid-lg mb-6 whitespace-pre-wrap leading-relaxed prose-reading-width">
            {topic.description}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
              data-testid="participant-count"
            >
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="text-sm font-medium">Participants</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {topic.participantCount}
              </p>
            </div>

            <div
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
              data-testid="response-count"
            >
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <span className="text-sm font-medium">Responses</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {topic.responseCount}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span className="text-sm font-medium">Diversity Score</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {topic.currentDiversityScore != null
                  ? topic.currentDiversityScore.toFixed(1)
                  : 'N/A'}
              </p>
              {topic.currentDiversityScore !== null && topic.minimumDiversityScore != null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">
                  Min required: {topic.minimumDiversityScore.toFixed(1)}
                </p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium">Evidence</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2">
                {topic.evidenceStandards}
              </p>
            </div>
          </div>

          {/* Tags */}
          {topic.tags && topic.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {topic.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-sm bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 px-3 py-1 rounded-full"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Cutting Themes */}
          {topic.crossCuttingThemes && topic.crossCuttingThemes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Cross-Cutting Themes
              </h3>
              <div className="flex flex-wrap gap-2">
                {topic.crossCuttingThemes.map((theme, index) => (
                  <span
                    key={index}
                    className="text-sm bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-300 px-3 py-1 rounded-full"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="primary" size="lg" fullWidth className="sm:w-auto">
              Join Discussion
            </Button>
            {liveAnalysis && <ShareButton analysis={liveAnalysis} />}
          </div>
        </CardBody>
      </Card>

      {/* Common Ground Analysis Section - Temporarily disabled due to type mismatch between frontend/backend */}
      {/* {!isLoadingAnalysis && liveAnalysis && (
        <div className="mb-6">
          <CommonGroundSummaryPanel
            analysis={liveAnalysis}
            showLastUpdated={true}
            showEmptyState={true}
            onViewAgreementZone={(_zoneId) => {
              // Future: Navigate to detailed view or open modal
            }}
            onViewMisunderstanding={(_misunderstandingId) => {
              // Future: Navigate to detailed view or open modal
            }}
            onViewDisagreement={(_disagreementId) => {
              // Future: Navigate to detailed view or open modal
            }}
          />
        </div>
      )} */}

      {/* Bridging Suggestions Section */}
      {bridgingSuggestions && (
        <div className="mb-6">
          <BridgingSuggestionsSection
            suggestions={bridgingSuggestions}
            showAttribution={true}
            showEmptyState={false}
            onViewSuggestion={(_propositionId) => {
              // Future: Navigate to proposition detail or open modal
            }}
          />
        </div>
      )}

      {/* Responses Section */}
      {topic.responseCount === 0 && (
        <div className="mb-6">
          <Card variant="default" padding="lg">
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <h3 className="mt-4 text-fluid-xl font-semibold text-gray-900 dark:text-gray-100">
                No responses yet
              </h3>
              <p className="mt-2 text-fluid-base text-gray-600 dark:text-gray-400 dark:text-gray-400">
                Be the first to share your perspective on this topic.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Response Composer Section */}
      <div className="mb-6 md:mb-6 pb-20 md:pb-0">
        <Card variant="default" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Share Your Perspective
          </h3>
          <ResponseComposer
            onSubmit={handleSubmitResponse}
            isLoading={isSubmittingResponse}
            placeholder="Share your perspective on this topic..."
            topicId={id}
          />
        </Card>
      </div>

      {/* Mobile Action Bar - Fixed bottom CTA on mobile */}
      <MobileActionBar>
        <Button variant="primary" size="lg" fullWidth>
          Join Discussion
        </Button>
      </MobileActionBar>
    </div>
  );
}

export default TopicDetailPage;
