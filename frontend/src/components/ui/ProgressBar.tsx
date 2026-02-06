/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProgressBarProps {
  /**
   * Current progress value (0-100)
   */
  value: number;

  /**
   * Maximum value (defaults to 100)
   */
  max?: number;

  /**
   * Size variant of the progress bar
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Color variant of the progress bar
   */
  variant?: 'primary' | 'success' | 'warning' | 'danger';

  /**
   * Whether to show the percentage label
   */
  showLabel?: boolean;

  /**
   * Whether to animate the progress bar
   */
  animated?: boolean;

  /**
   * Whether the progress is indeterminate (unknown duration)
   */
  indeterminate?: boolean;

  /**
   * Custom label text (overrides percentage)
   */
  label?: string;

  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * ProgressBar - Visual indicator for progress/completion
 *
 * Features:
 * - Determinate and indeterminate modes
 * - Multiple size and color variants
 * - Optional percentage label
 * - Smooth animations
 * - Dark mode support
 * - Accessibility attributes (ARIA)
 *
 * @example
 * // Basic progress bar
 * <ProgressBar value={60} />
 *
 * @example
 * // Success variant with label
 * <ProgressBar value={100} variant="success" showLabel />
 *
 * @example
 * // Indeterminate loading state
 * <ProgressBar indeterminate label="Processing..." />
 */
function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  animated = true,
  indeterminate = false,
  label,
  className = '',
}: ProgressBarProps) {
  // Ensure value is within bounds
  const clampedValue = Math.min(Math.max(value, 0), max);
  const percentage = (clampedValue / max) * 100;

  // Size mappings
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  // Color mappings
  const colorClasses = {
    primary: 'bg-primary-600 dark:bg-primary-500',
    success: 'bg-green-600 dark:bg-green-500',
    warning: 'bg-yellow-600 dark:bg-yellow-500',
    danger: 'bg-red-600 dark:bg-red-500',
  };

  return (
    <div className={className}>
      {/* Label */}
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label || `${Math.round(percentage)}%`}
          </span>
          {showLabel && !label && (
            <span className="text-sm text-gray-500 dark:text-gray-300">
              {clampedValue} / {max}
            </span>
          )}
        </div>
      )}

      {/* Progress bar track */}
      <div
        className={`
          w-full ${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden
        `}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `${Math.round(percentage)}% complete`}
      >
        {/* Progress bar fill */}
        <div
          className={`
            h-full ${colorClasses[variant]} rounded-full
            ${animated ? 'transition-all duration-300 ease-out' : ''}
            ${indeterminate ? 'w-1/3 animate-progress' : ''}
          `}
          style={
            indeterminate
              ? undefined
              : {
                  width: `${percentage}%`,
                }
          }
        />
      </div>
    </div>
  );
}

export default ProgressBar;
