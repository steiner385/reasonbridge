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
 * Password validation schema
 * Requirements:
 * - Minimum 12 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

/**
 * Display name validation schema
 * Requirements: 3-50 characters, alphanumeric with spaces allowed
 */
export const displayNameSchema = z
  .string()
  .min(3, 'Display name must be at least 3 characters')
  .max(50, 'Display name must be at most 50 characters')
  .regex(/^[a-zA-Z0-9\s]+$/, 'Display name can only contain letters, numbers, and spaces')
  .trim();

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
