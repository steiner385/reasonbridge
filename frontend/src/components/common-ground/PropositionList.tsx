/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * Proposition item for display
 */
export interface PropositionItem {
  id: string;
  statement: string;
  alignmentData: {
    supportCount: number;
    opposeCount: number;
    nuancedCount: number;
    consensusScore: number | null;
  };
  /** Response IDs that reference this proposition */
  relatedResponseIds?: string[];
}

/**
 * PropositionList props
 */
export interface PropositionListProps {
  /** Array of propositions to display */
  propositions: PropositionItem[];
  /** Currently highlighted proposition ID */
  highlightedPropositionId?: string | null;
  /** Callback when a proposition is hovered */
  onPropositionHover?: (propositionId: string | null) => void;
  /** Callback when a proposition is clicked */
  onPropositionClick?: (propositionId: string, relatedResponseIds: string[]) => void;
  /** CSS class name */
  className?: string;
}

/**
 * Get consensus badge color based on score
 */
function getConsensusColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-700';
  if (score >= 0.7) return 'bg-green-100 text-green-800';
  if (score >= 0.4) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

/**
 * PropositionList component for metadata panel
 * Displays propositions with alignment scores in a compact format
 * Supports hover/click to highlight related responses in conversation
 */
export function PropositionList({
  propositions,
  highlightedPropositionId,
  onPropositionHover,
  onPropositionClick,
  className = '',
}: PropositionListProps) {
  const handleMouseEnter = (propositionId: string) => {
    if (onPropositionHover) {
      onPropositionHover(propositionId);
    }
  };

  const handleMouseLeave = () => {
    if (onPropositionHover) {
      onPropositionHover(null);
    }
  };

  const handleClick = (proposition: PropositionItem) => {
    if (onPropositionClick) {
      onPropositionClick(proposition.id, proposition.relatedResponseIds || []);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, proposition: PropositionItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(proposition);
    }
  };

  // Empty state
  if (propositions.length === 0) {
    return (
      <div className={`proposition-list ${className}`}>
        <div className="text-center py-8 text-gray-600">
          <svg
            className="w-10 h-10 mx-auto mb-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm font-medium">No propositions yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Propositions will appear as the discussion develops
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`proposition-list space-y-3 ${className}`} role="list">
      {propositions.map((proposition) => {
        const isHighlighted = highlightedPropositionId === proposition.id;

        return (
          <div
            key={proposition.id}
            className={`
              proposition-list-item
              p-3 rounded-lg border cursor-pointer transition-all
              ${
                isHighlighted
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }
            `}
            role="button"
            tabIndex={0}
            onMouseEnter={() => handleMouseEnter(proposition.id)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(proposition)}
            onKeyDown={(e) => handleKeyDown(e, proposition)}
            aria-label={`Proposition: ${proposition.statement}`}
            data-proposition-id={proposition.id}
          >
            {/* Proposition Statement */}
            <p className="text-sm text-gray-900 font-medium mb-2 line-clamp-3">
              {proposition.statement}
            </p>

            {/* Alignment Summary */}
            <div className="flex items-center gap-3 text-xs">
              {/* Support */}
              <div className="flex items-center gap-1 text-green-700">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{proposition.alignmentData.supportCount}</span>
              </div>

              {/* Oppose */}
              <div className="flex items-center gap-1 text-red-700">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{proposition.alignmentData.opposeCount}</span>
              </div>

              {/* Nuanced */}
              <div className="flex items-center gap-1 text-blue-700">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{proposition.alignmentData.nuancedCount}</span>
              </div>

              {/* Consensus Score */}
              {proposition.alignmentData.consensusScore !== null && (
                <div className="ml-auto">
                  <span
                    className={`
                      px-2 py-0.5 rounded-full text-xs font-medium
                      ${getConsensusColor(proposition.alignmentData.consensusScore)}
                    `}
                  >
                    {Math.round(proposition.alignmentData.consensusScore * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Related Responses Count */}
            {proposition.relatedResponseIds && proposition.relatedResponseIds.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                {proposition.relatedResponseIds.length} related{' '}
                {proposition.relatedResponseIds.length === 1 ? 'response' : 'responses'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
