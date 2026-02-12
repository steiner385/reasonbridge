/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Classification Step - Step 2 of Topic Creation Wizard
 * Feature 016: Topic Management (T223)
 *
 * Collects topic classification settings:
 * - Tags (1-5 tags for categorization)
 * - Visibility (PUBLIC, PRIVATE, UNLISTED)
 * - Evidence Standards (MINIMAL, STANDARD, RIGOROUS)
 * - Mature Content flag
 */

import { useState } from 'react';
import Button from '../../../../components/ui/Button';
import type { TopicWizardData, TopicVisibility, EvidenceStandard } from '../types';
import { VALIDATION } from '../types';

export interface ClassificationStepProps {
  data: TopicWizardData;
  onChange: (updates: Partial<TopicWizardData>) => void;
}

const VISIBILITY_OPTIONS: { value: TopicVisibility; label: string; description: string }[] = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Anyone can view and participate',
  },
  {
    value: 'UNLISTED',
    label: 'Unlisted',
    description: 'Only those with link can view',
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Invitation only',
  },
];

const EVIDENCE_OPTIONS: { value: EvidenceStandard; label: string; description: string }[] = [
  {
    value: 'MINIMAL',
    label: 'Minimal',
    description: 'Informal discussion, sources optional',
  },
  {
    value: 'STANDARD',
    label: 'Standard',
    description: 'Claims should be sourced when possible',
  },
  {
    value: 'RIGOROUS',
    label: 'Rigorous',
    description: 'Academic-level citations required',
  },
];

export function ClassificationStep({ data, onChange }: ClassificationStepProps) {
  const [tagInput, setTagInput] = useState('');
  const { tags, visibility, evidenceStandards, isMatureContent } = data;
  const { tags: tagValidation } = VALIDATION;

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (
      trimmedTag &&
      trimmedTag.length >= tagValidation.tagMinLength &&
      trimmedTag.length <= tagValidation.tagMaxLength &&
      tags.length < tagValidation.max &&
      !tags.includes(trimmedTag)
    ) {
      onChange({ tags: [...tags, trimmedTag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({ tags: tags.filter((tag) => tag !== tagToRemove) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Classify your topic
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Help others find your topic and set the discussion standards.
        </p>
      </div>

      {/* Tags */}
      <div>
        <label
          htmlFor="wizard-tags"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Tags <span className="text-red-500">*</span>
          <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
            ({tags.length}/{tagValidation.max})
          </span>
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            id="wizard-tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800"
            placeholder="e.g., climate, policy, economics"
            disabled={tags.length >= tagValidation.max}
            maxLength={tagValidation.tagMaxLength}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddTag}
            disabled={!tagInput.trim() || tags.length >= tagValidation.max}
          >
            Add
          </Button>
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-primary-900 dark:hover:text-primary-100 focus:outline-none"
                  aria-label={`Remove tag ${tag}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-red-600 dark:text-red-400">At least 1 tag is required</p>
        )}
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Visibility
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {VISIBILITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ visibility: option.value })}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                visibility === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span
                className={`block text-sm font-medium ${
                  visibility === option.value
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {option.label}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Standards */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Evidence Standards
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EVIDENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ evidenceStandards: option.value })}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                evidenceStandards === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span
                className={`block text-sm font-medium ${
                  evidenceStandards === option.value
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {option.label}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mature Content Flag */}
      <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <input
          type="checkbox"
          id="wizard-mature-content"
          checked={isMatureContent}
          onChange={(e) => onChange({ isMatureContent: e.target.checked })}
          className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500"
        />
        <div>
          <label
            htmlFor="wizard-mature-content"
            className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
          >
            This topic contains mature content
          </label>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Content involving violence, sensitive topics, or themes that may not be appropriate for
            younger users. Mature content will be hidden from minors without verified parental
            consent.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ClassificationStep;
