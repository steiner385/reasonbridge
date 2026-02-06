/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { FeedbackSensitivity } from '../../lib/feedback-api';

export interface SensitivitySelectorProps {
  /** Current sensitivity level */
  value: FeedbackSensitivity;
  /** Callback when sensitivity changes */
  onChange: (value: FeedbackSensitivity) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional className for custom styling */
  className?: string;
}

const SENSITIVITY_OPTIONS: {
  value: FeedbackSensitivity;
  label: string;
  description: string;
}[] = [
  {
    value: 'LOW',
    label: 'Low',
    description: 'Show more suggestions (0.5+ confidence)',
  },
  {
    value: 'MEDIUM',
    label: 'Medium',
    description: 'Balanced suggestions (0.7+ confidence)',
  },
  {
    value: 'HIGH',
    label: 'High',
    description: 'Show fewer, high-confidence only (0.85+)',
  },
];

/**
 * SensitivitySelector - Dropdown for adjusting feedback sensitivity level
 *
 * Allows users to control how much feedback they see:
 * - LOW: More sensitive, shows all suggestions (0.5+ confidence)
 * - MEDIUM: Balanced (0.7+ confidence) - default
 * - HIGH: Less sensitive, only high-confidence issues (0.85+)
 *
 * The selection is persisted to localStorage via usePreviewFeedback.
 */
export const SensitivitySelector: React.FC<SensitivitySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="sensitivity-selector" className="text-xs text-gray-500 whitespace-nowrap">
        Sensitivity:
      </label>
      <select
        id="sensitivity-selector"
        value={value}
        onChange={(e) => onChange(e.target.value as FeedbackSensitivity)}
        disabled={disabled}
        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        aria-label="Feedback sensitivity level"
        aria-describedby="sensitivity-description"
      >
        {SENSITIVITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span id="sensitivity-description" className="sr-only">
        {SENSITIVITY_OPTIONS.find((o) => o.value === value)?.description}
      </span>
    </div>
  );
};

export default SensitivitySelector;
