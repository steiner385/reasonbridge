/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import type { AlignmentStance } from './AlignmentInput';

export interface AlignmentReasoningModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;

  /**
   * The selected alignment stance
   */
  stance: AlignmentStance;

  /**
   * Current reasoning/explanation (for editing)
   */
  currentReasoning?: string;

  /**
   * Callback when alignment with reasoning is submitted
   */
  onSubmit: (stance: AlignmentStance, reasoning: string) => void;

  /**
   * Whether the form is in a submitting state
   */
  isSubmitting?: boolean;

  /**
   * Proposition title or text for context
   */
  propositionText?: string;

  /**
   * Whether reasoning is required
   */
  reasoningRequired?: boolean;

  /**
   * Minimum character count for reasoning
   */
  minReasoningLength?: number;
}

const AlignmentReasoningModal: React.FC<AlignmentReasoningModalProps> = ({
  isOpen,
  onClose,
  stance,
  currentReasoning = '',
  onSubmit,
  isSubmitting = false,
  propositionText,
  reasoningRequired = false,
  minReasoningLength = 10,
}) => {
  const [reasoning, setReasoning] = useState(currentReasoning);
  const [error, setError] = useState<string | null>(null);

  // Update reasoning when currentReasoning changes
  useEffect(() => {
    setReasoning(currentReasoning);
  }, [currentReasoning]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Get stance-specific UI elements
  const getStanceInfo = (stanceType: AlignmentStance) => {
    switch (stanceType) {
      case 'support':
        return {
          title: 'Share Your Support',
          color: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          placeholder: 'Explain why you support this proposition...',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
              />
            </svg>
          ),
        };
      case 'oppose':
        return {
          title: 'Share Your Opposition',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          placeholder: 'Explain why you oppose this proposition...',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
              />
            </svg>
          ),
        };
      case 'nuanced':
        return {
          title: 'Share Your Nuanced Position',
          color: 'text-blue-700',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          placeholder: 'Describe the aspects you agree with, disagree with, and why...',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          ),
        };
    }
  };

  const stanceInfo = getStanceInfo(stance);

  const handleSubmit = () => {
    setError(null);

    // Validate reasoning
    const trimmedReasoning = reasoning.trim();

    if (reasoningRequired && !trimmedReasoning) {
      setError('Please provide your reasoning before submitting.');
      return;
    }

    if (trimmedReasoning && trimmedReasoning.length < minReasoningLength) {
      setError(`Please provide at least ${minReasoningLength} characters of reasoning.`);
      return;
    }

    onSubmit(stance, trimmedReasoning);
  };

  const handleCancel = () => {
    setReasoning(currentReasoning);
    setError(null);
    onClose();
  };

  const characterCount = reasoning.length;
  const isValid = !reasoningRequired || reasoning.trim().length >= minReasoningLength;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={stanceInfo.title}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Alignment'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Stance indicator */}
        <div
          className={`flex items-center gap-3 p-4 rounded-lg ${stanceInfo.bgColor} ${stanceInfo.borderColor} border-2`}
        >
          <div className={stanceInfo.color}>{stanceInfo.icon}</div>
          <div className="flex-1">
            <p className={`font-semibold ${stanceInfo.color}`}>
              {stance === 'support'
                ? 'Supporting'
                : stance === 'oppose'
                  ? 'Opposing'
                  : 'Nuanced Position'}
            </p>
            {propositionText && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{propositionText}</p>
            )}
          </div>
        </div>

        {/* Reasoning input */}
        <div>
          <label htmlFor="reasoning" className="block text-sm font-medium text-gray-700 mb-2">
            Your Reasoning {reasoningRequired && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id="reasoning"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder={stanceInfo.placeholder}
            disabled={isSubmitting}
            rows={6}
            className={`
              w-full px-3 py-2 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
              resize-y
              ${error ? 'border-red-300' : 'border-gray-300'}
            `}
          />
          <div className="flex items-center justify-between mt-2">
            <div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {!error && reasoningRequired && (
                <p className="text-sm text-gray-500">
                  Minimum {minReasoningLength} characters required
                </p>
              )}
            </div>
            <p
              className={`text-sm ${characterCount >= minReasoningLength ? 'text-gray-500' : 'text-gray-400'}`}
            >
              {characterCount} characters
            </p>
          </div>
        </div>

        {/* Helpful tips */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Tips for effective reasoning:
          </h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Be specific about which aspects you agree or disagree with</li>
            <li>Provide evidence or examples when possible</li>
            <li>Acknowledge valid points from other perspectives</li>
            <li>Focus on ideas rather than attacking people</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default AlignmentReasoningModal;
