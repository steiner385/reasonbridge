import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Label for the input field
   */
  label?: string;

  /**
   * Helper text to display below the input
   */
  helperText?: string;

  /**
   * Error message to display (when invalid)
   */
  error?: string;

  /**
   * Whether the input is required
   */
  required?: boolean;

  /**
   * Icon to display at the start of the input
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to display at the end of the input
   */
  rightIcon?: React.ReactNode;

  /**
   * Size variant of the input
   */
  inputSize?: 'sm' | 'md' | 'lg';

  /**
   * Whether the input should take full width
   */
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      required,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref,
  ) => {
    // Generate a unique ID if not provided
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;
    const hasError = Boolean(error);

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    // Icon size styles
    const iconSizeStyles = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    };

    // Base input styles (with dark mode support)
    const baseStyles =
      'rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';

    // State-based border and ring styles (with dark mode support)
    const stateStyles = hasError
      ? 'border-fallacy-DEFAULT focus:border-fallacy-DEFAULT focus:ring-fallacy-DEFAULT/20 dark:border-red-500 dark:focus:border-red-400'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600 dark:focus:border-primary-400';

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Padding adjustments for icons
    const leftPadding = leftIcon ? 'pl-10' : '';
    const rightPadding = rightIcon ? 'pr-10' : '';

    // Combined input classes
    const inputClassName = `${baseStyles} ${stateStyles} ${sizeStyles[inputSize]} ${widthStyles} ${leftPadding} ${rightPadding} ${className}`;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
            {required && <span className="text-fallacy-DEFAULT dark:text-red-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
              <span className={`flex items-center justify-center ${iconSizeStyles[inputSize]}`}>
                {leftIcon}
              </span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={inputClassName}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            required={required}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
              <span className={`flex items-center justify-center ${iconSizeStyles[inputSize]}`}>
                {rightIcon}
              </span>
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-fallacy-DEFAULT dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
