/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RegistrationFormData } from '../../components/auth/RegistrationForm';
import RegistrationForm from '../../components/auth/RegistrationForm';
import { apiClient, ApiError } from '../../lib/api';

interface RegisterResponse {
  userId: string;
  email: string;
  displayName: string;
  message: string;
  requiresEmailVerification: boolean;
  /** Whether parental consent is required (true for minors) */
  requiresParentalConsent?: boolean;
  /** Whether the parental-consent email was sent */
  consentEmailSent?: boolean;
}

/**
 * Registration page that renders the RegistrationForm component
 * and handles user registration flow.
 */
function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    setError(undefined);

    try {
      // Forward ALL collected fields. Previously only email/password/displayName
      // were sent, silently dropping birthDate/declaredCountry/parentEmail — so a
      // minor's parental-consent flow (which the backend drives from these
      // fields) never triggered despite the UI promising a consent email
      // (issue #1331). Optional fields are omitted when empty so class-validator
      // @IsOptional rules pass.
      await apiClient.post<RegisterResponse>('/auth/register', {
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        ...(data.birthDate ? { birthDate: data.birthDate } : {}),
        ...(data.declaredCountry ? { declaredCountry: data.declaredCountry } : {}),
        ...(data.parentEmail ? { parentEmail: data.parentEmail } : {}),
      });

      // Store the email so /verify-email (and resend) have a pending target —
      // without this the verification page dead-ends with "No pending
      // verification email found" (issue #1331). Mirrors the /signup flow.
      localStorage.setItem('pendingVerificationEmail', data.email);

      // Send the user straight to the verification step instead of the landing
      // page (which never rendered the success message anyway).
      navigate('/verify-email', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle specific API errors
        if (err.status === 409) {
          setError('An account with this email already exists.');
        } else if (err.status === 400) {
          setError('Invalid registration data. Please check your input.');
        } else {
          setError(err.message || 'Failed to create account. Please try again.');
        }
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to create account. Please try again.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <RegistrationForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        {...(error ? { error } : {})}
      />
    </div>
  );
}

export default RegisterPage;
