/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { FactCheckResult, FactCheckSource } from '../../types/factCheck';

/**
 * External link icon
 */
const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
    />
  </svg>
);

/**
 * Warning/alert icon for conflicts
 */
const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

/**
 * Chevron icon for expand/collapse
 */
const ChevronIcon: React.FC<{ className?: string; expanded?: boolean }> = ({
  className,
  expanded,
}) => (
  <svg
    className={`${className} transform transition-transform ${expanded ? 'rotate-180' : ''}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

/**
 * Single source card
 */
const SourceCard: React.FC<{ source: FactCheckSource }> = ({ source }) => {
  const credibilityColor =
    source.credibilityScore >= 0.8
      ? 'text-green-600 dark:text-green-400'
      : source.credibilityScore >= 0.5
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-700 dark:text-red-400';

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            <span className="truncate">{source.title}</span>
            <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" />
          </a>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{source.provider}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className={`text-xs font-medium ${credibilityColor}`}>
            {Math.round(source.credibilityScore * 100)}%
          </span>
          <p className="text-xs text-gray-400 dark:text-gray-500">credibility</p>
        </div>
      </div>

      {source.rating && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-600 dark:text-gray-300">
            <span className="font-medium">Rating:</span> {source.rating}
          </span>
          {source.ratingDescription && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {source.ratingDescription}
            </p>
          )}
        </div>
      )}

      {source.publishedAt && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Published: {new Date(source.publishedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

/**
 * Single claim result with expandable sources
 */
const ClaimResult: React.FC<{
  result: FactCheckResult;
  defaultExpanded?: boolean;
}> = ({ result, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            &ldquo;{result.claimText}&rdquo;
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {result.sources.length} source{result.sources.length !== 1 ? 's' : ''}
            </span>
            {result.hasConflictingSources && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertIcon className="h-3 w-3" />
                Conflicting info
              </span>
            )}
          </div>
        </div>
        <ChevronIcon className="h-5 w-5 text-gray-400 flex-shrink-0" expanded={expanded} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          {result.hasConflictingSources && result.conflictSummary && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <span className="font-medium">Note:</span> {result.conflictSummary}
              </p>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {result.sources.map((source, index) => (
              <SourceCard key={`${source.url}-${index}`} source={source} />
            ))}
          </div>

          {result.sources.length === 0 && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
              No external sources found for this claim.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export interface FactCheckResultDisplayProps {
  /** Fact-check results to display */
  results: FactCheckResult[];
  /** Whether to show a compact version */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Label for the section */
  label?: string;
}

/**
 * Display fact-check results with sources
 *
 * T259: Create fact-check result display
 *
 * Shows fact-check results as "Related Context" (per FR-012b)
 * with expandable source cards for each claim.
 */
const FactCheckResultDisplay: React.FC<FactCheckResultDisplayProps> = ({
  results,
  compact = false,
  className = '',
  label = 'Related Context',
}) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {results.length} claim{results.length !== 1 ? 's' : ''} checked
        </span>
      </div>

      {/* Results list */}
      <div className={`space-y-${compact ? '2' : '3'}`}>
        {results.map((result, index) => (
          <ClaimResult
            key={result.id || index}
            result={result}
            defaultExpanded={!compact && index === 0}
          />
        ))}
      </div>
    </div>
  );
};

export default FactCheckResultDisplay;
