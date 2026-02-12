/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Preview Component
 * Feature 016: Topic Management - T232
 *
 * A reusable preview component that displays how a topic will appear
 * after creation. Supports real-time updates as the user types.
 *
 * @remarks
 * - **Features**: Shows title, description, tags, and settings
 * - **Real-time**: Updates as props change for live preview
 * - **Dark mode**: Full Tailwind dark mode support
 * - **Responsive**: Adapts to container width
 *
 * @example
 * ```tsx
 * <TopicPreview
 *   title={formData.title}
 *   description={formData.description}
 *   tags={formData.tags}
 *   visibility="PUBLIC"
 *   evidenceStandards="STANDARD"
 * />
 * ```
 */

import { useMemo } from 'react';

export type TopicVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type EvidenceStandard = 'MINIMAL' | 'STANDARD' | 'RIGOROUS';

export interface TopicPreviewProps {
  /** Topic title */
  title: string;
  /** Topic description */
  description: string;
  /** Array of tag names */
  tags: string[];
  /** Visibility setting */
  visibility: TopicVisibility;
  /** Evidence standard setting */
  evidenceStandards: EvidenceStandard;
  /** Mature content flag */
  isMatureContent?: boolean;
  /** Optional className for the container */
  className?: string;
  /** Whether to show the card border/background */
  variant?: 'card' | 'flat';
  /** Whether to show character counts */
  showCharacterCounts?: boolean;
  /** Custom title placeholder when empty */
  titlePlaceholder?: string;
  /** Custom description placeholder when empty */
  descriptionPlaceholder?: string;
}

const VISIBILITY_LABELS: Record<TopicVisibility, string> = {
  PUBLIC: 'Public',
  PRIVATE: 'Private',
  UNLISTED: 'Unlisted',
};

const VISIBILITY_DESCRIPTIONS: Record<TopicVisibility, string> = {
  PUBLIC: 'Anyone can view and participate',
  PRIVATE: 'Invitation only',
  UNLISTED: 'Only those with link can view',
};

const EVIDENCE_LABELS: Record<EvidenceStandard, string> = {
  MINIMAL: 'Minimal',
  STANDARD: 'Standard',
  RIGOROUS: 'Rigorous',
};

const EVIDENCE_DESCRIPTIONS: Record<EvidenceStandard, string> = {
  MINIMAL: 'Informal discussion',
  STANDARD: 'Claims should be sourced',
  RIGOROUS: 'Academic-level citations required',
};

/**
 * Icon component for visibility setting
 */
function VisibilityIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

/**
 * Icon component for evidence standard setting
 */
function EvidenceIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

/**
 * Icon component for mature content warning
 */
function MatureContentIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

/**
 * Topic Preview Component
 */
export function TopicPreview({
  title,
  description,
  tags,
  visibility,
  evidenceStandards,
  isMatureContent = false,
  className = '',
  variant = 'card',
  showCharacterCounts = false,
  titlePlaceholder = 'No title',
  descriptionPlaceholder = 'No description',
}: TopicPreviewProps) {
  // Memoize character counts
  const characterCounts = useMemo(
    () => ({
      title: title.length,
      description: description.length,
    }),
    [title, description],
  );

  // Container styles based on variant
  const containerStyles =
    variant === 'card'
      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'
      : '';

  return (
    <div className={`${containerStyles} ${className}`} data-testid="topic-preview">
      <div className={variant === 'card' ? 'p-5' : ''}>
        {/* Title */}
        <div className="mb-3">
          <h4
            className="text-xl font-semibold text-gray-900 dark:text-gray-100"
            data-testid="topic-preview-title"
          >
            {title || (
              <span className="text-gray-400 dark:text-gray-500 italic">{titlePlaceholder}</span>
            )}
          </h4>
          {showCharacterCounts && (
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {characterCounts.title}/200 characters
            </span>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <p
            className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"
            data-testid="topic-preview-description"
          >
            {description || (
              <span className="text-gray-400 dark:text-gray-500 italic">
                {descriptionPlaceholder}
              </span>
            )}
          </p>
          {showCharacterCounts && (
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {characterCounts.description}/5000 characters
            </span>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4" data-testid="topic-preview-tags">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Settings Summary */}
        <div
          className="flex flex-wrap gap-4 pt-4 border-t border-gray-100 dark:border-gray-700"
          data-testid="topic-preview-settings"
        >
          {/* Visibility */}
          <div
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            title={VISIBILITY_DESCRIPTIONS[visibility]}
          >
            <VisibilityIcon />
            <span>{VISIBILITY_LABELS[visibility]}</span>
          </div>

          {/* Evidence Standards */}
          <div
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            title={EVIDENCE_DESCRIPTIONS[evidenceStandards]}
          >
            <EvidenceIcon />
            <span>{EVIDENCE_LABELS[evidenceStandards]} evidence</span>
          </div>

          {/* Mature Content */}
          {isMatureContent && (
            <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
              <MatureContentIcon />
              <span>Mature content</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopicPreview;
