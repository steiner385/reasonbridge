/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Preview Step - Step 3 of Topic Creation Wizard
 * Feature 016: Topic Management (T223)
 *
 * Shows a preview of the topic before creation and handles:
 * - Duplicate detection warnings
 * - Final review of all entered data
 * - Submit action
 */

import type { DuplicateSuggestion } from '../../../../services/topicService';
import type { TopicWizardData } from '../types';

export interface PreviewStepProps {
  data: TopicWizardData;
  duplicates: DuplicateSuggestion[];
  showDuplicateWarning: boolean;
}

const VISIBILITY_LABELS = {
  PUBLIC: 'Public',
  PRIVATE: 'Private',
  UNLISTED: 'Unlisted',
};

const EVIDENCE_LABELS = {
  MINIMAL: 'Minimal',
  STANDARD: 'Standard',
  RIGOROUS: 'Rigorous',
};

export function PreviewStep({ data, duplicates, showDuplicateWarning }: PreviewStepProps) {
  const { title, description, tags, visibility, evidenceStandards, isMatureContent } = data;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Review your topic
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Make sure everything looks good before creating your discussion topic.
        </p>
      </div>

      {/* Duplicate Warning */}
      {showDuplicateWarning && duplicates.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Similar Topics Found
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                We found {duplicates.length} similar topic{duplicates.length > 1 ? 's' : ''}.
                Consider joining an existing discussion instead:
              </p>
              <div className="space-y-2">
                {duplicates.slice(0, 3).map((duplicate) => (
                  <div
                    key={duplicate.id}
                    className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-100 dark:border-yellow-900"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {duplicate.title}
                      </h5>
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        {Math.round(duplicate.similarityScore * 100)}% match
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {duplicate.description}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3">
                If your topic is truly unique, click "Create Anyway" to proceed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Topic Preview Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-5">
          {/* Title */}
          <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {title || <span className="text-gray-400 italic">No title</span>}
          </h4>

          {/* Description */}
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
            {description || <span className="text-gray-400 italic">No description</span>}
          </p>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
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
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span>{VISIBILITY_LABELS[visibility]}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{EVIDENCE_LABELS[evidenceStandards]} evidence</span>
            </div>

            {isMatureContent && (
              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Mature content</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Message */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
              Ready to create
            </h4>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Your topic will be visible immediately after creation. You can edit it later if
              needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewStep;
