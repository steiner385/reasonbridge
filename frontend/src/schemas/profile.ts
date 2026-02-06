import { z } from 'zod';
import { displayNameSchema, textContentSchema, urlSchema } from './common';

/**
 * Profile Form Validation Schemas
 * Used with React Hook Form + Zod for profile pages
 */

/**
 * Profile Edit schema - Display Name + Bio + Avatar URL
 */
export const profileEditSchema = z.object({
  displayName: displayNameSchema,
  bio: textContentSchema(0, 500, 'Bio').optional().or(z.literal('')),
  avatarUrl: urlSchema.optional().or(z.literal('')),
  location: z
    .string()
    .max(100, 'Location must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  website: urlSchema.optional().or(z.literal('')),
});

export type ProfileEditFormData = z.infer<typeof profileEditSchema>;

/**
 * Preferences schema - Notification and privacy settings
 */
export const preferencesSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(false),
  weeklyDigest: z.boolean().default(true),
  profileVisibility: z.enum(['public', 'private', 'followers_only']).default('public'),
  showEmail: z.boolean().default(false),
  showLocation: z.boolean().default(true),
  allowDirectMessages: z.boolean().default(true),
  allowFollowers: z.boolean().default(true),
});

export type PreferencesFormData = z.infer<typeof preferencesSchema>;

/**
 * Account Deletion schema - Confirmation text + Password
 */
export const accountDeletionSchema = z.object({
  confirmationText: z
    .string()
    .min(1, 'Please type the confirmation text')
    .refine((val) => val === 'DELETE MY ACCOUNT', {
      message: 'Please type exactly "DELETE MY ACCOUNT" to confirm',
    }),
  password: z.string().min(1, 'Password is required to delete account'),
});

export type AccountDeletionFormData = z.infer<typeof accountDeletionSchema>;
