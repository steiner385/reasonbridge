/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { emailSchema, passwordSchema } from './common';

/**
 * Authentication Form Validation Schemas
 * Used with React Hook Form + Zod for auth pages
 */

/**
 * Login schema - Email + Password
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'), // Relaxed for login (no format requirements)
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration schema - Email + Password + Confirm Password + Display Name
 */
export const registrationSchema = z
  .object({
    email: emailSchema,
    displayName: z
      .string()
      .min(3, 'Display name must be at least 3 characters')
      .max(50, 'Display name must be at most 50 characters')
      .regex(/^[a-zA-Z0-9\s]+$/, 'Display name can only contain letters, numbers, and spaces')
      .trim(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'], // Show error on confirmPassword field
  });

export type RegistrationFormData = z.infer<typeof registrationSchema>;

/**
 * Forgot Password schema - Email only
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset Password schema - New Password + Confirm Password
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Change Password schema - Current + New + Confirm
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
