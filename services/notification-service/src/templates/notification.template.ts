/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EmailTemplate } from './parent-digest.template.js';

/**
 * Data required to generate a notification email.
 */
export interface NotificationEmailData {
  /** Recipient's display name */
  recipientName: string;
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Optional action URL */
  actionUrl?: string;
  /** Action button text (default: "View Details") */
  actionText?: string;
  /** Notification type for styling */
  type: 'mention' | 'follow' | 'common_ground' | 'moderation' | 'general';
  /** Base URL for the application */
  baseUrl: string;
}

/**
 * Escapes HTML special characters to prevent XSS attacks.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get the accent color for the notification type.
 */
function getAccentColor(type: NotificationEmailData['type']): string {
  switch (type) {
    case 'mention':
      return '#3b82f6'; // Blue
    case 'follow':
      return '#8b5cf6'; // Purple
    case 'common_ground':
      return '#22c55e'; // Green
    case 'moderation':
      return '#f59e0b'; // Amber
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Get the icon emoji for the notification type.
 */
function getTypeEmoji(type: NotificationEmailData['type']): string {
  switch (type) {
    case 'mention':
      return '💬';
    case 'follow':
      return '👤';
    case 'common_ground':
      return '🤝';
    case 'moderation':
      return '⚠️';
    default:
      return '🔔';
  }
}

/**
 * Generates the HTML version of the notification email.
 */
function generateHtmlBody(data: NotificationEmailData): string {
  const recipientNameEscaped = escapeHtml(data.recipientName);
  const titleEscaped = escapeHtml(data.title);
  const bodyEscaped = escapeHtml(data.body);
  const accentColor = getAccentColor(data.type);
  const actionText = data.actionText || 'View Details';
  const settingsUrl = `${data.baseUrl}/settings/notifications`;

  const actionButtonHtml = data.actionUrl
    ? `<div style="margin: 24px 0;">
        <a href="${data.actionUrl}" style="display: inline-block; background-color: ${accentColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">${escapeHtml(actionText)}</a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleEscaped}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1f2937 !important; color: #f3f4f6 !important; }
      .container { background-color: #374151 !important; }
      .header { background-color: #4b5563 !important; }
      .content { background-color: #374151 !important; }
      a { color: #60a5fa !important; }
      .footer { color: #9ca3af !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; color: #111827;">
  <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div class="header" style="background-color: ${accentColor}; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">${titleEscaped}</h1>
    </div>

    <!-- Main Content -->
    <div class="content" style="background-color: white; padding: 24px; border-radius: 0 0 8px 8px;">
      <!-- Greeting -->
      <p style="font-size: 16px; margin: 0 0 16px 0;">
        Hi ${recipientNameEscaped},
      </p>

      <!-- Notification Body -->
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #374151;">
        ${bodyEscaped}
      </p>

      <!-- Action Button -->
      ${actionButtonHtml}

      <!-- Footer -->
      <div class="footer" style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #6b7280;">
        <p style="margin: 0 0 8px 0;">
          You're receiving this email because of your notification preferences on reasonBridge.
        </p>
        <p style="margin: 0;">
          <a href="${settingsUrl}" style="color: ${accentColor};">Manage email preferences</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates the plain text version of the notification email.
 */
function generateTextBody(data: NotificationEmailData): string {
  const emoji = getTypeEmoji(data.type);
  const actionText = data.actionText || 'View Details';
  const settingsUrl = `${data.baseUrl}/settings/notifications`;

  let text = `${emoji} ${data.title}

Hi ${data.recipientName},

${data.body}
`;

  if (data.actionUrl) {
    text += `
${actionText}: ${data.actionUrl}
`;
  }

  text += `
--------------------------------------------------------------------------------

You're receiving this email because of your notification preferences on reasonBridge.

Manage email preferences: ${settingsUrl}
`;

  return text;
}

/**
 * Generates a notification email with both HTML and plain text versions.
 *
 * @remarks
 * This template is used for standard notification emails including:
 * - Mentions in discussions
 * - New followers
 * - Common ground discoveries
 * - Moderation notices
 *
 * The HTML version includes:
 * - Responsive design with viewport meta tag
 * - Dark mode support via prefers-color-scheme media query
 * - Type-specific accent colors
 * - Optional action button
 *
 * All user-generated content is properly escaped to prevent XSS attacks.
 *
 * @param data - The data needed to generate the email
 * @returns An EmailTemplate with subject, html, and text properties
 *
 * @example
 * ```typescript
 * const email = generateNotificationEmail({
 *   recipientName: 'Jane',
 *   title: 'You were mentioned',
 *   body: 'Alex mentioned you in "Climate Change Discussion"',
 *   actionUrl: 'https://reasonbridge.org/topics/climate-change?response=123',
 *   actionText: 'View Response',
 *   type: 'mention',
 *   baseUrl: 'https://reasonbridge.org'
 * });
 * ```
 */
export function generateNotificationEmail(data: NotificationEmailData): EmailTemplate {
  const emoji = getTypeEmoji(data.type);

  return {
    subject: `${emoji} ${data.title}`,
    html: generateHtmlBody(data),
    text: generateTextBody(data),
  };
}
