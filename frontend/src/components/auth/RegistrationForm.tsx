/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';

export interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface RegistrationFormProps {
  /**
   * Callback when the form is submitted with valid data
   */
  onSubmit: (data: RegistrationFormData) => void | Promise<void>;

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
  password?: string;
  confirmPassword?: string;
  displayName?: string;
}

function RegistrationForm({
  onSubmit,
  isLoading = false,
  error,
  className = '',
}: RegistrationFormProps) {
  const [formData, setFormData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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

  // Password validation (matches Cognito requirements: 12+ chars with complexity)
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
    if (!/[^A-Za-z0-9]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return undefined;
  };

  // Confirm password validation
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

  // Display name validation
  const validateDisplayName = (displayName: string): string | undefined => {
    if (!displayName) {
      return 'Display name is required';
    }
    if (displayName.length < 3) {
      return 'Display name must be at least 3 characters';
    }
    if (displayName.length > 50) {
      return 'Display name must not exceed 50 characters';
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(
      formData.confirmPassword,
      formData.password,
    );
    const displayNameError = validateDisplayName(formData.displayName);

    const newErrors: FormErrors = {};
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    if (displayNameError) newErrors.displayName = displayNameError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange =
    (field: keyof RegistrationFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Validate on change if field has been touched
      if (touched[field]) {
        let fieldError: string | undefined;
        switch (field) {
          case 'email':
            fieldError = validateEmail(value);
            break;
          case 'password':
            fieldError = validatePassword(value);
            // Also re-validate confirmPassword if it's been touched
            if (touched['confirmPassword']) {
              const confirmError = validateConfirmPassword(formData.confirmPassword, value);
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
            break;
          case 'confirmPassword':
            fieldError = validateConfirmPassword(value, formData.password);
            break;
          case 'displayName':
            fieldError = validateDisplayName(value);
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
    };

  // Handle input blur
  const handleBlur = (field: keyof RegistrationFormData) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate field on blur
    let fieldError: string | undefined;
    switch (field) {
      case 'email':
        fieldError = validateEmail(formData.email);
        break;
      case 'password':
        fieldError = validatePassword(formData.password);
        break;
      case 'confirmPassword':
        fieldError = validateConfirmPassword(formData.confirmPassword, formData.password);
        break;
      case 'displayName':
        fieldError = validateDisplayName(formData.displayName);
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
      password: true,
      confirmPassword: true,
      displayName: true,
    });

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Submit form
    await onSubmit(formData);
  };

  return (
    <Card variant="default" padding="lg" className={className}>
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Join the discussion platform to participate in thoughtful conversations
        </p>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-fallacy-light border border-fallacy-DEFAULT p-4">
              <p className="text-sm text-fallacy-dark">{error}</p>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            id="email"
            value={formData.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            {...(touched['email'] && errors.email ? { error: errors.email } : {})}
            required
            fullWidth
            placeholder="you@example.com"
            autoComplete="email"
          />

          <Input
            label="Display Name"
            type="text"
            id="displayName"
            value={formData.displayName}
            onChange={handleChange('displayName')}
            onBlur={handleBlur('displayName')}
            {...(touched['displayName'] && errors.displayName ? { error: errors.displayName } : {})}
            helperText="This is how your name will appear to other users (3-50 characters)"
            required
            fullWidth
            placeholder="Your Name"
            autoComplete="username"
          />

          <Input
            label="Password"
            type="password"
            id="password"
            value={formData.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            {...(touched['password'] && errors.password ? { error: errors.password } : {})}
            helperText="Must be at least 12 characters with uppercase, lowercase, number, and special character"
            required
            fullWidth
            placeholder="Create a strong password"
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            onBlur={handleBlur('confirmPassword')}
            {...(touched['confirmPassword'] && errors.confirmPassword
              ? { error: errors.confirmPassword }
              : {})}
            required
            fullWidth
            placeholder="Re-enter your password"
            autoComplete="new-password"
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

          <p className="text-sm text-center text-gray-600">
            Already have an account?{' '}
            <a href="/" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </a>
          </p>
        </form>
      </CardBody>
    </Card>
  );
}

export default RegistrationForm;
