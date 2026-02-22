/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ArgumentFeedbackPanel - Real-time analysis sidebar for discussion simulation
 *
 * Displays real-time analysis of user arguments including:
 * - Detected fallacies with type, description, and severity
 * - Unsupported claims that need evidence
 * - Scores (tone, evidence, coherence) with visual progress bars
 * - Suggestions for improvement
 *
 * @module components/simulator/ArgumentFeedbackPanel
 */

import React from 'react';
import type { ArgumentAnalysis, Fallacy, SimulationMetrics } from '../../types/simulator';
import { ArgumentAnalysisSkeleton } from '../ui/skeletons';

/**
 * Props for the ArgumentFeedbackPanel component
 */
export interface ArgumentFeedbackPanelProps {
  /** Current argument analysis (null if not analyzed yet) */
  analysis: ArgumentAnalysis | null;
  /** Overall metrics for the session */
  metrics?: SimulationMetrics;
  /** Whether analysis is loading */
  isLoading?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Severity color mapping for fallacy display
 */
const SEVERITY_COLORS = {
  minor: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700',
    icon: 'text-yellow-500 dark:text-yellow-400',
  },
  moderate: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    icon: 'text-orange-500 dark:text-orange-400',
  },
  major: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    icon: 'text-red-500 dark:text-red-400',
  },
};

/**
 * Score color thresholds for visual feedback
 */
function getScoreColor(score: number): {
  bar: string;
  text: string;
  label: string;
} {
  if (score >= 80) {
    return {
      bar: 'bg-green-500 dark:bg-green-600',
      text: 'text-green-600 dark:text-green-400',
      label: 'Excellent',
    };
  } else if (score >= 60) {
    return {
      bar: 'bg-blue-500 dark:bg-blue-600',
      text: 'text-blue-600 dark:text-blue-400',
      label: 'Good',
    };
  } else if (score >= 40) {
    return {
      bar: 'bg-yellow-500 dark:bg-yellow-600',
      text: 'text-yellow-600 dark:text-yellow-400',
      label: 'Fair',
    };
  } else {
    return {
      bar: 'bg-red-500 dark:bg-red-600',
      text: 'text-red-600 dark:text-red-400',
      label: 'Needs Work',
    };
  }
}

/**
 * FallacyItem - Renders a single fallacy with type, description, and severity
 */
interface FallacyItemProps {
  fallacy: Fallacy;
  index: number;
}

const FallacyItem: React.FC<FallacyItemProps> = ({ fallacy, index }) => {
  const colors = SEVERITY_COLORS[fallacy.severity] ?? SEVERITY_COLORS.minor;

  return (
    <div
      className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
      data-testid={`fallacy-item-${index}`}
    >
      {/* Fallacy type and severity badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className={`font-medium text-sm ${colors.text}`}>{fallacy.type}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}
        >
          {fallacy.severity}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{fallacy.description}</p>

      {/* Excerpt from argument */}
      {fallacy.excerpt && (
        <div className="mt-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            &ldquo;{fallacy.excerpt}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * ScoreBar - Renders a score with visual progress bar
 */
interface ScoreBarProps {
  label: string;
  score: number;
  testId: string;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ label, score, testId }) => {
  const scoreColor = getScoreColor(score);

  return (
    <div className="space-y-1" data-testid={testId}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${scoreColor.text}`}>{score}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">/100</span>
        </div>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${scoreColor.bar} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${score} out of 100`}
        />
      </div>
    </div>
  );
};

/**
 * EmptyState - Placeholder when no analysis is available
 */
const EmptyState: React.FC = () => (
  <div
    className="flex flex-col items-center justify-center py-12 text-center"
    data-testid="argument-feedback-empty"
  >
    <svg
      className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4"
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
    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No analysis yet</h4>
    <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px]">
      Submit a message to receive real-time feedback on your argument
    </p>
  </div>
);

/**
 * MetricsSummary - Shows overall session metrics
 */
interface MetricsSummaryProps {
  metrics: SimulationMetrics;
}

const MetricsSummary: React.FC<MetricsSummaryProps> = ({ metrics }) => (
  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-testid="session-metrics">
    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
      Session Summary
    </h4>
    <div className="grid grid-cols-2 gap-2">
      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {metrics.exchangeCount}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Exchanges</div>
      </div>
      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
        <div className="text-lg font-semibold text-red-600 dark:text-red-400">
          {metrics.totalFallacies}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Fallacies</div>
      </div>
      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
        <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
          {metrics.totalUnsupportedClaims}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Unsupported</div>
      </div>
      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
        <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
          {Math.round(
            (metrics.averageToneScore +
              metrics.averageEvidenceScore +
              metrics.averageCoherenceScore) /
              3,
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Avg Score</div>
      </div>
    </div>
  </div>
);

/**
 * ArgumentFeedbackPanel - Real-time analysis sidebar for discussion simulation
 *
 * @remarks
 * This component displays real-time feedback on user arguments during simulation:
 *
 * - **Fallacies Section**: Lists detected logical fallacies with type, explanation,
 *   excerpt, and severity indicator (minor/moderate/major)
 * - **Unsupported Claims**: Lists claims that need evidence backing
 * - **Scores Section**: Visual progress bars for tone (0-100), evidence (0-100),
 *   and coherence (0-100) with color-coded feedback
 * - **Suggestions**: Numbered list of actionable improvement suggestions
 * - **Session Metrics**: Optional summary of overall session performance
 *
 * **States:**
 * - Loading: Shows ArgumentAnalysisSkeleton
 * - Empty: Shows placeholder with instruction
 * - Active: Shows full analysis results
 *
 * **Accessibility:**
 * - ARIA labels on score progress bars
 * - Semantic heading structure
 * - Keyboard navigable
 *
 * @example
 * ```tsx
 * <ArgumentFeedbackPanel
 *   analysis={currentAnalysis}
 *   metrics={sessionMetrics}
 *   isLoading={isAnalyzing}
 * />
 * ```
 */
export const ArgumentFeedbackPanel: React.FC<ArgumentFeedbackPanelProps> = ({
  analysis,
  metrics,
  isLoading = false,
  className = '',
}) => {
  // Show skeleton while loading
  if (isLoading) {
    return <ArgumentAnalysisSkeleton className={className} />;
  }

  // Show empty state if no analysis
  if (!analysis) {
    return (
      <div
        className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
        data-testid="argument-feedback-panel"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Argument Analysis
        </h3>
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
      data-testid="argument-feedback-panel"
      aria-label="Argument feedback analysis"
    >
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Argument Analysis
      </h3>

      <div className="space-y-5">
        {/* Fallacies Section */}
        <section aria-labelledby="fallacies-heading">
          <h4
            id="fallacies-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-red-500 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Fallacies Detected
            {analysis.fallacies.length > 0 && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">
                {analysis.fallacies.length}
              </span>
            )}
          </h4>

          {analysis.fallacies.length === 0 ? (
            <p
              className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2"
              data-testid="no-fallacies"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              No fallacies detected
            </p>
          ) : (
            <div className="space-y-2" data-testid="fallacies-list">
              {analysis.fallacies.map((fallacy, index) => (
                <FallacyItem key={`${fallacy.type}-${index}`} fallacy={fallacy} index={index} />
              ))}
            </div>
          )}
        </section>

        {/* Unsupported Claims Section */}
        <section aria-labelledby="claims-heading">
          <h4
            id="claims-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-orange-500 dark:text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Unsupported Claims
            {analysis.unsupportedClaims.length > 0 && (
              <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full">
                {analysis.unsupportedClaims.length}
              </span>
            )}
          </h4>

          {analysis.unsupportedClaims.length === 0 ? (
            <p
              className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2"
              data-testid="no-unsupported-claims"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              All claims supported
            </p>
          ) : (
            <ul className="space-y-1.5 pl-2" data-testid="unsupported-claims-list">
              {analysis.unsupportedClaims.map((claim, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                  data-testid={`unsupported-claim-${index}`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-orange-400 dark:bg-orange-500 mt-1.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {claim}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Scores Section */}
        <section
          aria-labelledby="scores-heading"
          className="pt-4 border-t border-gray-100 dark:border-gray-800"
        >
          <h4
            id="scores-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-blue-500 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Scores
          </h4>

          <div className="space-y-3">
            <ScoreBar label="Tone" score={analysis.toneScore} testId="score-tone" />
            <ScoreBar label="Evidence" score={analysis.evidenceScore} testId="score-evidence" />
            <ScoreBar label="Coherence" score={analysis.coherenceScore} testId="score-coherence" />
          </div>
        </section>

        {/* Suggestions Section */}
        <section
          aria-labelledby="suggestions-heading"
          className="pt-4 border-t border-gray-100 dark:border-gray-800"
        >
          <h4
            id="suggestions-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 text-green-500 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            Suggestions
          </h4>

          {analysis.suggestions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="no-suggestions">
              No suggestions at this time
            </p>
          ) : (
            <ol className="space-y-2" data-testid="suggestions-list">
              {analysis.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3"
                  data-testid={`suggestion-${index}`}
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Session Metrics (if provided) */}
        {metrics && metrics.exchangeCount > 0 && (
          <section
            aria-labelledby="metrics-heading"
            className="pt-4 border-t border-gray-100 dark:border-gray-800"
          >
            <h4 id="metrics-heading" className="sr-only">
              Session Metrics
            </h4>
            <MetricsSummary metrics={metrics} />
          </section>
        )}
      </div>
    </div>
  );
};

export default ArgumentFeedbackPanel;
