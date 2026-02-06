/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';

export interface ProfileEditFormData {
  displayName: string;
}

export interface ProfileEditFormProps {
  /**
   * Initial profile data to populate the form
   */
  initialData?: ProfileEditFormData;

  /**
   * Callback when the form is submitted with valid data
   */
  onSubmit: (data: ProfileEditFormData) => void | Promise<void>;

  /**
   * Callback when the user cancels editing
   */
  onCancel?: () => void;

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
  displayName?: string;
}

function ProfileEditForm({
  initialData = { displayName: '' },
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  className = '',
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState<ProfileEditFormData>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Display name validation (matches RegistrationForm validation)
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
    const displayNameError = validateDisplayName(formData.displayName);

    const newErrors: FormErrors = {};
    if (displayNameError) newErrors.displayName = displayNameError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ displayName: value });

    // Validate on change if field has been touched
    if (touched['displayName']) {
      const fieldError = validateDisplayName(value);
      setErrors((prev) => {
        const updated = { ...prev };
        if (fieldError) {
          updated.displayName = fieldError;
        } else {
          delete updated.displayName;
        }
        return updated;
      });
    }
  };

  // Handle input blur
  const handleBlur = () => {
    setTouched((prev) => ({ ...prev, displayName: true }));

    // Validate field on blur
    const fieldError = validateDisplayName(formData.displayName);
    setErrors((prev) => {
      const updated = { ...prev };
      if (fieldError) {
        updated.displayName = fieldError;
      } else {
        delete updated.displayName;
      }
      return updated;
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ displayName: true });

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Submit form
    await onSubmit(formData);
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Card variant="default" padding="lg" className={className}>
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Profile</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Update your profile information
        </p>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-fallacy-light dark:bg-red-900/20 border border-fallacy-DEFAULT dark:border-red-700 p-4">
              <p className="text-sm text-fallacy-dark dark:text-red-300">{error}</p>
            </div>
          )}

          <Input
            label="Display Name"
            type="text"
            id="displayName"
            value={formData.displayName}
            onChange={handleChange}
            onBlur={handleBlur}
            {...(touched['displayName'] && errors.displayName ? { error: errors.displayName } : {})}
            helperText="This is how your name will appear to other users (3-50 characters)"
            required
            fullWidth
            placeholder="Your Name"
            autoComplete="username"
          />

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export default ProfileEditForm;
