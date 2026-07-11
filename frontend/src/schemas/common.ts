/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

/**
 * Common validation schemas used across the application
 * Provides reusable validators for email, password, URL, and other common fields
 */

/**
 * Email validation schema
 * Requirements: Valid email format
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .toLowerCase()
  .trim();

/**
 * Canonical password special-character set.
 *
 * Single source of truth shared by every client-side password check so the
 * frontend never accepts a character the backend RegisterDto
 * (services/user-service/src/auth/dto/register.dto.ts) would reject with a 400.
 * Keep this in sync with the class-validator `@Matches` rule on the backend.
 */
export const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

/** Human-readable message used whenever the special-character rule fails. */
export const PASSWORD_SPECIAL_CHAR_MESSAGE = 'Password must contain at least one special character';

/**
 * Password validation schema
 * Requirements:
 * - Minimum 12 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character (see PASSWORD_SPECIAL_CHAR_REGEX)
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(PASSWORD_SPECIAL_CHAR_REGEX, PASSWORD_SPECIAL_CHAR_MESSAGE);

/**
 * Display name validation schema
 *
 * Aligned with the backend RegisterDto (MinLength 2, MaxLength 50, no
 * character allow-list) so legitimate names such as "O'Brien" or "José" are
 * not blocked client-side while still passing server validation.
 */
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 50;

export const displayNameSchema = z
  .string()
  .trim()
  .min(
    DISPLAY_NAME_MIN_LENGTH,
    `Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} characters`,
  )
  .max(
    DISPLAY_NAME_MAX_LENGTH,
    `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
  );

/**
 * URL validation schema
 * Requirements: Valid HTTP/HTTPS URL
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .regex(/^https?:\/\//, 'URL must start with http:// or https://');

/**
 * Optional URL validation schema
 * Allows empty string or valid URL
 */
export const optionalUrlSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^https?:\/\//.test(val), 'URL must start with http:// or https://');

/**
 * Text content validation schema
 * Requirements: Non-empty string with max length
 */
export const textContentSchema = (minLength = 1, maxLength = 5000, fieldName = 'Content') =>
  z
    .string()
    .min(minLength, `${fieldName} must be at least ${minLength} characters`)
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`)
    .trim();

/**
 * Phone number validation schema (E.164 format)
 * Optional - allows empty or valid phone number
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (use E.164 format)')
  .optional()
  .or(z.literal(''));

/**
 * Confirmation field schema generator
 * Creates a schema that must match another field value
 * Note: Field matching validation should be done at form level using .refine()
 */
export const confirmationSchema = (fieldName: string, _matchField: string) =>
  z.string().min(1, `${fieldName} is required`);

/**
 * Birth date validation schema
 * Validates ISO 8601 date format (YYYY-MM-DD) and ensures reasonable age range
 * Optional for Phase 1 - will be required in later phases
 */
export const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (date) => {
      const parsed = new Date(date);
      const now = new Date();
      const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      const maxDate = now;
      return parsed >= minDate && parsed <= maxDate;
    },
    { message: 'Please enter a valid date of birth' },
  )
  .optional();

/**
 * Country code validation schema (ISO 3166-1 alpha-2)
 * Validates 2-letter country codes like 'US', 'GB', 'DE'
 * Optional for Phase 1 - will be required in later phases
 */
export const countryCodeSchema = z
  .string()
  .length(2, 'Country code must be exactly 2 characters')
  .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters (e.g., US, GB, DE)')
  .optional();
