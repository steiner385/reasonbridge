/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Options Popover
 *
 * Inline options panel for marking response as containing
 * opinion or factual claims.
 */

export interface OptionsPopoverProps {
  containsOpinion: boolean;
  containsFactualClaims: boolean;
  onContainsOpinionChange: (value: boolean) => void;
  onContainsFactualClaimsChange: (value: boolean) => void;
  onClose: () => void;
}

export function OptionsPopover({
  containsOpinion,
  containsFactualClaims,
  onContainsOpinionChange,
  onContainsFactualClaimsChange,
  onClose,
}: OptionsPopoverProps) {
  return (
    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Response Type</span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close options"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={containsOpinion}
          onChange={(e) => onContainsOpinionChange(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-800"
        />
        <span className="text-xs text-gray-700 dark:text-gray-300">Contains my opinion</span>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={containsFactualClaims}
          onChange={(e) => onContainsFactualClaimsChange(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-800"
        />
        <span className="text-xs text-gray-700 dark:text-gray-300">Contains factual claims</span>
      </label>

      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
        Marking these helps with fact-checking and discussion analysis.
      </p>
    </div>
  );
}
