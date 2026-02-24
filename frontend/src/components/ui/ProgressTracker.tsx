/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProgressTrackerProps {
  /**
   * List of step names
   */
  steps: string[];

  /**
   * Current step index (0-based)
   */
  currentStep: number;

  /**
   * Optional: Show step list (default: false)
   */
  showStepList?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ProgressTracker - Multi-step progress indicator component
 *
 * Features:
 * - Shows current step name and progress count
 * - Visual progress bar based on completion
 * - Optional step list with status indicators (checkmark/current/pending)
 * - Multiple size variants (sm, md, lg)
 * - Dark mode support
 * - Accessibility with ARIA attributes (progressbar role)
 *
 * @example
 * // Basic progress tracker
 * <ProgressTracker
 *   steps={['Initialize', 'Process', 'Complete']}
 *   currentStep={1}
 * />
 *
 * @example
 * // With step list visible
 * <ProgressTracker
 *   steps={['Analyzing', 'Scoring', 'Generating feedback']}
 *   currentStep={2}
 *   showStepList
 *   size="lg"
 * />
 */
function ProgressTracker({
  steps,
  currentStep,
  showStepList = false,
  className = '',
  size = 'md',
}: ProgressTrackerProps) {
  // Ensure currentStep is within bounds
  const clampedStep = Math.max(0, Math.min(currentStep, steps.length - 1));
  const totalSteps = steps.length;
  const currentStepName = steps[clampedStep] || 'Processing...';

  // Calculate progress percentage (0% at step 0, 100% at last step)
  const progressPercentage =
    totalSteps > 1 ? (clampedStep / (totalSteps - 1)) * 100 : currentStep > 0 ? 100 : 0;

  // Size mappings
  const sizeClasses = {
    sm: {
      container: 'text-sm',
      progressBar: 'h-1',
      stepIcon: 'w-4 h-4 text-xs',
      stepText: 'text-xs',
    },
    md: {
      container: 'text-base',
      progressBar: 'h-2',
      stepIcon: 'w-5 h-5 text-sm',
      stepText: 'text-sm',
    },
    lg: {
      container: 'text-lg',
      progressBar: 'h-3',
      stepIcon: 'w-6 h-6 text-base',
      stepText: 'text-base',
    },
  };

  const sizeStyles = sizeClasses[size];

  return (
    <div className={`${sizeStyles.container} ${className}`}>
      {/* Header: Current step name and progress count */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">
          {currentStepName}
        </span>
        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
          Step {clampedStep + 1} of {totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className={`
          w-full ${sizeStyles.progressBar} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden
        `}
        role="progressbar"
        aria-valuenow={clampedStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`${currentStepName} - Step ${clampedStep + 1} of ${totalSteps}`}
      >
        <div
          className={`
            h-full bg-primary-600 dark:bg-primary-500 rounded-full
            transition-all duration-300 ease-out
          `}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Optional step list */}
      {showStepList && (
        <div className="mt-4 space-y-2">
          {steps.map((step, index) => {
            const isCompleted = index < clampedStep;
            const isCurrent = index === clampedStep;
            const isPending = index > clampedStep;

            return (
              <div
                key={index}
                className={`
                  flex items-center gap-3
                  ${isCurrent ? 'font-medium' : ''}
                `}
              >
                {/* Status indicator */}
                <div
                  className={`
                    flex items-center justify-center rounded-full flex-shrink-0
                    ${sizeStyles.stepIcon}
                    ${
                      isCompleted
                        ? 'bg-green-600 dark:bg-green-500 text-white'
                        : isCurrent
                          ? 'bg-primary-600 dark:bg-primary-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Step name */}
                <span
                  className={`
                    ${sizeStyles.stepText}
                    ${
                      isCompleted
                        ? 'text-green-700 dark:text-green-400'
                        : isCurrent
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {step}
                  {isCurrent && <span className="sr-only"> (current step)</span>}
                  {isCompleted && <span className="sr-only"> (completed)</span>}
                  {isPending && <span className="sr-only"> (pending)</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

ProgressTracker.displayName = 'ProgressTracker';

export default ProgressTracker;
