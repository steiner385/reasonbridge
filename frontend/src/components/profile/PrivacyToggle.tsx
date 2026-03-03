/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PrivacyToggle - Reusable privacy level selector component
 *
 * Provides a segmented control for selecting privacy visibility levels.
 * Supports both ProfileVisibility (3 options) and TrustVisibility (2 options).
 */

import type { ProfileVisibility, TrustVisibility } from '../../types/user';

export interface PrivacyToggleProps {
  /** Label for the toggle */
  label: string;
  /** Description of what this setting controls */
  description?: string;
  /** Current visibility value */
  value: ProfileVisibility | TrustVisibility;
  /** Callback when value changes */
  onChange: (value: ProfileVisibility | TrustVisibility) => void;
  /** Whether to disable the PRIVATE option (for trust scores) */
  disablePrivate?: boolean;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const VISIBILITY_OPTIONS: {
  value: ProfileVisibility;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'PUBLIC',
    label: 'Public',
    icon: '🌐',
    description: 'Visible to everyone',
  },
  {
    value: 'FOLLOWERS_ONLY',
    label: 'Followers',
    icon: '👥',
    description: 'Visible to followers only',
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    icon: '🔒',
    description: 'Visible only to you',
  },
];

/**
 * PrivacyToggle component
 */
export function PrivacyToggle({
  label,
  description,
  value,
  onChange,
  disablePrivate = false,
  disabled = false,
  className = '',
}: PrivacyToggleProps) {
  // Filter options if PRIVATE is disabled (for trust scores)
  const options = disablePrivate
    ? VISIBILITY_OPTIONS.filter((opt) => opt.value !== 'PRIVATE')
    : VISIBILITY_OPTIONS;

  return (
    <div className={`${className}`}>
      {/* Label and description */}
      <div className="mb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>

      {/* Segmented control */}
      <div
        className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option, index) => {
          const isSelected = value === option.value;

          // Keyboard navigation for radio group (arrow keys)
          const handleKeyDown = (e: React.KeyboardEvent) => {
            if (disabled) return;
            let newIndex = index;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              newIndex = (index + 1) % options.length;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              newIndex = (index - 1 + options.length) % options.length;
            }
            const newOption = options[newIndex];
            if (newIndex !== index && newOption) {
              onChange(newOption.value);
              // Focus the new button
              const buttons = e.currentTarget.parentElement?.querySelectorAll('button');
              const targetButton = buttons?.[newIndex];
              if (targetButton instanceof HTMLButtonElement) {
                targetButton.focus();
              }
            }
          };

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={handleKeyDown}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                flex items-center gap-1.5
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                ${
                  isSelected
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={option.description}
            >
              <span aria-hidden="true">{option.icon}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PrivacyToggle;
