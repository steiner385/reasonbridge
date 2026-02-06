/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { textContentSchema } from './common';

/**
 * Discussion Form Validation Schemas
 * Used with React Hook Form + Zod for topic and response forms
 */

/**
 * Topic Creation schema - Title + Description + Tags
 */
export const topicCreationSchema = z.object({
  title: textContentSchema(10, 200, 'Title'),
  description: textContentSchema(50, 5000, 'Description'),
  tags: z
    .array(
      z
        .string()
        .min(2, 'Tag must be at least 2 characters')
        .max(30, 'Tag must be at most 30 characters')
        .regex(/^[a-zA-Z0-9-]+$/, 'Tags can only contain letters, numbers, and hyphens'),
    )
    .min(1, 'At least one tag is required')
    .max(5, 'Maximum 5 tags allowed'),
  initialStance: z.enum(['for', 'against', 'neutral']).optional(),
});

export type TopicCreationFormData = z.infer<typeof topicCreationSchema>;

/**
 * Response Creation schema - Content + Stance
 */
export const responseCreationSchema = z.object({
  content: textContentSchema(20, 5000, 'Response'),
  stance: z.enum(['for', 'against', 'neutral']),
  parentResponseId: z.string().uuid().optional(), // For threaded responses
});

export type ResponseCreationFormData = z.infer<typeof responseCreationSchema>;

/**
 * Comment Creation schema - Lightweight comments on responses
 */
export const commentCreationSchema = z.object({
  content: textContentSchema(5, 500, 'Comment'),
  responseId: z.string().uuid(),
});

export type CommentCreationFormData = z.infer<typeof commentCreationSchema>;

/**
 * Topic Edit schema - Title + Description (no tags update)
 */
export const topicEditSchema = z.object({
  title: textContentSchema(10, 200, 'Title'),
  description: textContentSchema(50, 5000, 'Description'),
});

export type TopicEditFormData = z.infer<typeof topicEditSchema>;

/**
 * Response Edit schema - Content only (stance cannot be changed)
 */
export const responseEditSchema = z.object({
  content: textContentSchema(20, 5000, 'Response'),
});

export type ResponseEditFormData = z.infer<typeof responseEditSchema>;

/**
 * Report Content schema - Reason + Details
 */
export const reportContentSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'hate_speech', 'misinformation', 'off_topic', 'other']),
  details: textContentSchema(10, 1000, 'Details'),
  contentId: z.string().uuid(),
  contentType: z.enum(['topic', 'response', 'comment']),
});

export type ReportContentFormData = z.infer<typeof reportContentSchema>;
