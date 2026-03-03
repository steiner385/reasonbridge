/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';
import type {
  PrivacySettings as PrivacySettingsType,
  ProfileVisibility,
  TrustVisibility,
} from '../../types/user';
import AvatarUpload from './AvatarUpload';
import PrivacySettings from './PrivacySettings';

export interface ProfileEditFormData {
  displayName: string;
  bio: string;
}

export interface ProfileEditFormProps {
  /**
   * Initial profile data to populate the form
   */
  initialData?: ProfileEditFormData;

  /**
   * Current avatar URL (if any)
   */
  currentAvatarUrl?: string | null;

  /**
   * Callback when the form is submitted with valid data
   */
  onSubmit: (data: ProfileEditFormData) => void | Promise<void>;

  /**
   * Callback when avatar is uploaded
   */
  onAvatarUpload?: (file: File) => Promise<void>;

  /**
   * Callback when avatar is removed
   */
  onAvatarRemove?: () => Promise<void>;

  /**
   * Callback when the user cancels editing
   */
  onCancel?: () => void;

  /**
   * Whether the form is in a loading/submitting state
   */
  isLoading?: boolean;

  /**
   * Whether avatar is being uploaded
   */
  isUploadingAvatar?: boolean;

  /**
   * Error message to display at the form level
   */
  error?: string;

  /**
   * Custom CSS class name for the form wrapper
   */
  className?: string;

  /**
   * Privacy settings (optional - show privacy section if provided)
   */
  privacySettings?: PrivacySettingsType | null;

  /**
   * Callback when privacy settings change (saves immediately)
   */
  onPrivacyChange?: (
    field: keyof PrivacySettingsType,
    value: ProfileVisibility | TrustVisibility,
  ) => void;

  /**
   * Whether privacy settings are being saved
   */
  isPrivacySaving?: boolean;
}

interface FormErrors {
  displayName?: string;
  bio?: string;
}

/** Maximum bio length in characters */
const BIO_MAX_LENGTH = 300;

function ProfileEditForm({
  initialData = { displayName: '', bio: '' },
  currentAvatarUrl,
  onSubmit,
  onAvatarUpload,
  onAvatarRemove,
  onCancel,
  isLoading = false,
  isUploadingAvatar = false,
  error,
  className = '',
  privacySettings,
  onPrivacyChange,
  isPrivacySaving = false,
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

  // Bio validation (optional field, max 300 chars)
  const validateBio = (bio: string): string | undefined => {
    if (bio.length > BIO_MAX_LENGTH) {
      return `Bio must not exceed ${BIO_MAX_LENGTH} characters`;
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const displayNameError = validateDisplayName(formData.displayName);
    const bioError = validateBio(formData.bio);

    const newErrors: FormErrors = {};
    if (displayNameError) newErrors.displayName = displayNameError;
    if (bioError) newErrors.bio = bioError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change for text inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validate on change if field has been touched
    if (touched[name]) {
      const fieldError = name === 'displayName' ? validateDisplayName(value) : undefined;
      setErrors((prev) => {
        const updated = { ...prev };
        if (fieldError) {
          updated[name as keyof FormErrors] = fieldError;
        } else {
          delete updated[name as keyof FormErrors];
        }
        return updated;
      });
    }
  };

  // Handle textarea change for bio
  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, bio: value }));

    // Validate on change if field has been touched
    if (touched['bio']) {
      const fieldError = validateBio(value);
      setErrors((prev) => {
        const updated = { ...prev };
        if (fieldError) {
          updated.bio = fieldError;
        } else {
          delete updated.bio;
        }
        return updated;
      });
    }
  };

  // Handle input blur
  const handleBlur = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));

    // Validate field on blur
    let fieldError: string | undefined;
    if (fieldName === 'displayName') {
      fieldError = validateDisplayName(formData.displayName);
    } else if (fieldName === 'bio') {
      fieldError = validateBio(formData.bio);
    }

    setErrors((prev) => {
      const updated = { ...prev };
      if (fieldError) {
        updated[fieldName as keyof FormErrors] = fieldError;
      } else {
        delete updated[fieldName as keyof FormErrors];
      }
      return updated;
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ displayName: true, bio: true });

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
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Update your profile information
        </p>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-fallacy-light dark:bg-red-900/20 border border-fallacy-DEFAULT dark:border-red-700 p-4">
              <p className="text-sm text-fallacy-dark dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Avatar upload section */}
          {onAvatarUpload && (
            <div className="flex flex-col items-center pb-4 border-b border-gray-200 dark:border-gray-700">
              <AvatarUpload
                currentAvatarUrl={currentAvatarUrl}
                onUpload={onAvatarUpload}
                onRemove={onAvatarRemove}
                isLoading={isUploadingAvatar}
                size="lg"
              />
            </div>
          )}

          <Input
            label="Display Name"
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            onBlur={() => handleBlur('displayName')}
            {...(touched['displayName'] && errors.displayName ? { error: errors.displayName } : {})}
            helperText="This is how your name will appear to other users (3-50 characters)"
            required
            fullWidth
            placeholder="Your Name"
            autoComplete="username"
          />

          {/* Bio textarea */}
          <div className="space-y-1">
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleBioChange}
              onBlur={() => handleBlur('bio')}
              placeholder="Tell others about yourself..."
              rows={4}
              maxLength={BIO_MAX_LENGTH}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                dark:focus:ring-primary-400 dark:focus:border-primary-400
                resize-none transition-colors
                ${
                  touched['bio'] && errors.bio
                    ? 'border-fallacy-DEFAULT dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {touched['bio'] && errors.bio ? (
                  <span className="text-fallacy-dark dark:text-red-400">{errors.bio}</span>
                ) : (
                  'A short description that appears on your profile'
                )}
              </p>
              <span
                className={`text-sm ${
                  formData.bio.length > BIO_MAX_LENGTH * 0.9
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {formData.bio.length}/{BIO_MAX_LENGTH}
              </span>
            </div>
          </div>

          {/* Privacy settings section (optional) */}
          {onPrivacyChange && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <PrivacySettings
                settings={privacySettings ?? null}
                onChange={onPrivacyChange}
                disabled={isPrivacySaving}
              />
              {isPrivacySaving && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 animate-pulse">
                  Saving privacy settings...
                </p>
              )}
            </div>
          )}

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
