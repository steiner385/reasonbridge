/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import AlignmentInput from '../alignments/AlignmentInput';
import type { AlignmentStance } from '../alignments/AlignmentInput';
import AlignmentSummary from '../alignments/AlignmentSummary';
import Card from '../ui/Card';

export interface PropositionAlignmentViewProps {
  /**
   * The proposition statement text
   */
  statement: string;

  /**
   * Proposition ID for alignment tracking
   */
  propositionId: string;

  /**
   * Aggregated alignment data
   */
  alignmentData: {
    supportCount: number;
    opposeCount: number;
    nuancedCount: number;
    consensusScore: number | null;
  };

  /**
   * Current user's alignment (if authenticated and has aligned)
   */
  currentUserAlignment?: {
    stance: AlignmentStance;
    explanation?: string;
  } | null;

  /**
   * Callback when user submits an alignment
   */
  onAlign?: (stance: AlignmentStance, explanation?: string) => void;

  /**
   * Callback when user removes their alignment
   */
  onRemove?: () => void;

  /**
   * Whether user is authenticated
   */
  isAuthenticated?: boolean;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show the proposition statement
   */
  showStatement?: boolean;

  /**
   * Custom className for additional styling
   */
  className?: string;
}

/**
 * PropositionAlignmentView displays a proposition with its alignment summary
 * and input controls, combining AlignmentSummary and AlignmentInput components.
 *
 * This component provides a complete view for users to:
 * - See the proposition statement
 * - View aggregated alignment data (support/oppose/nuanced counts)
 * - View consensus score and description
 * - Indicate their own alignment
 * - Add nuanced explanations when needed
 */
const PropositionAlignmentView: React.FC<PropositionAlignmentViewProps> = ({
  statement,
  propositionId, // Reserved for future use (e.g., deep linking, analytics)
  alignmentData,
  currentUserAlignment = null,
  onAlign,
  onRemove,
  isAuthenticated = false,
  size = 'md',
  showStatement = true,
  className = '',
}) => {
  // Suppress unused variable warning - propositionId is part of the component's API
  void propositionId;
  const sizeClasses = {
    sm: {
      statement: 'text-sm',
      spacing: 'space-y-2',
      padding: 'p-3',
    },
    md: {
      statement: 'text-base',
      spacing: 'space-y-4',
      padding: 'p-4',
    },
    lg: {
      statement: 'text-lg',
      spacing: 'space-y-6',
      padding: 'p-6',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <Card className={`${currentSize.padding} ${className}`}>
      <div className={currentSize.spacing}>
        {/* Proposition Statement */}
        {showStatement && (
          <div>
            <h3 className={`font-semibold text-gray-900 ${currentSize.statement}`}>{statement}</h3>
          </div>
        )}

        {/* Alignment Summary */}
        <AlignmentSummary
          supportCount={alignmentData.supportCount}
          opposeCount={alignmentData.opposeCount}
          nuancedCount={alignmentData.nuancedCount}
          consensusScore={alignmentData.consensusScore}
          size={size}
          showDetails={true}
        />

        {/* Alignment Input (for authenticated users) */}
        {isAuthenticated && (
          <div className="pt-2">
            <AlignmentInput
              currentStance={currentUserAlignment?.stance || null}
              currentExplanation={currentUserAlignment?.explanation || ''}
              onAlign={onAlign || (() => {})}
              onRemove={onRemove || (() => {})}
              disabled={false}
              size={size}
              orientation="horizontal"
              showLabels={true}
            />
          </div>
        )}

        {/* Authentication prompt for unauthenticated users */}
        {!isAuthenticated && (
          <div className="pt-2">
            <p className="text-sm text-gray-500 italic">
              Sign in to express your alignment on this proposition
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PropositionAlignmentView;
