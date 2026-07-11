/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import {
  PASSWORD_SPECIAL_CHAR_REGEX,
  PASSWORD_SPECIAL_CHAR_MESSAGE,
  DISPLAY_NAME_MIN_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
} from '../../schemas/common';

export interface EmailSignupFormData {
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}

export interface EmailSignupFormProps {
  /**
   * Callback when the form is submitted with valid data
   */
  onSubmit: (data: EmailSignupFormData) => void | Promise<void>;

  /**
   * Whether the form is in a loading/submitting state
   */
  isLoading?: boolean;

  /**
   * Error message to display at the form level
   */
  error?: string;

  /**
   * Custom CSS class name for the form wrapper
   */
  className?: string;
}

interface FormErrors {
  email?: string;
  displayName?: string;
  password?: string;
  confirmPassword?: string;
}

type PasswordStrength = 'weak' | 'medium' | 'strong';

/**
 * Calculate password strength based on various criteria
 */
const calculatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;

  // Length score
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety score
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Return strength based on score
  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
};

/**
 * EmailSignupForm component - Form for email/password registration with real-time validation
 * Features password strength indicator, email format validation, and accessibility
 */
function EmailSignupForm({
  onSubmit,
  isLoading = false,
  error,
  className = '',
}: EmailSignupFormProps) {
  const [formData, setFormData] = useState<EmailSignupFormData>({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');

  // Email validation
  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  // Display name validation (aligned with backend RegisterDto: 2-50 characters)
  const validateDisplayName = (displayName: string): string | undefined => {
    if (!displayName) {
      return 'Display name is required';
    }
    if (displayName.trim().length < DISPLAY_NAME_MIN_LENGTH) {
      return `Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} characters`;
    }
    if (displayName.trim().length > DISPLAY_NAME_MAX_LENGTH) {
      return `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`;
    }
    return undefined;
  };

  // Password validation (12+ chars with complexity)
  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 12) {
      return 'Password must be at least 12 characters';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!PASSWORD_SPECIAL_CHAR_REGEX.test(password)) {
      return PASSWORD_SPECIAL_CHAR_MESSAGE;
    }
    return undefined;
  };

  // Confirm password validation (must match password)
  const validateConfirmPassword = (
    confirmPassword: string,
    password: string,
  ): string | undefined => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const emailError = validateEmail(formData.email);
    const displayNameError = validateDisplayName(formData.displayName);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(
      formData.confirmPassword,
      formData.password,
    );

    const newErrors: FormErrors = {};
    if (emailError) newErrors.email = emailError;
    if (displayNameError) newErrors.displayName = displayNameError;
    if (passwordError) newErrors.password = passwordError;
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange =
    (field: keyof EmailSignupFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const newFormData = { ...formData, [field]: value };
      setFormData(newFormData);

      // Update password strength in real-time
      if (field === 'password') {
        setPasswordStrength(calculatePasswordStrength(value));
      }

      // Validate on change if field has been touched
      if (touched[field]) {
        let fieldError: string | undefined;
        switch (field) {
          case 'email':
            fieldError = validateEmail(value);
            break;
          case 'displayName':
            fieldError = validateDisplayName(value);
            break;
          case 'password':
            fieldError = validatePassword(value);
            break;
          case 'confirmPassword':
            fieldError = validateConfirmPassword(value, newFormData.password);
            break;
        }
        setErrors((prev) => {
          const updated = { ...prev };
          if (fieldError) {
            updated[field] = fieldError;
          } else {
            delete updated[field];
          }
          return updated;
        });
      }

      // Re-validate confirmPassword if password changed and confirmPassword was touched
      if (field === 'password' && touched['confirmPassword'] && newFormData.confirmPassword) {
        const confirmError = validateConfirmPassword(newFormData.confirmPassword, value);
        setErrors((prev) => {
          const updated = { ...prev };
          if (confirmError) {
            updated.confirmPassword = confirmError;
          } else {
            delete updated.confirmPassword;
          }
          return updated;
        });
      }
    };

  // Handle input blur
  const handleBlur = (field: keyof EmailSignupFormData) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate field on blur
    let fieldError: string | undefined;
    switch (field) {
      case 'email':
        fieldError = validateEmail(formData.email);
        break;
      case 'displayName':
        fieldError = validateDisplayName(formData.displayName);
        break;
      case 'password':
        fieldError = validatePassword(formData.password);
        break;
      case 'confirmPassword':
        fieldError = validateConfirmPassword(formData.confirmPassword, formData.password);
        break;
    }
    setErrors((prev) => {
      const updated = { ...prev };
      if (fieldError) {
        updated[field] = fieldError;
      } else {
        delete updated[field];
      }
      return updated;
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      email: true,
      displayName: true,
      password: true,
      confirmPassword: true,
    });

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Submit form
    await onSubmit(formData);
  };

  // Password strength indicator colors and text
  const strengthConfig = {
    weak: {
      color: 'bg-red-500',
      width: 'w-1/3',
      text: 'Weak',
      textColor: 'text-red-700',
    },
    medium: {
      color: 'bg-yellow-500',
      width: 'w-2/3',
      text: 'Medium',
      textColor: 'text-yellow-600',
    },
    strong: {
      color: 'bg-green-500',
      width: 'w-full',
      text: 'Strong',
      textColor: 'text-green-600',
    },
  };

  const currentStrength = strengthConfig[passwordStrength];

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {error && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Input
        label="Email"
        type="email"
        id="signup-email"
        value={formData.email}
        onChange={handleChange('email')}
        onBlur={handleBlur('email')}
        {...(touched['email'] && errors.email ? { error: errors.email } : {})}
        required
        fullWidth
        placeholder="you@example.com"
        autoComplete="email"
        aria-label="Email address"
      />

      <Input
        label="Display Name"
        type="text"
        id="signup-displayname"
        value={formData.displayName}
        onChange={handleChange('displayName')}
        onBlur={handleBlur('displayName')}
        {...(touched['displayName'] && errors.displayName ? { error: errors.displayName } : {})}
        required
        fullWidth
        placeholder="Your public display name"
        autoComplete="username"
        aria-label="Display Name"
      />

      <div>
        <Input
          label="Password"
          type="password"
          id="signup-password"
          value={formData.password}
          onChange={handleChange('password')}
          onBlur={handleBlur('password')}
          {...(touched['password'] && errors.password ? { error: errors.password } : {})}
          required
          fullWidth
          placeholder="Create a strong password"
          autoComplete="new-password"
          aria-label="Password"
          aria-describedby="password-requirements password-strength"
        />

        {/* Password strength indicator */}
        {formData.password && (
          <div className="mt-2" id="password-strength" aria-live="polite">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">Password strength</span>
              <span className={`text-xs font-medium ${currentStrength.textColor}`}>
                {currentStrength.text}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${currentStrength.color} transition-all duration-300 ${currentStrength.width}`}
                role="progressbar"
                aria-valuenow={
                  passwordStrength === 'weak' ? 33 : passwordStrength === 'medium' ? 66 : 100
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Password strength: ${currentStrength.text}`}
              />
            </div>
          </div>
        )}

        {/* Password requirements hint */}
        {!errors.password && (
          <p id="password-requirements" className="mt-2 text-xs text-gray-500">
            Must be at least 12 characters with uppercase, lowercase, number, and special character
          </p>
        )}
      </div>

      <Input
        label="Confirm Password"
        type="password"
        id="signup-confirm-password"
        value={formData.confirmPassword}
        onChange={handleChange('confirmPassword')}
        onBlur={handleBlur('confirmPassword')}
        {...(touched['confirmPassword'] && errors.confirmPassword
          ? { error: errors.confirmPassword }
          : {})}
        required
        fullWidth
        placeholder="Confirm your password"
        autoComplete="new-password"
        aria-label="Confirm Password"
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isLoading}
        disabled={isLoading}
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}

export default EmailSignupForm;
