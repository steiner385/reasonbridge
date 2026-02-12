/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Wizard Progress Indicator Component
 * Feature 016: Topic Management (T223)
 *
 * Displays a step-by-step progress indicator with visual feedback
 * for completed, current, and upcoming steps.
 */

import type { WizardStepConfig } from '../types';

export interface WizardProgressProps {
  steps: WizardStepConfig[];
  currentStepIndex: number;
}

export function WizardProgress({ steps, currentStepIndex }: WizardProgressProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <li key={step.id} className="relative flex-1">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-5 left-1/2 w-full h-0.5 ${
                    isCompleted ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  aria-hidden="true"
                />
              )}

              <div className="relative flex flex-col items-center group">
                {/* Step circle */}
                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    isCompleted
                      ? 'bg-primary-600 border-primary-600'
                      : isCurrent
                        ? 'bg-white dark:bg-gray-900 border-primary-600'
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span
                      className={`text-sm font-semibold ${
                        isCurrent ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </span>

                {/* Step label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-sm font-medium ${
                      isCurrent
                        ? 'text-primary-600'
                        : isCompleted
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default WizardProgress;
