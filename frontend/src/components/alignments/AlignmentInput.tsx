/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

export type AlignmentStance = 'support' | 'oppose' | 'nuanced';

export interface AlignmentInputProps {
  /**
   * The current alignment stance
   */
  currentStance?: AlignmentStance | null;

  /**
   * Current nuance explanation (if stance is 'nuanced')
   */
  currentExplanation?: string;

  /**
   * Callback when alignment is submitted
   */
  onAlign?: (stance: AlignmentStance, explanation?: string) => void;

  /**
   * Callback when alignment is removed
   */
  onRemove?: () => void;

  /**
   * Whether alignment is disabled (e.g., not authenticated)
   */
  disabled?: boolean;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Layout orientation
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * Whether to show labels on buttons
   */
  showLabels?: boolean;
}

const AlignmentInput: React.FC<AlignmentInputProps> = ({
  currentStance = null,
  currentExplanation = '',
  onAlign,
  onRemove,
  disabled = false,
  size = 'md',
  orientation = 'horizontal',
  showLabels = true,
}) => {
  const [selectedStance, setSelectedStance] = useState<AlignmentStance | null>(currentStance);
  const [nuanceExplanation, setNuanceExplanation] = useState(currentExplanation);
  const [showNuanceInput, setShowNuanceInput] = useState(currentStance === 'nuanced');

  // Size classes
  const sizeClasses = {
    sm: {
      button: 'px-3 py-1.5 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs',
      gap: orientation === 'horizontal' ? 'gap-2' : 'gap-1',
      textarea: 'text-xs p-2',
    },
    md: {
      button: 'px-4 py-2 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm',
      gap: orientation === 'horizontal' ? 'gap-3' : 'gap-2',
      textarea: 'text-sm p-3',
    },
    lg: {
      button: 'px-6 py-3 text-base',
      icon: 'w-5 h-5',
      text: 'text-base',
      gap: orientation === 'horizontal' ? 'gap-4' : 'gap-3',
      textarea: 'text-base p-4',
    },
  };

  const currentSize = sizeClasses[size];

  const handleStanceClick = (stance: AlignmentStance) => {
    if (disabled) return;

    const newStance = selectedStance === stance ? null : stance;
    setSelectedStance(newStance);

    if (stance === 'nuanced' && newStance === 'nuanced') {
      setShowNuanceInput(true);
    } else {
      setShowNuanceInput(false);
      setNuanceExplanation('');

      if (newStance === null) {
        // User is deselecting their stance
        if (onRemove) {
          onRemove();
        }
      } else {
        // User selected support or oppose
        if (onAlign) {
          onAlign(newStance);
        }
      }
    }
  };

  const handleNuanceSubmit = () => {
    if (!nuanceExplanation.trim()) {
      return;
    }

    if (onAlign) {
      onAlign('nuanced', nuanceExplanation);
    }
    setShowNuanceInput(false);
  };

  const handleNuanceCancel = () => {
    setSelectedStance(null);
    setShowNuanceInput(false);
    setNuanceExplanation('');
  };

  // Button base classes
  const buttonBaseClasses = `
    ${currentSize.button}
    inline-flex items-center justify-center
    rounded-lg border-2
    font-medium
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-40 disabled:cursor-not-allowed
  `;

  // Get button classes based on stance
  const getButtonClasses = (stance: AlignmentStance) => {
    const isSelected = selectedStance === stance;

    const stanceStyles = {
      support: isSelected
        ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200 focus:ring-green-500'
        : 'border-gray-300 text-gray-700 hover:border-green-400 hover:bg-green-50 focus:ring-green-500',
      oppose: isSelected
        ? 'bg-red-100 border-red-500 text-red-700 hover:bg-red-200 focus:ring-red-500'
        : 'border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 focus:ring-red-500',
      nuanced: isSelected
        ? 'bg-blue-100 border-blue-500 text-blue-700 hover:bg-blue-200 focus:ring-blue-500'
        : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 focus:ring-blue-500',
    };

    return `${buttonBaseClasses} ${stanceStyles[stance]}`;
  };

  // Container classes
  const containerClasses = `
    flex items-start
    ${currentSize.gap}
    ${orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}
  `;

  return (
    <div className="w-full">
      <div className={containerClasses}>
        {/* Support Button */}
        <button
          onClick={() => handleStanceClick('support')}
          disabled={disabled}
          className={getButtonClasses('support')}
          aria-label="Agree/Support"
          title="Agree with this proposition"
        >
          <svg
            className={`${currentSize.icon} ${showLabels ? 'mr-1.5' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          {showLabels && <span>Agree</span>}
        </button>

        {/* Oppose Button */}
        <button
          onClick={() => handleStanceClick('oppose')}
          disabled={disabled}
          className={getButtonClasses('oppose')}
          aria-label="Disagree/Oppose"
          title="Disagree with this proposition"
        >
          <svg
            className={`${currentSize.icon} ${showLabels ? 'mr-1.5' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
            />
          </svg>
          {showLabels && <span>Disagree</span>}
        </button>

        {/* Nuanced Button */}
        <button
          onClick={() => handleStanceClick('nuanced')}
          disabled={disabled}
          className={getButtonClasses('nuanced')}
          aria-label="Nuanced position"
          title="I have a nuanced position"
        >
          <svg
            className={`${currentSize.icon} ${showLabels ? 'mr-1.5' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          {showLabels && <span>Nuanced</span>}
        </button>
      </div>

      {/* Nuance Explanation Input */}
      {showNuanceInput && (
        <div className="mt-4 space-y-3">
          <label
            htmlFor="nuance-explanation"
            className={`block font-medium text-gray-700 ${currentSize.text}`}
          >
            Explain your nuanced position:
          </label>
          <textarea
            id="nuance-explanation"
            value={nuanceExplanation}
            onChange={(e) => setNuanceExplanation(e.target.value)}
            disabled={disabled}
            placeholder="Describe the aspects you agree with, disagree with, and why..."
            rows={4}
            className={`
              w-full
              ${currentSize.textarea}
              border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-y
            `}
          />
          <div className="flex gap-2">
            <button
              onClick={handleNuanceSubmit}
              disabled={disabled || !nuanceExplanation.trim()}
              className={`
                ${currentSize.button}
                px-4 py-2
                bg-blue-600 text-white rounded-lg
                hover:bg-blue-700
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                transition-colors
              `}
            >
              Submit Alignment
            </button>
            <button
              onClick={handleNuanceCancel}
              disabled={disabled}
              className={`
                ${currentSize.button}
                px-4 py-2
                bg-gray-200 text-gray-700 rounded-lg
                hover:bg-gray-300
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                transition-colors
              `}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlignmentInput;
