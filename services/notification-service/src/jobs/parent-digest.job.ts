/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { generateParentDigestEmail } from '../templates/index.js';

/**
 * Data required for a child's activity summary in the parent digest.
 */
export interface ChildActivityData {
  /** Child's user ID */
  childId: string;
  /** Child's display name */
  childName: string;
  /** Parent's email address */
  parentEmail: string;
  /** Parent's name (derived from email or default) */
  parentName: string;
  /** Topics the child participated in during the week */
  topicsParticipated: Array<{ id: string; name: string; responseCount: number }>;
  /** Total number of responses posted */
  totalResponses: number;
  /** Approximate hours active (estimated from engagement) */
  approximateHoursActive: number;
  /** Number of moderation actions (safety concerns) */
  safetyConcernsCount: number;
  /** Token for authenticated parent dashboard access */
  dashboardToken: string;
}

/**
 * Scheduled job for sending weekly parent activity digest emails.
 *
 * @remarks
 * This job runs every Sunday at 9 AM UTC to send activity summaries
 * to parents of minor users with verified parental consent.
 *
 * The job:
 * 1. Finds all children with verified parental consent
 * 2. Gathers activity data for each child over the past week
 * 3. Generates personalized digest emails using the parent-digest template
 * 4. Sends emails via AWS SES
 *
 * Error handling ensures one failed email doesn't prevent others from sending.
 *
 * @example
 * ```typescript
 * // The job is triggered by cron, but can be invoked manually:
 * await parentDigestJob.handleCron();
 *
 * // Or gather activity for a specific child:
 * const activity = await parentDigestJob.gatherChildActivity('child-uuid');
 * ```
 */
@Injectable()
export class ParentDigestJob {
  private readonly logger = new Logger(ParentDigestJob.name);
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.baseUrl = process.env['APP_BASE_URL'] || 'http://localhost:5173';
  }

  /**
   * Main cron handler - runs every Sunday at 9 AM UTC
   *
   * @remarks
   * Cron pattern: `0 9 * * 0` means:
   * - Minute: 0
   * - Hour: 9 (9 AM)
   * - Day of month: * (any)
   * - Month: * (any)
   * - Day of week: 0 (Sunday)
   */
  @Cron('0 9 * * 0')
  async handleCron(): Promise<void> {
    this.logger.log('Starting weekly parent digest job...');

    try {
      const eligibleChildren = await this.getEligibleChildren();

      if (eligibleChildren.length === 0) {
        this.logger.log('Completed parent digest job - no digests to send');
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      for (const childData of eligibleChildren) {
        try {
          await this.sendDigest(childData);
          successCount++;
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to send digest for child ${childData.childId} to ${childData.parentEmail}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      this.logger.log(
        `Completed parent digest job - sent ${successCount} digest(s), ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Parent digest job failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Get all children with verified parental consent who should receive digests.
   *
   * @returns Array of activity data for each eligible child
   *
   * @remarks
   * Criteria for eligibility:
   * - User is a minor (isMinor = true)
   * - User has verified parental consent (parentConsentStatus = 'VERIFIED')
   * - User is active (status = 'ACTIVE')
   */
  async getEligibleChildren(): Promise<ChildActivityData[]> {
    // Find minor users with verified parental consent
    const minorUsers = await this.prisma.user.findMany({
      where: {
        isMinor: true,
        parentConsentStatus: 'VERIFIED',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        parentEmail: true,
        parentalConsent: {
          select: {
            parentEmail: true,
            consentToken: true,
          },
        },
      },
      take: 10000, // Limit to prevent unbounded results
    });

    // Gather activity data for each child
    const results: ChildActivityData[] = [];

    for (const user of minorUsers) {
      // Skip if no parent email available
      const parentEmail = user.parentalConsent?.parentEmail || user.parentEmail;
      if (!parentEmail) {
        this.logger.warn(`Skipping child ${user.id} - no parent email available`);
        continue;
      }

      const activity = await this.gatherChildActivity(user.id);

      results.push({
        childId: user.id,
        childName: user.displayName || 'Your child',
        parentEmail,
        parentName: this.extractParentName(parentEmail),
        topicsParticipated: activity.topicsParticipated || [],
        totalResponses: activity.totalResponses || 0,
        approximateHoursActive: activity.approximateHoursActive || 0,
        safetyConcernsCount: activity.safetyConcernsCount || 0,
        dashboardToken: user.parentalConsent?.consentToken || '',
      });
    }

    return results;
  }

  /**
   * Gather activity metrics for a specific child over the past week.
   *
   * @param childId - The user ID of the child
   * @returns Partial activity data with metrics
   */
  async gatherChildActivity(childId: string): Promise<Partial<ChildActivityData>> {
    const { weekStart, weekEnd } = this.getWeekDateRange();

    // Get responses from the child in the past week
    const responses = await this.prisma.response.findMany({
      where: {
        authorId: childId,
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        topicId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to prevent unbounded results
    });

    // Use responses.length instead of separate count query for efficiency
    const totalResponses = responses.length;

    // Group responses by topic
    const topicResponseCounts = new Map<string, number>();
    for (const response of responses) {
      const count = topicResponseCounts.get(response.topicId) || 0;
      topicResponseCounts.set(response.topicId, count + 1);
    }

    // Get topic details
    const topicIds = Array.from(topicResponseCounts.keys());
    const topics =
      topicIds.length > 0
        ? await this.prisma.discussionTopic.findMany({
            where: { id: { in: topicIds } },
            select: { id: true, title: true },
            take: 500, // Limit to prevent unbounded results
          })
        : [];

    const topicsParticipated = topics.map((topic) => ({
      id: topic.id,
      name: topic.title,
      responseCount: topicResponseCounts.get(topic.id) || 0,
    }));

    // Count safety concerns (moderation actions targeting child's content)
    const safetyConcernsCount = await this.prisma.moderationAction.count({
      where: {
        targetId: childId,
        targetType: 'USER',
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    // Estimate hours active (rough estimate: 5 minutes per response)
    const approximateHoursActive = Math.round(((totalResponses * 5) / 60) * 10) / 10;

    return {
      topicsParticipated,
      totalResponses,
      approximateHoursActive,
      safetyConcernsCount,
    };
  }

  /**
   * Send a digest email to a parent.
   *
   * @param data - The child's activity data
   */
  async sendDigest(data: ChildActivityData): Promise<void> {
    const { weekStart, weekEnd } = this.getWeekDateRange();

    const emailContent = generateParentDigestEmail({
      parentName: data.parentName,
      parentEmail: data.parentEmail,
      childName: data.childName,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      topicsParticipated: data.topicsParticipated,
      totalResponses: data.totalResponses,
      approximateHoursActive: data.approximateHoursActive,
      safetyConcernsCount: data.safetyConcernsCount,
      dashboardToken: data.dashboardToken,
      baseUrl: this.baseUrl,
    });

    await this.emailService.sendDigestEmail({
      to: data.parentEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    this.logger.log(`Sent weekly digest to ${data.parentEmail} for child ${data.childName}`);
  }

  /**
   * Get the date range for the past week.
   *
   * @returns Object with weekStart and weekEnd dates
   */
  private getWeekDateRange(): { weekStart: Date; weekEnd: Date } {
    const weekEnd = new Date();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    return { weekStart, weekEnd };
  }

  /**
   * Extract a parent name from email address.
   *
   * @param email - Parent's email address
   * @returns Extracted name or default
   */
  private extractParentName(email: string): string {
    // Try to extract name from email local part
    const localPart = email.split('@')[0];
    if (!localPart) return 'Parent';

    // Convert common formats like "john.doe" or "john_doe" to "John Doe"
    const name = localPart.replace(/[._]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

    return name || 'Parent';
  }
}
