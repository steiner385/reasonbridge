/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Email templates for the notification service.
 *
 * @remarks
 * This module exports all email template generators used by the notification service.
 * Each template generates both HTML and plain text versions for maximum compatibility.
 */

export {
  generateParentDigestEmail,
  type ParentDigestData,
  type EmailTemplate,
} from './parent-digest.template.js';

export { generateNotificationEmail, type NotificationEmailData } from './notification.template.js';
