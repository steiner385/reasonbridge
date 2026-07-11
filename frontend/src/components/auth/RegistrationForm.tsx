/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, type RegistrationFormData } from '../../schemas/auth';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';
import BirthDateInput from './BirthDateInput';
import CountrySelector from './CountrySelector';

export type { RegistrationFormData };

/**
 * Regional consent ages for determining minor status
 * Based on COPPA (US), GDPR Article 8 (EU), and other regional laws
 */
const CONSENT_AGES: Record<string, number> = {
  US: 13,
  GB: 13,
  AU: 13,
  CA: 13,
  IE: 16,
  DE: 16,
  NL: 16,
  FR: 15,
  ES: 14,
  IT: 14,
  AT: 14,
  BE: 13,
  DK: 13,
  SE: 13,
  FI: 13,
  NO: 13,
  PL: 16,
  PT: 13,
  CZ: 15,
  SK: 16,
  HU: 16,
};

const DEFAULT_CONSENT_AGE = 16;

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Check if user is a minor based on birth date and country
 */
function isMinor(birthDate: string | undefined, country: string | undefined): boolean {
  if (!birthDate || !country) return false;
  const age = calculateAge(new Date(birthDate));
  const consentAge = CONSENT_AGES[country] || DEFAULT_CONSENT_AGE;
  return age < consentAge;
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

function RegistrationForm({
  onSubmit,
  isLoading = false,
  error,
  className = '',
}: RegistrationFormProps) {
  const [showParentEmail, setShowParentEmail] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, touchedFields },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur', // Validate on blur
    reValidateMode: 'onChange', // Re-validate on change after first blur
  });

  // Watch birth date and country to determine if parent email should be shown
  // eslint-disable-next-line react-hooks/incompatible-library
  const birthDate = watch('birthDate');
  const declaredCountry = watch('declaredCountry');

  useEffect(() => {
    setShowParentEmail(isMinor(birthDate, declaredCountry));
  }, [birthDate, declaredCountry]);

  // Scroll to first error on submit
  const handleFormSubmit = async (data: RegistrationFormData) => {
    try {
      await onSubmit(data);
    } catch {
      // Error handling is done in parent component
      // Scroll to first error field if validation errors exist
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const errorElement = document.getElementById(firstErrorField);
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement?.focus();
      }
    }
  };

  // Get consent age for the selected country
  const consentAge = declaredCountry
    ? CONSENT_AGES[declaredCountry] || DEFAULT_CONSENT_AGE
    : DEFAULT_CONSENT_AGE;

  return (
    <Card variant="default" padding="lg" className={className}>
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Account</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Join the discussion platform to participate in thoughtful conversations
        </p>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-lg bg-fallacy-light dark:bg-red-900/20 border border-fallacy-DEFAULT dark:border-red-700 p-4">
              <p className="text-sm text-fallacy-dark dark:text-red-300">{error}</p>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            id="email"
            {...register('email')}
            error={touchedFields.email ? errors.email?.message : undefined}
            required
            fullWidth
            placeholder="you@example.com"
            autoComplete="email"
          />

          <Input
            label="Display Name"
            type="text"
            id="displayName"
            {...register('displayName')}
            error={touchedFields.displayName ? errors.displayName?.message : undefined}
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
            {...register('password')}
            error={touchedFields.password ? errors.password?.message : undefined}
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
            {...register('confirmPassword')}
            error={touchedFields.confirmPassword ? errors.confirmPassword?.message : undefined}
            required
            fullWidth
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />

          {/* Child Safety Section (Optional for Phase 1) */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Age & Location (Optional)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Providing this information helps us ensure a safe experience for all users, especially
              younger members.
            </p>

            <div className="space-y-4">
              <Controller
                name="birthDate"
                control={control}
                render={({ field }) => (
                  <BirthDateInput
                    id="birthDate"
                    value={field.value || ''}
                    onChange={field.onChange}
                    error={touchedFields.birthDate ? errors.birthDate?.message : undefined}
                  />
                )}
              />

              <Controller
                name="declaredCountry"
                control={control}
                render={({ field }) => (
                  <CountrySelector
                    id="declaredCountry"
                    value={field.value || ''}
                    onChange={field.onChange}
                    error={
                      touchedFields.declaredCountry ? errors.declaredCountry?.message : undefined
                    }
                  />
                )}
              />

              {/* Parent Email - shown when user is a minor */}
              {showParentEmail && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                    Based on your age and location, parental consent is required (under {consentAge}{' '}
                    years old). Please provide your parent or guardian&apos;s email address so we
                    can request their consent.
                  </p>
                  <Input
                    label="Parent/Guardian Email"
                    type="email"
                    id="parentEmail"
                    {...register('parentEmail')}
                    error={touchedFields.parentEmail ? errors.parentEmail?.message : undefined}
                    helperText="We will send a consent request to this email address"
                    fullWidth
                    placeholder="parent@example.com"
                  />
                </div>
              )}
            </div>
          </div>

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

          <p className="text-sm text-center text-gray-600 dark:text-gray-300">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardBody>
    </Card>
  );
}

export default RegistrationForm;
