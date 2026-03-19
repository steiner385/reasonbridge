/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';

/**
 * Types of parent notifications
 */
export type ParentNotificationType =
  | 'SAFETY_REPORT_SUBMITTED' // Child used panic button
  | 'GROOMING_DETECTED' // Grooming pattern detected in child's interactions
  | 'CONTENT_MODERATED' // Child's content was moderated
  | 'STRANGER_CONTACT' // Potential predator contact detected
  | 'WEEKLY_DIGEST'; // Weekly activity summary

/**
 * Priority levels for parent notifications
 */
export type NotificationPriority = 'IMMEDIATE' | 'URGENT' | 'HIGH' | 'NORMAL';

/**
 * Notification request data
 */
export interface ParentNotificationRequest {
  /** Child user ID */
  childId: string;
  /** Type of notification */
  type: ParentNotificationType;
  /** Notification priority */
  priority: NotificationPriority;
  /** Short title for the notification */
  title: string;
  /** Detailed message body */
  message: string;
  /** Additional context data */
  context?: {
    /** Related content ID */
    contentId?: string;
    /** Related topic ID */
    topicId?: string;
    /** Topic title */
    topicTitle?: string;
    /** Safety report reason if applicable */
    safetyReason?: string;
    /** Recommended action for parent */
    recommendedAction?: string;
  };
}

/**
 * Parent notification result
 */
export interface ParentNotificationResult {
  /** Whether notification was sent successfully */
  success: boolean;
  /** Notification ID */
  notificationId?: string;
  /** Delivery method used */
  deliveryMethod?: 'email' | 'push' | 'sms';
  /** Error message if failed */
  error?: string;
}

/**
 * Parent contact information
 */
interface ParentContact {
  email: string | null;
  phone: string | null;
  name: string;
  notificationPreferences: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
  };
}

/**
 * ParentNotificationService - Real-time notifications to parents of minor users
 *
 * @remarks
 * This service handles urgent and real-time notifications to parents when:
 * - Their child submits a safety report (panic button)
 * - Grooming patterns are detected in their child's interactions
 * - Their child's content is moderated
 * - Potential predator contact is detected
 *
 * **Notification Priorities:**
 * - IMMEDIATE: Sent right away (grooming, stranger contact)
 * - URGENT: Sent within minutes (safety reports)
 * - HIGH: Sent within the hour (content moderation)
 * - NORMAL: Batched with daily/weekly digest
 *
 * **Delivery Methods:**
 * - Email (primary)
 * - Push notification (future)
 * - SMS (future, for IMMEDIATE priority only)
 *
 * @example
 * ```typescript
 * // Notify parent about safety report
 * await parentNotificationService.notifyParent({
 *   childId: 'child-123',
 *   type: 'SAFETY_REPORT_SUBMITTED',
 *   priority: 'URGENT',
 *   title: 'Safety Report from Your Child',
 *   message: 'Your child used the safety button to report feeling uncomfortable.',
 *   context: {
 *     safetyReason: 'UNCOMFORTABLE',
 *     recommendedAction: 'Please check in with your child when you have a moment.',
 *   },
 * });
 * ```
 */
@Injectable()
export class ParentNotificationService {
  private readonly logger = new Logger(ParentNotificationService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.baseUrl = process.env['APP_BASE_URL'] || 'http://localhost:5173';
  }

  /**
   * Send a notification to a child's parent
   *
   * @param request - Notification request details
   * @returns Result of the notification attempt
   */
  async notifyParent(request: ParentNotificationRequest): Promise<ParentNotificationResult> {
    this.logger.log(
      `Sending ${request.type} notification (${request.priority}) for child ${request.childId}`,
    );

    try {
      // Get parent contact information
      const parentContact = await this.getParentContact(request.childId);

      if (!parentContact) {
        this.logger.warn(
          `No parent contact found for child ${request.childId}, skipping notification`,
        );
        return {
          success: false,
          error: 'No parent contact information available',
        };
      }

      // Generate notification ID
      const notificationId = this.generateNotificationId();

      // Log the notification to database
      await this.logNotification(notificationId, request, parentContact);

      // Send via appropriate channel based on priority and preferences
      const deliveryResult = await this.deliverNotification(notificationId, request, parentContact);

      return {
        success: deliveryResult.success,
        notificationId,
        deliveryMethod: deliveryResult.method,
        error: deliveryResult.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send parent notification: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Notify parent about a safety report submission
   */
  async notifySafetyReport(
    childId: string,
    reason: string,
    additionalInfo?: string,
  ): Promise<ParentNotificationResult> {
    const reasonMessages: Record<string, string> = {
      UNCOMFORTABLE: 'Your child reported feeling uncomfortable while using ReasonBridge.',
      SCARY_CONTENT: 'Your child encountered content that made them feel scared.',
      STRANGER_CONTACT: 'Your child reported unwanted contact from someone they do not know.',
      PERSONAL_QUESTIONS: 'Your child reported being asked personal questions by another user.',
      OTHER: 'Your child submitted a safety report.',
    };

    const message =
      reasonMessages[reason] ?? reasonMessages['OTHER'] ?? 'Your child submitted a safety report.';
    const priority: NotificationPriority =
      reason === 'STRANGER_CONTACT' || reason === 'PERSONAL_QUESTIONS' ? 'IMMEDIATE' : 'URGENT';

    return this.notifyParent({
      childId,
      type: 'SAFETY_REPORT_SUBMITTED',
      priority,
      title: 'Safety Report from Your Child',
      message: additionalInfo ? `${message} Additional details: "${additionalInfo}"` : message,
      context: {
        safetyReason: reason,
        recommendedAction:
          priority === 'IMMEDIATE'
            ? 'We recommend having a conversation with your child as soon as possible.'
            : 'Please check in with your child when you have a moment.',
      },
    });
  }

  /**
   * Notify parent about grooming detection
   */
  async notifyGroomingDetected(
    childId: string,
    patternType: string,
    confidence: number,
  ): Promise<ParentNotificationResult> {
    return this.notifyParent({
      childId,
      type: 'GROOMING_DETECTED',
      priority: 'IMMEDIATE',
      title: 'Safety Alert: Concerning Interaction Detected',
      message:
        'Our safety systems have detected a potentially concerning interaction pattern ' +
        "involving your child's account. Our moderation team is reviewing this, but we " +
        'wanted to alert you right away.',
      context: {
        recommendedAction:
          'Please have a conversation with your child about their recent interactions. ' +
          'If you have concerns, you can review their activity in the parent dashboard or contact us directly.',
      },
    });
  }

  /**
   * Notify parent about content moderation
   */
  async notifyContentModerated(
    childId: string,
    contentId: string,
    actionType: string,
    topicId?: string,
    topicTitle?: string,
  ): Promise<ParentNotificationResult> {
    const actionMessages: Record<string, string> = {
      educate:
        "Your child received an educational prompt about community guidelines. This is not a warning - it's a learning opportunity.",
      warn: "Your child received a warning about content that didn't meet our guidelines.",
      hide: 'Some content from your child was hidden for review. This may be a precautionary measure.',
      remove: 'Content from your child was removed for violating community guidelines.',
    };

    const message =
      actionMessages[actionType] || "Your child's content was reviewed by our moderation team.";

    return this.notifyParent({
      childId,
      type: 'CONTENT_MODERATED',
      priority: actionType === 'educate' ? 'NORMAL' : 'HIGH',
      title: 'Content Moderation Notice',
      message,
      context: {
        contentId,
        topicId,
        topicTitle,
        recommendedAction:
          'You can review details in your parent dashboard and discuss this with your child if appropriate.',
      },
    });
  }

  /**
   * Get parent contact information for a child
   */
  private async getParentContact(childId: string): Promise<ParentContact | null> {
    const child = await this.prisma.user.findUnique({
      where: { id: childId },
      include: {
        parentalConsent: {
          select: {
            parentEmail: true,
          },
        },
      },
    });

    if (!child) {
      return null;
    }

    const email = child.parentalConsent?.parentEmail || child.parentEmail;

    if (!email) {
      return null;
    }

    return {
      email,
      phone: null, // TODO: Add parentPhone field to User model for SMS notifications
      name: this.extractParentName(email),
      notificationPreferences: {
        emailEnabled: true, // Default to email for now
        pushEnabled: false, // TODO: Implement push notifications
        smsEnabled: false, // TODO: Implement SMS for IMMEDIATE priority
      },
    };
  }

  /**
   * Deliver notification via appropriate channel
   */
  private async deliverNotification(
    notificationId: string,
    request: ParentNotificationRequest,
    contact: ParentContact,
  ): Promise<{ success: boolean; method: 'email' | 'push' | 'sms'; error?: string }> {
    // For now, email is the only delivery method
    if (contact.email && contact.notificationPreferences.emailEnabled) {
      try {
        const emailContent = this.generateEmail(request, contact.name);

        await this.emailService.sendDigestEmail({
          to: contact.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        this.logger.log(`Parent notification ${notificationId} delivered via email`);

        return { success: true, method: 'email' };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, method: 'email', error: errorMessage };
      }
    }

    return {
      success: false,
      method: 'email',
      error: 'No enabled delivery method available',
    };
  }

  /**
   * Generate email content for notification
   */
  private generateEmail(
    request: ParentNotificationRequest,
    parentName: string,
  ): { subject: string; html: string; text: string } {
    const priorityLabels: Record<NotificationPriority, string> = {
      IMMEDIATE: '[URGENT] ',
      URGENT: '[Important] ',
      HIGH: '',
      NORMAL: '',
    };

    const subject = `${priorityLabels[request.priority]}${request.title} - ReasonBridge`;

    const dashboardUrl = `${this.baseUrl}/parent/dashboard`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0d9488; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">ReasonBridge</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Keeping your child safe online</p>
        </div>

        <div style="padding: 30px; background-color: #f9fafb;">
          <p style="margin: 0 0 20px 0;">Dear ${parentName},</p>

          <div style="background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin: 0 0 15px 0;">${request.title}</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">${request.message}</p>
            ${
              request.context?.recommendedAction
                ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 15px;">
                <p style="color: #92400e; margin: 0;">
                  <strong>Recommended Action:</strong><br>
                  ${request.context.recommendedAction}
                </p>
              </div>
            `
                : ''
            }
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}"
               style="display: inline-block; background-color: #0d9488; color: white;
                      padding: 12px 30px; border-radius: 6px; text-decoration: none;
                      font-weight: bold;">
              View Parent Dashboard
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
            If you have questions or concerns, please contact our support team or visit your parent dashboard for more details.
          </p>
        </div>

        <div style="background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">You are receiving this email because you are a verified parent on ReasonBridge.</p>
          <p style="margin: 10px 0 0 0;">© ${new Date().getFullYear()} ReasonBridge. All rights reserved.</p>
        </div>
      </div>
    `;

    const text = `
Dear ${parentName},

${request.title}

${request.message}

${request.context?.recommendedAction ? `Recommended Action: ${request.context.recommendedAction}` : ''}

View your parent dashboard: ${dashboardUrl}

If you have questions or concerns, please contact our support team.

---
You are receiving this email because you are a verified parent on ReasonBridge.
© ${new Date().getFullYear()} ReasonBridge. All rights reserved.
    `.trim();

    return { subject, html, text };
  }

  /**
   * Log notification to database for tracking
   */
  private async logNotification(
    notificationId: string,
    request: ParentNotificationRequest,
    contact: ParentContact,
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          channel: 'EMAIL',
          status: 'SENT',
          recipientEmail: contact.email,
          externalId: notificationId,
          metadata: {
            childId: request.childId,
            type: request.type,
            priority: request.priority,
            title: request.title,
          },
        },
      });

      this.logger.debug(`Logged notification ${notificationId}`, {
        childId: request.childId,
        type: request.type,
        priority: request.priority,
        parentEmail: contact.email,
      });
    } catch (error) {
      // Log but don't fail the notification if logging fails
      this.logger.warn(`Failed to log notification ${notificationId}: ${error}`);
    }
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `pn-${timestamp}-${random}`;
  }

  /**
   * Extract parent name from email
   */
  private extractParentName(email: string): string {
    const localPart = email.split('@')[0];
    if (!localPart) return 'Parent';

    const name = localPart.replace(/[._]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

    return name || 'Parent';
  }
}
