/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

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
      type,
      ...props
    },
    ref,
  ) => {
    // Generate a unique ID if not provided
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;
    const hasError = Boolean(error);

    // Password visibility toggle
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = type === 'password';
    const inputType = isPasswordField && showPassword ? 'text' : type;

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

    // Padding adjustments for icons (password toggle also needs right padding)
    const leftPadding = leftIcon ? 'pl-10' : '';
    const rightPadding = rightIcon || isPasswordField ? 'pr-10' : '';

    // Eye icons for password toggle
    const EyeIcon = () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={iconSizeStyles[inputSize]}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
      </svg>
    );

    const EyeOffIcon = () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={iconSizeStyles[inputSize]}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      </svg>
    );

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
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-300 pointer-events-none">
              <span className={`flex items-center justify-center ${iconSizeStyles[inputSize]}`}>
                {leftIcon}
              </span>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={inputClassName}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            required={required}
            {...props}
          />

          {/* Password toggle button or regular right icon */}
          {isPasswordField ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-300 focus:outline-none focus:text-gray-600 dark:focus:text-gray-300 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          ) : (
            rightIcon && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-300 pointer-events-none">
                <span className={`flex items-center justify-center ${iconSizeStyles[inputSize]}`}>
                  {rightIcon}
                </span>
              </div>
            )
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
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500 dark:text-gray-300">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
