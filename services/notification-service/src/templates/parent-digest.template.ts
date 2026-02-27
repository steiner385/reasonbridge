/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Data required to generate a parent activity digest email.
 */
export interface ParentDigestData {
  /** Parent's display name */
  parentName: string;
  /** Parent's email address */
  parentEmail: string;
  /** Child's display name */
  childName: string;
  /** Start date of the reporting week */
  weekStartDate: Date;
  /** End date of the reporting week */
  weekEndDate: Date;
  /** Topics the child participated in during the week */
  topicsParticipated: Array<{ id: string; name: string; responseCount: number }>;
  /** Total number of responses posted by the child */
  totalResponses: number;
  /** Approximate hours the child was active */
  approximateHoursActive: number;
  /** Number of safety concerns flagged during the week */
  safetyConcernsCount: number;
  /** Token for authenticated access to parent dashboard */
  dashboardToken: string;
  /** Base URL for the application */
  baseUrl: string;
}

/**
 * Structured email template output.
 */
export interface EmailTemplate {
  /** Email subject line */
  subject: string;
  /** HTML version of the email body */
  html: string;
  /** Plain text version of the email body */
  text: string;
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
 * Formats a date as "Mon DD" (e.g., "Feb 15").
 * Uses UTC methods for consistent behavior across timezones.
 */
function formatShortDate(date: Date): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/**
 * Formats a date range as "Mon DD - Mon DD, YYYY" (e.g., "Feb 15 - Feb 22, 2026").
 * Uses UTC methods for consistent behavior across timezones.
 */
function formatDateRange(startDate: Date, endDate: Date): string {
  const startStr = formatShortDate(startDate);
  const endStr = formatShortDate(endDate);
  const year = endDate.getUTCFullYear();
  return `${startStr} - ${endStr}, ${year}`;
}

/**
 * Returns singular or plural form based on count.
 */
function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Generates the HTML version of the parent digest email.
 */
function generateHtmlBody(data: ParentDigestData): string {
  const parentNameEscaped = escapeHtml(data.parentName);
  const childNameEscaped = escapeHtml(data.childName);
  const dateRange = formatDateRange(data.weekStartDate, data.weekEndDate);

  const dashboardUrl = `${data.baseUrl}/parent/dashboard?token=${data.dashboardToken}`;
  const settingsUrl = `${data.baseUrl}/parent/settings?token=${data.dashboardToken}`;

  const topicCount = data.topicsParticipated.length;
  const responseCount = data.totalResponses;
  const hoursActive = data.approximateHoursActive;

  const safetyStatusHtml =
    data.safetyConcernsCount === 0
      ? `<p style="color: #22c55e; margin: 8px 0;">All clear - no safety concerns this week!</p>`
      : `<p style="color: #f59e0b; margin: 8px 0;">${data.safetyConcernsCount} ${pluralize(data.safetyConcernsCount, 'concern')} ${pluralize(data.safetyConcernsCount, 'was', 'were')} reviewed by our moderation team.</p>`;

  const topicsListHtml =
    topicCount === 0
      ? `<p style="color: #6b7280; margin: 8px 0;">No topics participated in this week.</p>`
      : `<ul style="margin: 8px 0; padding-left: 20px;">
        ${data.topicsParticipated
          .map(
            (topic) =>
              `<li style="margin: 4px 0;">${escapeHtml(topic.name)} (${topic.responseCount} ${pluralize(topic.responseCount, 'response')})</li>`,
          )
          .join('\n        ')}
      </ul>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Activity Summary for ${childNameEscaped}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1f2937 !important; color: #f3f4f6 !important; }
      .container { background-color: #374151 !important; }
      .header { background-color: #4b5563 !important; }
      .section { background-color: #374151 !important; border-color: #4b5563 !important; }
      a { color: #60a5fa !important; }
      .footer { color: #9ca3af !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; color: #111827;">
  <div class="container" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div class="header" style="background-color: #3b82f6; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Weekly Activity Summary</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${dateRange}</p>
    </div>

    <!-- Main Content -->
    <div style="background-color: white; padding: 24px; border-radius: 0 0 8px 8px;">
      <!-- Greeting -->
      <p style="font-size: 16px; margin: 0 0 20px 0;">
        Hi ${parentNameEscaped}, here's ${childNameEscaped}'s activity summary for the week.
      </p>

      <!-- Activity Summary Section -->
      <div class="section" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #374151;">Activity Summary</h2>

        <div style="display: grid; gap: 12px;">
          <div>
            <strong>Topics Participated:</strong> ${topicCount} ${pluralize(topicCount, 'topic')}
            ${topicsListHtml}
          </div>

          <div>
            <strong>Responses Posted:</strong> ${responseCount} ${pluralize(responseCount, 'response')}
          </div>

          <div>
            <strong>Time Active:</strong> ${hoursActive} ${pluralize(hoursActive, 'hour')} (approximate)
          </div>
        </div>
      </div>

      <!-- Safety Status Section -->
      <div class="section" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #374151;">Safety Status</h2>
        ${safetyStatusHtml}
      </div>

      <!-- Links Section -->
      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 12px 0;">
          <a href="${dashboardUrl}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">View Full Dashboard</a>
        </p>
        <p style="margin: 0;">
          <a href="${settingsUrl}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Manage Settings</a>
        </p>
      </div>

      <!-- Footer -->
      <div class="footer" style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px; color: #6b7280;">
        <p style="margin: 0 0 8px 0;">
          You're receiving this email because you provided parental consent for ${childNameEscaped}'s account on reasonBridge.
        </p>
        <p style="margin: 0;">
          To unsubscribe or change your email preferences, <a href="${settingsUrl}" style="color: #3b82f6;">manage your settings</a>.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates the plain text version of the parent digest email.
 */
function generateTextBody(data: ParentDigestData): string {
  const dateRange = formatDateRange(data.weekStartDate, data.weekEndDate);
  const dashboardUrl = `${data.baseUrl}/parent/dashboard?token=${data.dashboardToken}`;
  const settingsUrl = `${data.baseUrl}/parent/settings?token=${data.dashboardToken}`;

  const topicCount = data.topicsParticipated.length;
  const responseCount = data.totalResponses;
  const hoursActive = data.approximateHoursActive;

  const safetyStatus =
    data.safetyConcernsCount === 0
      ? 'All clear - no safety concerns this week!'
      : `${data.safetyConcernsCount} ${pluralize(data.safetyConcernsCount, 'concern')} ${pluralize(data.safetyConcernsCount, 'was', 'were')} reviewed by our moderation team.`;

  const topicsList =
    topicCount === 0
      ? '  No topics participated in this week.'
      : data.topicsParticipated
          .map(
            (topic) =>
              `  - ${topic.name} (${topic.responseCount} ${pluralize(topic.responseCount, 'response')})`,
          )
          .join('\n');

  return `Weekly Activity Summary for ${data.childName}
${dateRange}

Hi ${data.parentName}, here's ${data.childName}'s activity summary for the week.

================================================================================
Activity Summary
================================================================================

Topics Participated: ${topicCount} ${pluralize(topicCount, 'topic')}
${topicsList}

Responses Posted: ${responseCount} ${pluralize(responseCount, 'response')}

Time Active: ${hoursActive} ${pluralize(hoursActive, 'hour')} (approximate)

================================================================================
Safety Status
================================================================================

${safetyStatus}

================================================================================
Links
================================================================================

View Full Dashboard: ${dashboardUrl}

Manage Settings: ${settingsUrl}

--------------------------------------------------------------------------------

You're receiving this email because you provided parental consent for ${data.childName}'s account on reasonBridge.

To unsubscribe or change your email preferences, visit your settings at:
${settingsUrl}
`;
}

/**
 * Generates a parent activity digest email with both HTML and plain text versions.
 *
 * @remarks
 * This template is used to send weekly activity summaries to parents of child users.
 * It includes:
 * - Activity metrics (topics, responses, time active)
 * - Safety status (concerns flagged by moderation)
 * - Links to the parent dashboard and settings
 * - Information about why they're receiving the email
 *
 * The HTML version includes:
 * - Responsive design with viewport meta tag
 * - Dark mode support via prefers-color-scheme media query
 * - Clean, accessible styling
 *
 * All user-generated content is properly escaped to prevent XSS attacks.
 *
 * @param data - The data needed to generate the email
 * @returns An EmailTemplate with subject, html, and text properties
 *
 * @example
 * ```typescript
 * const email = generateParentDigestEmail({
 *   parentName: 'Jane Doe',
 *   parentEmail: 'jane@example.com',
 *   childName: 'Alex',
 *   weekStartDate: new Date('2026-02-15'),
 *   weekEndDate: new Date('2026-02-22'),
 *   topicsParticipated: [
 *     { id: 'topic-1', name: 'Climate Change', responseCount: 3 }
 *   ],
 *   totalResponses: 3,
 *   approximateHoursActive: 1.5,
 *   safetyConcernsCount: 0,
 *   dashboardToken: 'abc123',
 *   baseUrl: 'https://reasonbridge.org'
 * });
 * console.log(email.subject); // "Weekly Activity Summary for Alex"
 * ```
 */
export function generateParentDigestEmail(data: ParentDigestData): EmailTemplate {
  // Escape child name for subject line (strip HTML tags for plain text subject)
  const safeChildName = escapeHtml(data.childName).replace(/&[^;]+;/g, '');

  return {
    subject: `Weekly Activity Summary for ${safeChildName}`,
    html: generateHtmlBody(data),
    text: generateTextBody(data),
  };
}
