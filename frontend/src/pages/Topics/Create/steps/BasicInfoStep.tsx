/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Basic Information Step - Step 1 of Topic Creation Wizard
 * Feature 016: Topic Management (T223)
 *
 * Collects the core topic information:
 * - Title (10-200 characters)
 * - Description (50-5000 characters)
 */

import type { TopicWizardData } from '../types';
import { VALIDATION } from '../types';

export interface BasicInfoStepProps {
  data: TopicWizardData;
  onChange: (updates: Partial<TopicWizardData>) => void;
}

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  const { title, description } = data;
  const { title: titleValidation, description: descValidation } = VALIDATION;

  const titleError =
    title.length > 0 && (title.length < titleValidation.min || title.length > titleValidation.max);
  const descriptionError =
    description.length > 0 &&
    (description.length < descValidation.min || description.length > descValidation.max);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          What would you like to discuss?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Start by giving your topic a clear, engaging title and description that will help others
          understand what you want to explore.
        </p>
      </div>

      {/* Title Input */}
      <div>
        <label
          htmlFor="wizard-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="wizard-title"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors bg-white dark:bg-gray-800 ${
            titleError
              ? 'border-red-300 dark:border-red-600'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="E.g., Should we implement carbon taxes to combat climate change?"
          maxLength={titleValidation.max}
          autoFocus
        />
        <div className="flex justify-between mt-1.5">
          <p
            className={`text-xs ${
              titleError ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {titleError
              ? title.length < titleValidation.min
                ? `${titleValidation.min - title.length} more characters needed`
                : 'Title too long'
              : `${titleValidation.min}-${titleValidation.max} characters`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {title.length}/{titleValidation.max}
          </p>
        </div>
      </div>

      {/* Description Input */}
      <div>
        <label
          htmlFor="wizard-description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="wizard-description"
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors resize-none bg-white dark:bg-gray-800 ${
            descriptionError
              ? 'border-red-300 dark:border-red-600'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder="Provide context, background, and specific questions you'd like to explore. What perspectives are you hoping to hear? What makes this topic worth discussing?"
          rows={8}
          maxLength={descValidation.max}
        />
        <div className="flex justify-between mt-1.5">
          <p
            className={`text-xs ${
              descriptionError
                ? 'text-red-700 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {descriptionError
              ? description.length < descValidation.min
                ? `${descValidation.min - description.length} more characters needed`
                : 'Description too long'
              : `${descValidation.min}-${descValidation.max} characters`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description.length}/{descValidation.max}
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          Tips for a great topic
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Frame your title as a question to invite discussion</li>
          <li>Provide enough context for newcomers to understand the debate</li>
          <li>Mention specific aspects you&apos;d like to explore</li>
        </ul>
      </div>
    </div>
  );
}

export default BasicInfoStep;
