/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Proposition Input Component
 * Feature 016: Topic Management (T226)
 *
 * A reusable component for entering initial propositions during topic creation.
 * Allows users to add up to 10 propositions with validation.
 *
 * @remarks
 * - Propositions are key claims that frame the discussion
 * - Each proposition must be 10-1000 characters
 * - Maximum 10 propositions per topic
 * - Optional field - users can skip adding propositions
 */

import { useState } from 'react';
import Button from '../ui/Button';

export interface InitialProposition {
  statement: string;
}

export interface PropositionInputProps {
  /** Current list of propositions */
  propositions: InitialProposition[];
  /** Callback when propositions change */
  onChange: (propositions: InitialProposition[]) => void;
  /** Maximum number of propositions allowed */
  maxPropositions?: number;
  /** Minimum statement length */
  minLength?: number;
  /** Maximum statement length */
  maxLength?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
}

const DEFAULT_MAX_PROPOSITIONS = 10;
const DEFAULT_MIN_LENGTH = 10;
const DEFAULT_MAX_LENGTH = 1000;

export function PropositionInput({
  propositions,
  onChange,
  maxPropositions = DEFAULT_MAX_PROPOSITIONS,
  minLength = DEFAULT_MIN_LENGTH,
  maxLength = DEFAULT_MAX_LENGTH,
  disabled = false,
}: PropositionInputProps) {
  const [inputValue, setInputValue] = useState('');

  const trimmedInput = inputValue.trim();
  const isValidLength = trimmedInput.length >= minLength && trimmedInput.length <= maxLength;
  const canAdd = isValidLength && propositions.length < maxPropositions && !disabled;
  const isAtMax = propositions.length >= maxPropositions;

  const handleAdd = () => {
    if (!canAdd) return;

    onChange([...propositions, { statement: trimmedInput }]);
    setInputValue('');
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    onChange(propositions.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const getInputError = (): string | null => {
    if (trimmedInput.length === 0) return null;
    if (trimmedInput.length < minLength) {
      return `${minLength - trimmedInput.length} more characters needed`;
    }
    if (trimmedInput.length > maxLength) {
      return 'Statement too long';
    }
    return null;
  };

  const inputError = getInputError();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Initial Propositions{' '}
          <span className="text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Add key claims or statements to frame the discussion. These help participants understand
          the main points of debate.
        </p>
      </div>

      {/* Input Area */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Carbon taxes are an effective tool for reducing emissions"
            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 ${
              inputError
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            rows={2}
            disabled={disabled || isAtMax}
            maxLength={maxLength + 100} // Allow some overflow for error display
            aria-label="Proposition statement"
            aria-describedby="proposition-hint proposition-error"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            {inputError ? (
              <p id="proposition-error" className="text-xs text-red-700 dark:text-red-400">
                {inputError}
              </p>
            ) : (
              <p id="proposition-hint" className="text-xs text-gray-500 dark:text-gray-400">
                {minLength}-{maxLength} characters
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {trimmedInput.length}/{maxLength}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAdd}
              disabled={!canAdd}
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Propositions List */}
      {propositions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {propositions.length} of {maxPropositions} propositions added
          </p>
          <ul className="space-y-2" role="list" aria-label="Added propositions">
            {propositions.map((prop, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  {index + 1}
                </span>
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {prop.statement}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Remove proposition ${index + 1}`}
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
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty State */}
      {propositions.length === 0 && (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
          <svg
            className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No propositions added yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Propositions help structure the discussion
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex gap-2">
          <svg
            className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>What are propositions?</strong> Key statements or claims that frame the
              discussion. They help organize different viewpoints and make debate more structured.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropositionInput;
