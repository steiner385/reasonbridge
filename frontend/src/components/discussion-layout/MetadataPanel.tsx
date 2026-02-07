/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import CommonGroundSummaryPanel from '../common-ground/CommonGroundSummaryPanel';
import BridgingSuggestionsSection from '../common-ground/BridgingSuggestionsSection';
import { PropositionList, type PropositionItem } from '../common-ground/PropositionList';
import { PreviewFeedbackPanel } from '../feedback/PreviewFeedbackPanel';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { Topic } from '../../types/topic';
import type { CommonGroundAnalysis, BridgingSuggestionsResponse } from '../../types/common-ground';
import type { PreviewFeedbackItem, FeedbackSensitivity } from '../../lib/feedback-api';

/**
 * MetadataPanel tab types
 */
export type MetadataPanelTab = 'propositions' | 'commonGround' | 'bridging' | 'preview' | 'info';

/**
 * MetadataPanel props
 */
export interface MetadataPanelProps {
  /** Active topic */
  topic: Topic | null;
  /** Propositions for the topic */
  propositions?: PropositionItem[];
  /** Common ground analysis data (lazy loaded) */
  commonGroundAnalysis?: CommonGroundAnalysis | null;
  /** Bridging suggestions data (lazy loaded) */
  bridgingSuggestions?: BridgingSuggestionsResponse | null;
  /** Loading state for common ground */
  isLoadingCommonGround?: boolean;
  /** Loading state for bridging suggestions */
  isLoadingBridging?: boolean;
  /** Callback when a tab is activated (for lazy loading) */
  onTabActivate?: (tab: MetadataPanelTab) => void;
  /** Callback when a proposition is hovered (highlights related responses) */
  onPropositionHover?: (propositionId: string | null) => void;
  /** Callback when a proposition is clicked (scrolls to related responses) */
  onPropositionClick?: (propositionId: string, relatedResponseIds: string[]) => void;
  /** Callback when agreement zone is clicked (highlights related responses) */
  onAgreementZoneClick?: (zoneId: string, relatedResponseIds: string[]) => void;
  /** Preview feedback items (shown when composing) */
  previewFeedback?: PreviewFeedbackItem[];
  /** Whether preview feedback is loading */
  isLoadingPreviewFeedback?: boolean;
  /** Whether content is ready to post */
  readyToPost?: boolean;
  /** Preview feedback summary */
  previewSummary?: string;
  /** Preview feedback error */
  previewError?: string | null;
  /** Preview feedback sensitivity level */
  previewSensitivity?: FeedbackSensitivity;
  /** Callback when preview sensitivity changes */
  onPreviewSensitivityChange?: (sensitivity: FeedbackSensitivity) => void;
  /** Whether user is currently composing (shows Preview tab) */
  isComposing?: boolean;
  /** Height of the panel in pixels */
  height?: number;
  /** CSS class name */
  className?: string;
}

/**
 * Metadata panel for right sidebar
 * Displays propositions, common ground analysis, bridging suggestions, and topic info
 * Uses collapsible sections for space efficiency
 */
export function MetadataPanel({
  topic,
  propositions = [],
  commonGroundAnalysis,
  bridgingSuggestions,
  isLoadingCommonGround = false,
  isLoadingBridging = false,
  onTabActivate,
  onPropositionHover,
  onPropositionClick,
  onAgreementZoneClick,
  previewFeedback = [],
  isLoadingPreviewFeedback = false,
  readyToPost = true,
  previewSummary = '',
  previewError = null,
  previewSensitivity = 'MEDIUM',
  onPreviewSensitivityChange,
  isComposing = false,
  height: _height,
  className = '',
}: MetadataPanelProps) {
  const [activeTab, setActiveTab] = useState<MetadataPanelTab>('propositions');
  const [highlightedPropositionId, setHighlightedPropositionId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<MetadataPanelTab>>(
    new Set(['propositions']),
  );
  const [hasCommonGroundUpdate, setHasCommonGroundUpdate] = useState(false);

  const breakpoint = useBreakpoint();
  const { subscribe } = useWebSocket();

  const isMobile = breakpoint === 'mobile';

  // Subscribe to common ground updates
  useEffect(() => {
    if (!topic?.id) return;

    const unsubscribe = subscribe('COMMON_GROUND_UPDATE', (message) => {
      if (message.payload.topicId === topic.id) {
        setHasCommonGroundUpdate(true);
      }
    });

    return unsubscribe;
  }, [topic?.id, subscribe]);

  const toggleSection = (section: MetadataPanelTab) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Handle refreshing common ground analysis
  const handleRefreshCommonGround = () => {
    setHasCommonGroundUpdate(false);
    // TODO: Trigger refetch of common ground analysis from API
    // This will be implemented when we have real API integration
    if (onTabActivate) {
      onTabActivate('commonGround');
    }
  };

  // Auto-switch to Preview tab when composing starts
  useEffect(() => {
    if (isComposing && activeTab !== 'preview') {
      // Schedule state update asynchronously to avoid cascading renders
      setTimeout(() => {
        setActiveTab('preview');
      }, 0);
    }
  }, [isComposing, activeTab]);

  const handleTabClick = (tab: MetadataPanelTab) => {
    setActiveTab(tab);
    if (onTabActivate) {
      onTabActivate(tab);
    }
  };

  const handlePropositionHover = (propositionId: string | null) => {
    setHighlightedPropositionId(propositionId);
    if (onPropositionHover) {
      onPropositionHover(propositionId);
    }
  };

  const handlePropositionClick = (propositionId: string, relatedResponseIds: string[]) => {
    setHighlightedPropositionId(propositionId);
    if (onPropositionClick) {
      onPropositionClick(propositionId, relatedResponseIds);
    }
  };

  // Empty state when no topic selected
  if (!topic) {
    return (
      <div
        className={`metadata-panel flex flex-col items-center justify-center h-full p-8 text-center ${className}`}
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm text-gray-600">Select a topic to view metadata</p>
      </div>
    );
  }

  // Render accordion section for mobile
  const renderAccordionSection = (
    section: MetadataPanelTab,
    title: string,
    content: React.ReactNode,
  ) => {
    const isExpanded = expandedSections.has(section);

    return (
      <div key={section} className="border-b border-gray-200">
        <button
          type="button"
          onClick={() => toggleSection(section)}
          className="flex items-center justify-between w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
          aria-expanded={isExpanded}
        >
          <span className="text-sm font-medium text-gray-900">{title}</span>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && <div className="p-4 bg-white">{content}</div>}
      </div>
    );
  };

  // Mobile Accordion Render
  if (isMobile) {
    return (
      <div className={`metadata-panel flex flex-col h-full overflow-y-auto ${className}`}>
        {/* Propositions Section */}
        {renderAccordionSection(
          'propositions',
          'Propositions',
          <PropositionList
            propositions={propositions}
            highlightedPropositionId={highlightedPropositionId}
            onPropositionHover={handlePropositionHover}
            onPropositionClick={handlePropositionClick}
          />,
        )}

        {/* Common Ground Section */}
        {renderAccordionSection(
          'commonGround',
          'Common Ground',
          <>
            {isLoadingCommonGround && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-8 h-8 border-4 border-gray-300 border-t-primary-600 rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-gray-600">Analyzing common ground...</p>
                </div>
              </div>
            )}

            {!isLoadingCommonGround && !commonGroundAnalysis && (
              <div className="text-center py-8 text-gray-600">
                <p className="text-sm font-medium">No common ground analysis yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Analysis will appear once the discussion has enough responses
                </p>
              </div>
            )}

            {!isLoadingCommonGround && commonGroundAnalysis && (
              <CommonGroundSummaryPanel
                analysis={commonGroundAnalysis}
                onAgreementZoneClick={onAgreementZoneClick}
              />
            )}
          </>,
        )}

        {/* Bridging Suggestions Section */}
        {renderAccordionSection(
          'bridging',
          'Bridging',
          <>
            {isLoadingBridging && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-8 h-8 border-4 border-gray-300 border-t-primary-600 rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-gray-600">Generating bridging suggestions...</p>
                </div>
              </div>
            )}

            {!isLoadingBridging && !bridgingSuggestions && (
              <div className="text-center py-8 text-gray-600">
                <p className="text-sm font-medium">No bridging suggestions yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Suggestions will appear to help bridge disagreements
                </p>
              </div>
            )}

            {!isLoadingBridging && bridgingSuggestions && (
              <BridgingSuggestionsSection suggestions={bridgingSuggestions} />
            )}
          </>,
        )}

        {/* Preview Section (when composing) */}
        {isComposing &&
          renderAccordionSection(
            'preview',
            `Preview ${readyToPost && previewFeedback.length === 0 && !isLoadingPreviewFeedback ? '✓' : ''}`,
            <PreviewFeedbackPanel
              feedback={previewFeedback}
              isLoading={isLoadingPreviewFeedback}
              readyToPost={readyToPost}
              summary={previewSummary}
              error={previewError}
              sensitivity={previewSensitivity}
              onSensitivityChange={onPreviewSensitivityChange}
              showEmpty={true}
              className="border-0 shadow-none"
            />,
          )}
      </div>
    );
  }

  // Desktop/Tablet Tab Render
  return (
    <div className={`metadata-panel flex flex-col h-full ${className}`}>
      {/* Tab Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="flex" role="tablist" aria-label="Discussion metadata">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'propositions'}
            aria-controls="propositions-panel"
            onClick={() => handleTabClick('propositions')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === 'propositions'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }
            `}
          >
            Propositions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'commonGround'}
            aria-controls="common-ground-panel"
            onClick={() => handleTabClick('commonGround')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === 'commonGround'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }
            `}
          >
            Common Ground
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bridging'}
            aria-controls="bridging-panel"
            onClick={() => handleTabClick('bridging')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === 'bridging'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }
            `}
          >
            Bridging
          </button>
          {isComposing && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'preview'}
              aria-controls="preview-panel"
              onClick={() => handleTabClick('preview')}
              className={`
                flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === 'preview'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
            >
              Preview
              {readyToPost && previewFeedback.length === 0 && !isLoadingPreviewFeedback && (
                <span className="ml-1 text-green-600">✓</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Propositions Tab */}
        {activeTab === 'propositions' && (
          <div
            role="tabpanel"
            id="propositions-panel"
            aria-labelledby="propositions-tab"
            className="p-4"
          >
            <PropositionList
              propositions={propositions}
              highlightedPropositionId={highlightedPropositionId}
              onPropositionHover={handlePropositionHover}
              onPropositionClick={handlePropositionClick}
            />
          </div>
        )}

        {/* Common Ground Tab */}
        {activeTab === 'commonGround' && (
          <div
            role="tabpanel"
            id="common-ground-panel"
            aria-labelledby="common-ground-tab"
            className="p-4"
          >
            {/* Common Ground Update Indicator */}
            {hasCommonGroundUpdate && !isLoadingCommonGround && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-blue-900">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Updated - Refresh to see changes</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshCommonGround}
                    className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}

            {isLoadingCommonGround && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-8 h-8 border-4 border-gray-300 border-t-primary-600 rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-gray-600">Analyzing common ground...</p>
                </div>
              </div>
            )}

            {!isLoadingCommonGround && !commonGroundAnalysis && (
              <div className="text-center py-12 text-gray-600">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-sm font-medium">No common ground analysis yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Analysis will appear once the discussion has enough responses
                </p>
              </div>
            )}

            {!isLoadingCommonGround && commonGroundAnalysis && (
              <CommonGroundSummaryPanel
                analysis={commonGroundAnalysis}
                onAgreementZoneClick={onAgreementZoneClick}
              />
            )}
          </div>
        )}

        {/* Bridging Suggestions Tab */}
        {activeTab === 'bridging' && (
          <div role="tabpanel" id="bridging-panel" aria-labelledby="bridging-tab" className="p-4">
            {isLoadingBridging && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-8 h-8 border-4 border-gray-300 border-t-primary-600 rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-gray-600">Generating bridging suggestions...</p>
                </div>
              </div>
            )}

            {!isLoadingBridging && !bridgingSuggestions && (
              <div className="text-center py-12 text-gray-600">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <p className="text-sm font-medium">No bridging suggestions yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Suggestions will appear to help bridge disagreements
                </p>
              </div>
            )}

            {!isLoadingBridging && bridgingSuggestions && (
              <BridgingSuggestionsSection suggestions={bridgingSuggestions} />
            )}
          </div>
        )}

        {/* Preview Feedback Tab (shown during composition) */}
        {activeTab === 'preview' && isComposing && (
          <div role="tabpanel" id="preview-panel" aria-labelledby="preview-tab" className="p-4">
            <PreviewFeedbackPanel
              feedback={previewFeedback}
              isLoading={isLoadingPreviewFeedback}
              readyToPost={readyToPost}
              summary={previewSummary}
              error={previewError}
              sensitivity={previewSensitivity}
              onSensitivityChange={onPreviewSensitivityChange}
              showEmpty={true}
              className="border-0 shadow-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
