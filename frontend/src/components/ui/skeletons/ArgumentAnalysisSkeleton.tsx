/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ArgumentAnalysisSkeleton - Loading placeholder for argument analysis panel
 * @module components/ui/skeletons/ArgumentAnalysisSkeleton
 */

import { Skeleton, SkeletonText, A11Y_PROPS } from '../Skeleton';

/**
 * Props for ArgumentAnalysisSkeleton component
 */
export interface ArgumentAnalysisSkeletonProps {
  /** Whether to show progress indicator with steps */
  showProgress?: boolean;
  /** Number of completed steps (for progress indicator) */
  completedSteps?: number;
  /** Total steps (for progress indicator) */
  totalSteps?: number;
  /** Custom className */
  className?: string;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/** Analysis step labels for progress indicator */
const ANALYSIS_STEPS = [
  'Detecting fallacies',
  'Checking claims',
  'Evaluating tone',
  'Scoring evidence',
  'Generating suggestions',
];

/**
 * ProgressStepIndicator renders a single step in the progress tracker
 */
function ProgressStepIndicator({
  step,
  index,
  isCompleted,
  isActive,
  testId,
}: {
  step: string;
  index: number;
  isCompleted: boolean;
  isActive: boolean;
  testId: string;
}) {
  return (
    <div
      className="flex items-center gap-2"
      data-testid={`${testId}-step-${index}`}
      aria-current={isActive ? 'step' : undefined}
    >
      {/* Step indicator circle */}
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isCompleted
            ? 'bg-green-500 dark:bg-green-600 text-white'
            : isActive
              ? 'bg-blue-500 dark:bg-blue-600 text-white animate-pulse'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
        }`}
        aria-hidden="true"
      >
        {isCompleted ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <span className="text-xs">{index + 1}</span>
        )}
      </div>
      {/* Step label */}
      <span
        className={`text-sm ${
          isCompleted
            ? 'text-green-600 dark:text-green-400 line-through'
            : isActive
              ? 'text-blue-600 dark:text-blue-400 font-medium'
              : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        {step}
      </span>
    </div>
  );
}

/**
 * ScoreItemSkeleton renders a score display placeholder
 */
function ScoreItemSkeleton({ label, testId }: { label: string; testId: string }) {
  return (
    <div className="flex items-center justify-between" data-testid={testId}>
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full w-0 bg-gray-300 dark:bg-gray-600 animate-pulse rounded-full"
            style={{ width: '0%' }}
          />
        </div>
        <Skeleton width={24} height={16} className="ml-1" />
      </div>
    </div>
  );
}

/**
 * ListSectionSkeleton renders a list section placeholder with header
 */
function ListSectionSkeleton({
  title,
  itemCount,
  testId,
}: {
  title: string;
  itemCount: number;
  testId: string;
}) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h4>
      <div className="space-y-2 pl-2">
        {Array.from({ length: itemCount }, (_, i) => (
          <div key={i} className="flex items-start gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 shrink-0 animate-pulse"
              aria-hidden="true"
            />
            <SkeletonText lines={1} size="sm" className="flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ArgumentAnalysisSkeleton renders a loading placeholder for the argument analysis panel.
 * Displays shimmer placeholders for all analysis sections including fallacies, claims,
 * scores, and suggestions. Supports an optional progress indicator with step tracking.
 *
 * @remarks
 * - **Progress Indicator**: Shows step-by-step progress with checkmarks for completed steps
 * - **Score Sections**: Displays placeholders for tone, evidence, and coherence scores
 * - **List Sections**: Shimmer placeholders for fallacies, unsupported claims, and suggestions
 * - **Dark Mode**: Full support via Tailwind dark: modifier
 * - **Accessibility**: ARIA attributes for loading state and step progression
 *
 * @example
 * // Basic usage - just shimmer placeholders
 * <ArgumentAnalysisSkeleton />
 *
 * @example
 * // With progress indicator showing 2 of 5 steps complete
 * <ArgumentAnalysisSkeleton showProgress completedSteps={2} totalSteps={5} />
 *
 * @example
 * // Custom className
 * <ArgumentAnalysisSkeleton className="mt-4" />
 */
export function ArgumentAnalysisSkeleton({
  showProgress = false,
  completedSteps = 0,
  totalSteps = ANALYSIS_STEPS.length,
  className = '',
  'data-testid': testId = 'argument-analysis-skeleton',
}: ArgumentAnalysisSkeletonProps) {
  // Calculate progress percentage
  const progressPercentage =
    totalSteps > 0 ? Math.min((completedSteps / totalSteps) * 100, 100) : 0;

  // Estimate remaining time (rough estimate: 1 second per step)
  const remainingSteps = Math.max(totalSteps - completedSteps, 0);
  const estimatedTimeRemaining = remainingSteps > 0 ? `~${remainingSteps}s remaining` : 'Complete';

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
      {...A11Y_PROPS}
      aria-label="Loading argument analysis"
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Argument Analysis</h3>
        {showProgress && (
          <span
            className="text-xs text-gray-500 dark:text-gray-400"
            data-testid={`${testId}-time-estimate`}
          >
            {estimatedTimeRemaining}
          </span>
        )}
      </div>

      {/* Progress indicator section */}
      {showProgress && (
        <div className="mb-6" data-testid={`${testId}-progress`}>
          {/* Progress bar */}
          <div className="mb-3">
            <div
              className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Analysis progress: ${Math.round(progressPercentage)}%`}
              data-testid={`${testId}-progress-bar`}
            >
              <div
                className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Step indicators */}
          <div className="space-y-2" data-testid={`${testId}-steps`}>
            {ANALYSIS_STEPS.slice(0, totalSteps).map((step, index) => (
              <ProgressStepIndicator
                key={step}
                step={step}
                index={index}
                isCompleted={index < completedSteps}
                isActive={index === completedSteps && index < totalSteps}
                testId={testId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Analysis results shimmer area */}
      <div
        className={`space-y-4 ${showProgress ? 'opacity-50' : ''}`}
        data-testid={`${testId}-results`}
      >
        {/* Fallacies section */}
        <ListSectionSkeleton
          title="Fallacies Detected"
          itemCount={2}
          testId={`${testId}-fallacies`}
        />

        {/* Unsupported claims section */}
        <ListSectionSkeleton title="Unsupported Claims" itemCount={2} testId={`${testId}-claims`} />

        {/* Scores section */}
        <div
          className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800"
          data-testid={`${testId}-scores`}
        >
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Scores</h4>
          <div className="space-y-2">
            <ScoreItemSkeleton label="Tone" testId={`${testId}-score-tone`} />
            <ScoreItemSkeleton label="Evidence" testId={`${testId}-score-evidence`} />
            <ScoreItemSkeleton label="Coherence" testId={`${testId}-score-coherence`} />
          </div>
        </div>

        {/* Suggestions section */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <ListSectionSkeleton title="Suggestions" itemCount={3} testId={`${testId}-suggestions`} />
        </div>
      </div>
    </div>
  );
}

export default ArgumentAnalysisSkeleton;
