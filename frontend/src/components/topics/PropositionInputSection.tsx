/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T226 [US6] - Proposition Input Section
 *
 * Allows topic creators to define initial propositions for discussion.
 * Supports thesis/antithesis/synthesis types following dialectical reasoning.
 */

import React, { useState, useCallback } from 'react';
import { usePropositionValidation } from './usePropositionValidation';

/** Proposition type following Hegelian dialectic */
export type PropositionType = 'thesis' | 'antithesis' | 'synthesis';

/** A single proposition for topic creation */
export interface TopicProposition {
  id: string;
  text: string;
  type: PropositionType;
}

export interface PropositionInputValidation {
  isValid: boolean;
  error: string | null;
  propositionCount: number;
  hasThesis: boolean;
}

export interface PropositionInputSectionProps {
  /** Current list of propositions */
  propositions: TopicProposition[];
  /** Handler for proposition changes */
  onChange: (propositions: TopicProposition[]) => void;
  /** Handler called when validation state changes */
  onValidationChange?: (validation: PropositionInputValidation) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Minimum number of propositions required (default: 1) */
  minPropositions?: number;
  /** Maximum number of propositions allowed (default: 10) */
  maxPropositions?: number;
  /** Minimum text length for each proposition (default: 10) */
  minTextLength?: number;
  /** Maximum text length for each proposition (default: 500) */
  maxTextLength?: number;
  /** Custom ID for the component */
  id?: string;
  /** Additional className for the container */
  className?: string;
}

/** Validation constants */
const DEFAULT_MIN_PROPOSITIONS = 1;
const DEFAULT_MAX_PROPOSITIONS = 10;
const DEFAULT_MIN_TEXT_LENGTH = 10;
const DEFAULT_MAX_TEXT_LENGTH = 500;

/** Type configurations */
const PROPOSITION_TYPE_CONFIG: Record<
  PropositionType,
  { label: string; description: string; color: string; bgColor: string; borderColor: string }
> = {
  thesis: {
    label: 'Thesis',
    description: 'The main argument or position',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  antithesis: {
    label: 'Antithesis',
    description: 'The opposing argument',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  synthesis: {
    label: 'Synthesis',
    description: 'A reconciled or middle-ground view',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
};

/**
 * Generate a unique ID for propositions
 */
function generatePropositionId(): string {
  return `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Proposition input section for topic creation
 */
export function PropositionInputSection({
  propositions,
  onChange,
  onValidationChange,
  disabled = false,
  minPropositions = DEFAULT_MIN_PROPOSITIONS,
  maxPropositions = DEFAULT_MAX_PROPOSITIONS,
  minTextLength = DEFAULT_MIN_TEXT_LENGTH,
  maxTextLength = DEFAULT_MAX_TEXT_LENGTH,
  id = 'propositions',
  className = '',
}: PropositionInputSectionProps) {
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<PropositionType>('thesis');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const validation = usePropositionValidation(propositions, minPropositions, minTextLength);

  // Notify parent of validation changes
  React.useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);

  const handleAdd = useCallback(() => {
    if (newText.trim().length < minTextLength) return;
    if (propositions.length >= maxPropositions) return;

    const newProposition: TopicProposition = {
      id: generatePropositionId(),
      text: newText.trim(),
      type: newType,
    };

    onChange([...propositions, newProposition]);
    setNewText('');
    // Suggest next type based on what's missing
    if (newType === 'thesis' && !propositions.some((p) => p.type === 'antithesis')) {
      setNewType('antithesis');
    } else if (newType === 'antithesis' && !propositions.some((p) => p.type === 'synthesis')) {
      setNewType('synthesis');
    }
  }, [newText, newType, propositions, onChange, maxPropositions, minTextLength]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(propositions.filter((p) => p.id !== id));
    },
    [propositions, onChange],
  );

  const handleStartEdit = useCallback((prop: TopicProposition) => {
    setEditingId(prop.id);
    setEditText(prop.text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || editText.trim().length < minTextLength) return;

    onChange(propositions.map((p) => (p.id === editingId ? { ...p, text: editText.trim() } : p)));
    setEditingId(null);
    setEditText('');
  }, [editingId, editText, propositions, onChange, minTextLength]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleTypeChange = useCallback(
    (id: string, type: PropositionType) => {
      onChange(propositions.map((p) => (p.id === id ? { ...p, type } : p)));
    },
    [propositions, onChange],
  );

  const canAdd = newText.trim().length >= minTextLength && propositions.length < maxPropositions;
  const showWarning = validation.error && validation.isValid;
  const showError = validation.error && !validation.isValid;

  return (
    <div className={`w-full ${className}`} id={id}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Propositions <span className="text-red-500">*</span>
        <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
          ({propositions.length}/{maxPropositions})
        </span>
      </label>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Define the key positions or claims to be discussed. Start with a thesis (main argument),
        then add an antithesis (counter-argument) and synthesis (reconciled view) if applicable.
      </p>

      {/* Existing propositions */}
      {propositions.length > 0 && (
        <div className="space-y-3 mb-4">
          {propositions.map((prop) => {
            const config = PROPOSITION_TYPE_CONFIG[prop.type];
            const isEditing = editingId === prop.id;

            return (
              <div
                key={prop.id}
                className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  {/* Type badge */}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor} border ${config.borderColor}`}
                  >
                    {config.label}
                  </span>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                          rows={2}
                          maxLength={maxTextLength}
                          disabled={disabled}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={disabled || editText.trim().length < minTextLength}
                            className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={disabled}
                            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-gray-100">{prop.text}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      {/* Type selector */}
                      <select
                        value={prop.type}
                        onChange={(e) =>
                          handleTypeChange(prop.id, e.target.value as PropositionType)
                        }
                        disabled={disabled}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        aria-label="Change proposition type"
                      >
                        <option value="thesis">Thesis</option>
                        <option value="antithesis">Antithesis</option>
                        <option value="synthesis">Synthesis</option>
                      </select>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(prop)}
                        disabled={disabled}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label="Edit proposition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(prop.id)}
                        disabled={disabled}
                        className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Remove proposition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new proposition */}
      {propositions.length < maxPropositions && (
        <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Enter a proposition statement..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                rows={2}
                maxLength={maxTextLength}
                disabled={disabled}
                aria-label="New proposition text"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {newText.length < minTextLength && newText.length > 0
                    ? `${minTextLength - newText.length} more characters needed`
                    : `${minTextLength}-${maxTextLength} characters`}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {newText.length}/{maxTextLength}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 sm:w-32">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as PropositionType)}
                disabled={disabled}
                className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                aria-label="Proposition type"
              >
                <option value="thesis">Thesis</option>
                <option value="antithesis">Antithesis</option>
                <option value="synthesis">Synthesis</option>
              </select>

              <button
                type="button"
                onClick={handleAdd}
                disabled={disabled || !canAdd}
                className="flex-1 sm:flex-none px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation messages */}
      {showError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {validation.error}
        </p>
      )}
      {showWarning && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{validation.error}</p>
      )}

      {/* Empty state */}
      {propositions.length === 0 && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Start by adding a thesis - the main position or claim you want to discuss.
        </p>
      )}
    </div>
  );
}

export default PropositionInputSection;
