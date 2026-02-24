/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CredentialSubmitForm component
 * Feature 781: User Ranking System - Task 5.3
 *
 * @remarks
 * Form for users to submit credentials for domain expertise verification.
 * - **Category Selection**: Dropdown to select topic/tag domain
 * - **Credential Types**: Academic degrees, licenses, certifications, publications
 * - **Optional Fields**: Document URL, verification URL, expiration date
 * - **Form Validation**: React Hook Form + Zod
 * - **Accessibility**: ARIA labels, error states, required field indicators
 */

import { useState, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../ui/Input';
import Button from '../ui/Button';
import type { SubmitCredentialInput, CredentialType } from '../../types/ranking';
import { CREDENTIAL_TYPE_LABELS } from '../../types/ranking';

/**
 * Props for CredentialSubmitForm component
 */
export interface CredentialSubmitFormProps {
  /** Available categories (tags) for credential domain */
  tags: Array<{ id: string; name: string }>;
  /** Callback when form is submitted with valid data */
  onSubmit: (data: SubmitCredentialInput) => Promise<void>;
  /** Callback when submission is successful */
  onSuccess?: () => void;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * All available credential types
 */
const CREDENTIAL_TYPES: CredentialType[] = [
  'ACADEMIC_DOCTORATE',
  'ACADEMIC_MASTERS',
  'ACADEMIC_BACHELORS',
  'PROFESSIONAL_LICENSE',
  'INDUSTRY_CERTIFICATION',
  'PUBLICATION',
];

/**
 * Zod schema for credential submission form validation
 * Uses string type for form field compatibility, with validation
 */
const credentialFormSchema = z.object({
  tagId: z.string().min(1, 'Please select a category'),
  type: z.string().min(1, 'Please select a credential type'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  institution: z
    .string()
    .min(1, 'Institution is required')
    .max(200, 'Institution must be less than 200 characters'),
  documentUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  verificationUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  expiresAt: z.string().optional().or(z.literal('')),
});

type CredentialFormData = z.infer<typeof credentialFormSchema>;

/**
 * Form component for submitting credentials for domain expertise verification
 */
export function CredentialSubmitForm({
  tags,
  onSubmit,
  onSuccess,
  onCancel,
  className = '',
}: CredentialSubmitFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Generate unique IDs for form elements
  const formId = useId();
  const categoryId = `${formId}-category`;
  const typeId = `${formId}-type`;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    reset,
    watch,
  } = useForm<CredentialFormData>({
    resolver: zodResolver(credentialFormSchema),
    mode: 'onChange',
    defaultValues: {
      tagId: '',
      type: '',
      title: '',
      institution: '',
      documentUrl: '',
      verificationUrl: '',
      expiresAt: '',
    },
  });

  // Watch form values for submit button state
  const formValues = watch();
  const hasRequiredFields =
    formValues.tagId && formValues.type && formValues.title && formValues.institution;

  const handleFormSubmit = async (data: CredentialFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submitData: SubmitCredentialInput = {
        tagId: data.tagId,
        type: data.type as CredentialType,
        title: data.title,
        institution: data.institution,
        documentUrl: data.documentUrl || undefined,
        verificationUrl: data.verificationUrl || undefined,
        expiresAt: data.expiresAt || undefined,
      };

      await onSubmit(submitData);
      reset();
      onSuccess?.();
    } catch {
      setSubmitError('Failed to submit credential. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
        {/* Error Banner */}
        {submitError && (
          <div
            className="rounded-lg bg-fallacy-light dark:bg-red-900/20 border border-fallacy-DEFAULT dark:border-red-700 p-4"
            role="alert"
          >
            <p className="text-sm text-fallacy-dark dark:text-red-300">{submitError}</p>
          </div>
        )}

        {/* Category Selector */}
        <div>
          <label
            htmlFor={categoryId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Category <span className="text-fallacy-DEFAULT dark:text-red-400">*</span>
          </label>
          <select
            id={categoryId}
            {...register('tagId')}
            disabled={isSubmitting}
            aria-invalid={!!errors.tagId}
            aria-describedby={errors.tagId ? `${categoryId}-error` : undefined}
            className={`
              w-full rounded-lg border px-4 py-2 text-base transition-colors
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              focus:outline-none focus:ring-2 focus:ring-offset-1
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                errors.tagId
                  ? 'border-fallacy-DEFAULT focus:border-fallacy-DEFAULT focus:ring-fallacy-DEFAULT/20 dark:border-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600 dark:focus:border-primary-400'
              }
            `}
          >
            <option value="">Select a category...</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          {errors.tagId && (
            <p
              id={`${categoryId}-error`}
              className="mt-1.5 text-sm text-fallacy-DEFAULT dark:text-red-400"
              role="alert"
            >
              {errors.tagId.message}
            </p>
          )}
        </div>

        {/* Credential Type Selector */}
        <div>
          <label
            htmlFor={typeId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Credential Type <span className="text-fallacy-DEFAULT dark:text-red-400">*</span>
          </label>
          <select
            id={typeId}
            {...register('type')}
            disabled={isSubmitting}
            aria-invalid={!!errors.type}
            aria-describedby={errors.type ? `${typeId}-error` : undefined}
            className={`
              w-full rounded-lg border px-4 py-2 text-base transition-colors
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              focus:outline-none focus:ring-2 focus:ring-offset-1
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                errors.type
                  ? 'border-fallacy-DEFAULT focus:border-fallacy-DEFAULT focus:ring-fallacy-DEFAULT/20 dark:border-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600 dark:focus:border-primary-400'
              }
            `}
          >
            <option value="">Select a credential type...</option>
            {CREDENTIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {CREDENTIAL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          {errors.type && (
            <p
              id={`${typeId}-error`}
              className="mt-1.5 text-sm text-fallacy-DEFAULT dark:text-red-400"
              role="alert"
            >
              {errors.type.message}
            </p>
          )}
        </div>

        {/* Title Input */}
        <Input
          label="Title"
          type="text"
          id="title"
          placeholder="e.g., PhD in Clinical Psychology"
          {...register('title')}
          error={touchedFields.title || errors.title ? errors.title?.message : undefined}
          required
          disabled={isSubmitting}
          fullWidth
        />

        {/* Institution Input */}
        <Input
          label="Institution"
          type="text"
          id="institution"
          placeholder="e.g., Stanford University"
          {...register('institution')}
          error={
            touchedFields.institution || errors.institution
              ? errors.institution?.message
              : undefined
          }
          required
          disabled={isSubmitting}
          fullWidth
        />

        {/* Document URL Input (Optional) */}
        <Input
          label="Document URL"
          type="url"
          id="documentUrl"
          placeholder="https://example.com/diploma.pdf"
          helperText="Optional - Link to uploaded proof document"
          {...register('documentUrl')}
          error={errors.documentUrl?.message}
          disabled={isSubmitting}
          fullWidth
        />

        {/* Verification URL Input (Optional) */}
        <Input
          label="Verification URL"
          type="url"
          id="verificationUrl"
          placeholder="https://verify.institution.edu/12345"
          helperText="Optional - External verification link"
          {...register('verificationUrl')}
          error={errors.verificationUrl?.message}
          disabled={isSubmitting}
          fullWidth
        />

        {/* Expiration Date Input (Optional) */}
        <Input
          label="Expiration Date"
          type="date"
          id="expiresAt"
          helperText="Optional - For certifications and licenses"
          {...register('expiresAt')}
          disabled={isSubmitting}
          fullWidth
        />

        {/* Form Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={!hasRequiredFields || !isValid || isSubmitting}
            isLoading={isSubmitting}
            className={onCancel ? 'flex-1' : 'w-full'}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Credential'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CredentialSubmitForm;
