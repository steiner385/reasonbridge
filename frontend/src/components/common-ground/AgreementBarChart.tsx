/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Proposition } from '../../types/common-ground';

export interface AgreementBarChartProps {
  /**
   * Array of propositions to visualize
   */
  propositions: Proposition[];

  /**
   * Optional title for the chart
   */
  title?: string;

  /**
   * Whether to show participant counts
   */
  showParticipantCounts?: boolean;

  /**
   * Optional callback when a bar is clicked
   */
  onPropositionClick?: (propositionId: string) => void;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Maximum number of propositions to display (default: all)
   */
  limit?: number;

  /**
   * Sort order for propositions
   */
  sortBy?: 'agreement-desc' | 'agreement-asc' | 'original';
}

/**
 * Get color based on agreement percentage
 */
const getAgreementColor = (percentage: number): string => {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-yellow-500';
  if (percentage >= 20) return 'bg-orange-500';
  return 'bg-red-500';
};

/**
 * Get color class for text based on agreement percentage
 */
const getAgreementTextColor = (percentage: number): string => {
  if (percentage >= 80) return 'text-green-700';
  if (percentage >= 60) return 'text-blue-700';
  if (percentage >= 40) return 'text-yellow-700';
  if (percentage >= 20) return 'text-orange-700';
  return 'text-red-700';
};

/**
 * AgreementBarChart - Visualizes proposition agreement as horizontal bars
 *
 * This component displays agreement percentages for propositions using
 * horizontal bar charts with color coding based on agreement level.
 */
const AgreementBarChart = ({
  propositions,
  title = 'Agreement Levels',
  showParticipantCounts = true,
  onPropositionClick,
  className = '',
  limit,
  sortBy = 'original',
}: AgreementBarChartProps) => {
  // Sort propositions based on sortBy parameter
  const sortedPropositions = [...propositions];
  if (sortBy === 'agreement-desc') {
    sortedPropositions.sort((a, b) => b.agreementPercentage - a.agreementPercentage);
  } else if (sortBy === 'agreement-asc') {
    sortedPropositions.sort((a, b) => a.agreementPercentage - b.agreementPercentage);
  }

  // Apply limit if specified
  const displayedPropositions = limit ? sortedPropositions.slice(0, limit) : sortedPropositions;

  if (displayedPropositions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sm text-gray-500">No propositions to display</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}

      <div className="space-y-4">
        {displayedPropositions.map((proposition) => {
          const barColor = getAgreementColor(proposition.agreementPercentage);
          const textColor = getAgreementTextColor(proposition.agreementPercentage);
          const totalParticipants =
            proposition.supportingParticipants.length +
            proposition.opposingParticipants.length +
            proposition.neutralParticipants.length;

          return (
            <div
              key={proposition.id}
              className={`${
                onPropositionClick ? 'cursor-pointer hover:bg-gray-50' : ''
              } rounded-lg transition-colors`}
              onClick={() => onPropositionClick?.(proposition.id)}
              role={onPropositionClick ? 'button' : 'article'}
              tabIndex={onPropositionClick ? 0 : undefined}
              onKeyPress={(e) => {
                if (onPropositionClick && (e.key === 'Enter' || e.key === ' ')) {
                  onPropositionClick(proposition.id);
                }
              }}
              aria-label={`Proposition: ${proposition.text}, ${proposition.agreementPercentage}% agreement`}
            >
              {/* Proposition text */}
              <div className="mb-2 flex items-start justify-between">
                <p className="text-sm text-gray-800 flex-1 mr-4">{proposition.text}</p>
                <span className={`text-sm font-semibold ${textColor} whitespace-nowrap`}>
                  {proposition.agreementPercentage}%
                </span>
              </div>

              {/* Bar chart */}
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-500 ease-out flex items-center justify-end pr-3`}
                  style={{ width: `${proposition.agreementPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={proposition.agreementPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {proposition.agreementPercentage > 15 && (
                    <span className="text-xs font-medium text-white">
                      {proposition.agreementPercentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Participant breakdown */}
              {showParticipantCounts && (
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                    <span>{proposition.supportingParticipants.length} support</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                    <span>{proposition.opposingParticipants.length} oppose</span>
                  </div>
                  {proposition.neutralParticipants.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-full bg-gray-400" />
                      <span>{proposition.neutralParticipants.length} neutral</span>
                    </div>
                  )}
                  <div className="ml-auto text-gray-500">{totalParticipants} total</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-2">Agreement Level Guide:</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600">High (80%+)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-blue-500" />
            <span className="text-gray-600">Good (60-79%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-yellow-500" />
            <span className="text-gray-600">Moderate (40-59%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-orange-500" />
            <span className="text-gray-600">Low (20-39%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-600">Very Low (&lt;20%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgreementBarChart;
