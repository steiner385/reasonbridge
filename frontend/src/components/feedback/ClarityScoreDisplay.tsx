import React from 'react';
import type { ClarityScoreDisplayProps, ClarityLevel, ClarityFactors } from '../../types/feedback';

/**
 * Configuration for each clarity level
 */
const CLARITY_CONFIG: Record<
  ClarityLevel,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    ringColor: string;
    description: string;
  }
> = {
  excellent: {
    label: 'Excellent',
    color: 'text-green-700',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500',
    ringColor: 'ring-green-500',
    description: 'Clear, well-structured, and well-supported argument',
  },
  good: {
    label: 'Good',
    color: 'text-blue-700',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    ringColor: 'ring-blue-500',
    description: 'Generally clear with minor areas for improvement',
  },
  moderate: {
    label: 'Moderate',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-500',
    ringColor: 'ring-yellow-500',
    description: 'Some clarity issues that could be addressed',
  },
  needs_improvement: {
    label: 'Needs Work',
    color: 'text-orange-700',
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-500',
    ringColor: 'ring-orange-500',
    description: 'Several areas need clarification or evidence',
  },
  poor: {
    label: 'Poor',
    color: 'text-red-700',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500',
    ringColor: 'ring-red-500',
    description: 'Significant clarity issues detected',
  },
};

/**
 * Size configurations
 */
const SIZE_CONFIG = {
  sm: {
    scoreSize: 'w-12 h-12',
    scoreText: 'text-lg',
    fontSize: 'text-xs',
    padding: 'p-2',
    barHeight: 'h-1.5',
  },
  md: {
    scoreSize: 'w-16 h-16',
    scoreText: 'text-xl',
    fontSize: 'text-sm',
    padding: 'p-3',
    barHeight: 'h-2',
  },
  lg: {
    scoreSize: 'w-20 h-20',
    scoreText: 'text-2xl',
    fontSize: 'text-base',
    padding: 'p-4',
    barHeight: 'h-2.5',
  },
};

/**
 * Factor display labels
 */
const FACTOR_LABELS: Record<keyof ClarityFactors, string> = {
  structure: 'Structure',
  specificity: 'Specificity',
  evidenceSupport: 'Evidence',
  coherence: 'Coherence',
  readability: 'Readability',
};

/**
 * Issue type icons and colors
 */
const ISSUE_CONFIG = {
  unsourced_claim: { icon: '?', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  vague_language: { icon: '~', color: 'text-blue-600', bg: 'bg-blue-100' },
  bias_indicator: { icon: '!', color: 'text-orange-600', bg: 'bg-orange-100' },
  unclear_structure: { icon: '#', color: 'text-purple-600', bg: 'bg-purple-100' },
};

/**
 * ClarityScoreDisplay - Visualizes content clarity analysis
 *
 * Displays a clarity score with optional factor breakdown and issue list.
 * Supports three variants:
 * - detailed: Full display with circular score, factors, and issues
 * - compact: Badge-style with score and level
 * - inline: Minimal inline indicator
 */
const ClarityScoreDisplay: React.FC<ClarityScoreDisplayProps> = ({
  clarity,
  variant = 'detailed',
  showFactors = true,
  showIssues = true,
  showSuggestions = true,
  className = '',
  size = 'md',
  onClick,
}) => {
  const config = CLARITY_CONFIG[clarity.level];
  const sizeConfig = SIZE_CONFIG[size];
  const scorePercent = Math.round(clarity.score * 100);
  const isInteractive = Boolean(onClick);

  // Render inline variant
  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        role="status"
        aria-label={`Clarity: ${scorePercent}%`}
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${config.bgColor}`}
          aria-hidden="true"
        />
        <span className={`${sizeConfig.fontSize} ${config.color} font-medium`}>
          {scorePercent}%
        </span>
      </span>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!isInteractive}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          border ${config.borderColor} ${config.bgColor} bg-opacity-10
          ${isInteractive ? 'cursor-pointer hover:bg-opacity-20 transition-colors' : 'cursor-default'}
          ${className}
        `}
        role="status"
        aria-label={`Clarity score: ${scorePercent}%, ${config.label}`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${config.bgColor}`} aria-hidden="true" />
        <span className={`${sizeConfig.fontSize} ${config.color} font-semibold`}>
          {scorePercent}%
        </span>
        <span className={`${sizeConfig.fontSize} text-gray-500`}>{config.label}</span>
      </button>
    );
  }

  // Render detailed variant
  return (
    <div
      className={`${sizeConfig.padding} rounded-lg bg-white shadow-sm border border-gray-200 ${className}`}
      role="region"
      aria-label="Clarity score analysis"
    >
      {/* Header with circular score */}
      <div className="flex items-start gap-4 mb-4">
        {/* Circular score indicator */}
        <div
          className={`
            ${sizeConfig.scoreSize} rounded-full flex items-center justify-center
            ring-4 ${config.ringColor} ring-opacity-30 ${config.bgColor} bg-opacity-10
          `}
          role="meter"
          aria-valuenow={scorePercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Clarity score: ${scorePercent}%`}
        >
          <span className={`${sizeConfig.scoreText} font-bold ${config.color}`}>
            {scorePercent}
          </span>
        </div>

        {/* Level and description */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${sizeConfig.fontSize} font-semibold ${config.color}`}>
              {config.label} Clarity
            </span>
            {clarity.confidenceScore !== undefined && (
              <span className={`${sizeConfig.fontSize} text-gray-400`}>
                ({Math.round(clarity.confidenceScore * 100)}% confident)
              </span>
            )}
          </div>
          <p className={`${sizeConfig.fontSize} text-gray-600`}>{config.description}</p>
        </div>
      </div>

      {/* Factor breakdown */}
      {showFactors && clarity.factors && Object.keys(clarity.factors).length > 0 && (
        <div className="mb-4">
          <h4 className={`${sizeConfig.fontSize} font-medium text-gray-700 mb-2`}>
            Clarity Factors
          </h4>
          <div className="space-y-2">
            {(Object.entries(clarity.factors) as [keyof ClarityFactors, number | undefined][])
              .filter(([, value]) => value !== undefined)
              .map(([factor, value]) => (
                <div key={factor} className="flex items-center gap-2">
                  <span className={`${sizeConfig.fontSize} text-gray-600 w-20`}>
                    {FACTOR_LABELS[factor]}
                  </span>
                  <div
                    className={`flex-1 ${sizeConfig.barHeight} bg-gray-200 rounded-full overflow-hidden`}
                  >
                    <div
                      className={`h-full ${config.bgColor} transition-all duration-300`}
                      style={{ width: `${(value ?? 0) * 100}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round((value ?? 0) * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <span className={`${sizeConfig.fontSize} text-gray-500 w-10 text-right`}>
                    {Math.round((value ?? 0) * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Issues list */}
      {showIssues && clarity.issues && clarity.issues.length > 0 && (
        <div className="mb-4">
          <h4 className={`${sizeConfig.fontSize} font-medium text-gray-700 mb-2`}>
            Issues Detected ({clarity.issues.length})
          </h4>
          <ul className="space-y-2">
            {clarity.issues.map((issue, index) => {
              const issueConfig = ISSUE_CONFIG[issue.type];
              return (
                <li
                  key={index}
                  className={`${sizeConfig.fontSize} p-2 rounded ${issueConfig.bg} border-l-2 ${issueConfig.color.replace('text-', 'border-')}`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`w-5 h-5 rounded-full ${issueConfig.bg} ${issueConfig.color} flex items-center justify-center font-bold text-xs`}
                      aria-hidden="true"
                    >
                      {issueConfig.icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800">{issue.description}</p>
                      {issue.example && (
                        <p className="text-gray-500 italic mt-1">&quot;{issue.example}&quot;</p>
                      )}
                      {showSuggestions && (
                        <p className="text-gray-600 mt-1">
                          <span className="font-medium">Tip:</span> {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* General suggestion */}
      {showSuggestions && clarity.suggestion && (
        <div className="pt-3 border-t border-gray-100">
          <p className={`${sizeConfig.fontSize} text-gray-700`}>
            <span className="font-medium">Overall suggestion: </span>
            {clarity.suggestion}
          </p>
        </div>
      )}

      {/* Interactive click area */}
      {isInteractive && (
        <button
          type="button"
          onClick={onClick}
          className="mt-3 w-full text-center text-sm text-primary-600 hover:text-primary-800 transition-colors"
        >
          View detailed analysis
        </button>
      )}
    </div>
  );
};

export default ClarityScoreDisplay;
