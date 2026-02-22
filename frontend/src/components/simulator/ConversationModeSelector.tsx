/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import type { ConversationMode, DifficultyLevel } from '../../types/simulator';

/**
 * Props for the ConversationModeSelector component
 */
export interface ConversationModeSelectorProps {
  /** Selected conversation mode */
  selectedMode: ConversationMode;
  /** Selected difficulty level */
  selectedDifficulty: DifficultyLevel;
  /** Callback when mode changes */
  onModeChange: (mode: ConversationMode) => void;
  /** Callback when difficulty changes */
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  /** Custom className */
  className?: string;
}

/**
 * Configuration for conversation modes
 */
interface ModeConfig {
  id: ConversationMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}

/**
 * Configuration for difficulty levels
 */
interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  description: string;
  color: {
    bg: string;
    text: string;
    border: string;
    selectedBg: string;
    selectedText: string;
    selectedBorder: string;
  };
}

/**
 * Conversation mode configurations with descriptions matching design doc
 */
export const MODE_CONFIGS: ModeConfig[] = [
  {
    id: 'socratic',
    label: 'Socratic',
    description: 'Ask clarifying questions, challenge assumptions, never state own position',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'debate',
    label: 'Debate',
    description: 'Present counter-arguments with evidence, defend persona position, rebut claims',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    id: 'steelman',
    label: 'Steelman',
    description: 'Present strongest version of opposing view, force engagement with best arguments',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    id: 'common_ground',
    label: 'Common Ground',
    description: 'Seek points of agreement, reframe disagreements as shared goals',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
];

/**
 * Difficulty level configurations with descriptions matching design doc
 */
export const DIFFICULTY_CONFIGS: DifficultyConfig[] = [
  {
    id: 'novice',
    label: 'Novice',
    description: 'Simple arguments, obvious fallacies, patient explanations',
    color: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      selectedBg: 'bg-green-100 dark:bg-green-900/40',
      selectedText: 'text-green-800 dark:text-green-200',
      selectedBorder: 'border-green-500 dark:border-green-400',
    },
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Nuanced arguments, moderate complexity, balanced challenge',
    color: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      selectedBg: 'bg-amber-100 dark:bg-amber-900/40',
      selectedText: 'text-amber-800 dark:text-amber-200',
      selectedBorder: 'border-amber-500 dark:border-amber-400',
    },
  },
  {
    id: 'expert',
    label: 'Expert',
    description: 'Sophisticated rhetoric, subtle fallacies, demanding evidence standards',
    color: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      selectedBg: 'bg-red-100 dark:bg-red-900/40',
      selectedText: 'text-red-800 dark:text-red-200',
      selectedBorder: 'border-red-500 dark:border-red-400',
    },
  },
];

/**
 * ConversationModeSelector - Selects conversation mode and difficulty level
 *
 * @remarks
 * Provides two selection groups:
 * 1. **Conversation Mode** - How the AI persona will interact:
 *    - Socratic: Question-based, challenges assumptions
 *    - Debate: Counter-arguments with evidence
 *    - Steelman: Present strongest opposing arguments
 *    - Common Ground: Seek agreement and shared goals
 *
 * 2. **Difficulty Level** - How challenging the AI will be:
 *    - Novice: Simple, patient, obvious fallacies
 *    - Intermediate: Nuanced, balanced complexity
 *    - Expert: Sophisticated, demanding evidence
 *
 * **Accessibility Features:**
 * - Radio group pattern with proper ARIA attributes
 * - Keyboard navigation (Tab between groups, Arrow keys within)
 * - Visual focus indicators
 * - Screen reader announcements for selection state
 *
 * @example
 * ```tsx
 * const [mode, setMode] = useState<ConversationMode>('debate');
 * const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
 *
 * <ConversationModeSelector
 *   selectedMode={mode}
 *   selectedDifficulty={difficulty}
 *   onModeChange={setMode}
 *   onDifficultyChange={setDifficulty}
 * />
 * ```
 */
export const ConversationModeSelector: React.FC<ConversationModeSelectorProps> = ({
  selectedMode,
  selectedDifficulty,
  onModeChange,
  onDifficultyChange,
  className = '',
}) => {
  const modeGroupId = useId();
  const difficultyGroupId = useId();

  /**
   * Handle keyboard navigation within radio groups
   */
  const handleModeKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % MODE_CONFIGS.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + MODE_CONFIGS.length) % MODE_CONFIGS.length;
    }

    if (newIndex !== currentIndex) {
      const newMode = MODE_CONFIGS[newIndex];
      if (newMode) {
        onModeChange(newMode.id);
        // Focus the new element
        const newElement = document.getElementById(`${modeGroupId}-${newMode.id}`);
        newElement?.focus();
      }
    }
  };

  const handleDifficultyKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % DIFFICULTY_CONFIGS.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + DIFFICULTY_CONFIGS.length) % DIFFICULTY_CONFIGS.length;
    }

    if (newIndex !== currentIndex) {
      const newDifficulty = DIFFICULTY_CONFIGS[newIndex];
      if (newDifficulty) {
        onDifficultyChange(newDifficulty.id);
        // Focus the new element
        const newElement = document.getElementById(`${difficultyGroupId}-${newDifficulty.id}`);
        newElement?.focus();
      }
    }
  };

  const selectedModeConfig = MODE_CONFIGS.find((m) => m.id === selectedMode);
  const selectedDifficultyConfig = DIFFICULTY_CONFIGS.find((d) => d.id === selectedDifficulty);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Conversation Mode Selection */}
      <div>
        <h3
          id={`${modeGroupId}-label`}
          className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3"
        >
          Conversation Mode
        </h3>
        <div
          role="radiogroup"
          aria-labelledby={`${modeGroupId}-label`}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {MODE_CONFIGS.map((mode, index) => {
            const isSelected = selectedMode === mode.id;
            return (
              <div
                key={mode.id}
                id={`${modeGroupId}-${mode.id}`}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onModeChange(mode.id)}
                onKeyDown={(e) => handleModeKeyDown(e, index)}
                className={`
                  relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  dark:focus:ring-offset-gray-900
                  ${
                    isSelected
                      ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`
                      flex-shrink-0 p-2 rounded-lg transition-colors duration-200
                      ${
                        isSelected
                          ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }
                    `}
                  >
                    {mode.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`
                          text-sm font-medium
                          ${isSelected ? 'text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'}
                        `}
                      >
                        {mode.label}
                      </span>
                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-primary-500 dark:text-primary-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <p
                      className={`
                        mt-1 text-xs
                        ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}
                      `}
                    >
                      {mode.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Difficulty Level Selection */}
      <div>
        <h3
          id={`${difficultyGroupId}-label`}
          className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3"
        >
          Difficulty Level
        </h3>
        <div
          role="radiogroup"
          aria-labelledby={`${difficultyGroupId}-label`}
          className="flex flex-col sm:flex-row gap-3"
        >
          {DIFFICULTY_CONFIGS.map((difficulty, index) => {
            const isSelected = selectedDifficulty === difficulty.id;
            const colors = difficulty.color;
            return (
              <div
                key={difficulty.id}
                id={`${difficultyGroupId}-${difficulty.id}`}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onDifficultyChange(difficulty.id)}
                onKeyDown={(e) => handleDifficultyKeyDown(e, index)}
                className={`
                  flex-1 cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                  ${
                    isSelected
                      ? `${colors.selectedBorder} ${colors.selectedBg} focus:ring-current`
                      : `${colors.border} ${colors.bg} hover:border-opacity-75 focus:ring-gray-400`
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`
                      text-sm font-medium
                      ${isSelected ? colors.selectedText : colors.text}
                    `}
                  >
                    {difficulty.label}
                  </span>
                  {isSelected && (
                    <svg
                      className={`w-5 h-5 ${colors.selectedText}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p
                  className={`
                    mt-2 text-xs
                    ${isSelected ? colors.selectedText : colors.text}
                    opacity-80
                  `}
                >
                  {difficulty.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedModeConfig && selectedDifficultyConfig && (
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Current Selection
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              <span className="text-primary-500 dark:text-primary-400">
                {selectedModeConfig.icon}
              </span>
              {selectedModeConfig.label}
            </span>
            <span className="text-gray-400 dark:text-gray-500">+</span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${selectedDifficultyConfig.color.selectedBg} ${selectedDifficultyConfig.color.selectedText}`}
            >
              {selectedDifficultyConfig.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationModeSelector;
