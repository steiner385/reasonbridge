/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormProps {
  /**
   * Callback when the form is submitted with valid data
   */
  onSubmit: (data: LoginFormData) => void | Promise<void>;

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
}

function LoginForm({ onSubmit, isLoading = false, error, className = '' }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
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

  // Password validation (basic check for login - just required)
  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    const newErrors: FormErrors = {};
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const handleBlur = (field: keyof LoginFormData) => () => {
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
        <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Sign in to continue participating in discussions
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
            label="Password"
            type="password"
            id="password"
            value={formData.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            {...(touched['password'] && errors.password ? { error: errors.password } : {})}
            required
            fullWidth
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          <p className="text-sm text-center text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Create one
            </Link>
          </p>
        </form>
      </CardBody>
    </Card>
  );
}

export default LoginForm;
