/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../services/email.service.js';
import { ComplianceAuditService } from './compliance-audit.service.js';
import { ParentConsentStatus, ComplianceAction } from '@prisma/client';

/**
 * Result of consent verification
 */
export interface VerifyConsentResult {
  success: boolean;
  childDisplayName?: string;
  error?: string;
}

/**
 * Consent status information
 */
export interface ConsentStatusInfo {
  status: ParentConsentStatus;
  parentEmail?: string | null;
  expiresAt?: string | null;
  verifiedAt?: string | null;
}

/**
 * Result of consent initiation
 */
export interface InitiateConsentResult {
  consentId: string;
  expiresAt: Date;
}

/**
 * Service for managing parental consent for minor users
 *
 * @remarks
 * This service handles:
 * - Initiating parental consent requests (generate token, send email)
 * - Verifying consent tokens when parents click the link
 * - Tracking consent status
 * - Consent withdrawal
 *
 * @example
 * ```typescript
 * // Initiate consent during registration
 * const result = await parentalConsentService.initiateConsent(userId, 'parent@example.com');
 *
 * // Verify consent when parent clicks link
 * const verification = await parentalConsentService.verifyConsent(token, ipAddress);
 * ```
 */
@Injectable()
export class ParentalConsentService {
  private readonly logger = new Logger(ParentalConsentService.name);
  private readonly TOKEN_EXPIRY_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: ComplianceAuditService,
  ) {}

  /**
   * Initiate the parental consent process for a minor user
   *
   * @param userId - The minor user's database ID
   * @param parentEmail - The parent/guardian's email address
   * @returns The consent record ID and expiration date
   *
   * @remarks
   * This method:
   * 1. Generates a secure URL-safe token (32 bytes, base64url encoded)
   * 2. Creates or updates the ParentalConsent record
   * 3. Updates the user's parentEmail field
   * 4. Sends the consent request email to the parent
   */
  async initiateConsent(userId: string, parentEmail: string): Promise<InitiateConsentResult> {
    this.logger.log(`Initiating parental consent for user ${userId} to ${parentEmail}`);

    // Generate secure token (URL-safe base64, 32 bytes = 43 characters)
    const consentToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Get child info for email and audit logging
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, declaredCountry: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Create or update consent record
    const consent = await this.prisma.parentalConsent.upsert({
      where: { userId },
      create: {
        userId,
        parentEmail,
        consentToken,
        tokenExpiresAt: expiresAt,
      },
      update: {
        parentEmail,
        consentToken,
        tokenExpiresAt: expiresAt,
        verifiedAt: null, // Reset if re-requesting
        withdrawnAt: null,
      },
    });

    // Update user's parent email and ensure status is PENDING
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        parentEmail,
        parentConsentStatus: ParentConsentStatus.PENDING,
      },
    });

    // Send email to parent
    await this.emailService.sendParentalConsentEmail({
      parentEmail,
      childDisplayName: user.displayName || 'your child',
      consentToken,
      expiresAt,
    });

    // Log audit action - audit failure should not fail the main operation
    try {
      await this.auditService.logAction(userId, ComplianceAction.CONSENT_REQUESTED, {
        parentEmail,
        region: user.declaredCountry,
      });
    } catch (error) {
      this.logger.error(
        `Failed to log CONSENT_REQUESTED for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(
      `Parental consent initiated for user ${userId}, expires ${expiresAt.toISOString()}`,
    );

    return { consentId: consent.id, expiresAt };
  }

  /**
   * Verify a parental consent token
   *
   * @param token - The consent token from the verification link
   * @param ipAddress - Optional IP address of the parent for audit logging
   * @returns Verification result with child's display name on success
   *
   * @remarks
   * This method:
   * 1. Looks up the consent record by token
   * 2. Validates the token hasn't been used and hasn't expired
   * 3. Marks the consent as verified
   * 4. Updates the user's parentConsentStatus to VERIFIED
   */
  async verifyConsent(token: string, ipAddress?: string): Promise<VerifyConsentResult> {
    this.logger.log(`Verifying consent token (length: ${token.length})`);

    const consent = await this.prisma.parentalConsent.findUnique({
      where: { consentToken: token },
      include: { user: { select: { id: true, displayName: true } } },
    });

    if (!consent) {
      this.logger.warn('Invalid consent token provided');
      return { success: false, error: 'Invalid consent token' };
    }

    if (consent.verifiedAt) {
      this.logger.warn(`Consent token already verified for user ${consent.userId}`);
      return { success: false, error: 'Consent has already been verified' };
    }

    if (consent.tokenExpiresAt < new Date()) {
      this.logger.warn(`Consent token expired for user ${consent.userId}`);
      return { success: false, error: 'Consent token has expired. Please request a new one.' };
    }

    // Mark consent as verified
    await this.prisma.parentalConsent.update({
      where: { id: consent.id },
      data: {
        verifiedAt: new Date(),
        ipAddress: ipAddress || null,
      },
    });

    // Update user status
    await this.prisma.user.update({
      where: { id: consent.userId },
      data: { parentConsentStatus: ParentConsentStatus.VERIFIED },
    });

    // Log audit action - audit failure should not fail the main operation
    try {
      await this.auditService.logAction(consent.userId, ComplianceAction.CONSENT_VERIFIED, {
        ipAddress,
        verifiedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to log CONSENT_VERIFIED for user ${consent.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(`Parental consent verified for user ${consent.userId}`);

    return {
      success: true,
      childDisplayName: consent.user.displayName || 'your child',
    };
  }

  /**
   * Get the consent status for a user
   *
   * @param userId - The user's database ID
   * @returns Consent status information
   */
  async getConsentStatus(userId: string): Promise<ConsentStatusInfo> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        parentConsentStatus: true,
        parentEmail: true,
        parentalConsent: {
          select: {
            tokenExpiresAt: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      status: user.parentConsentStatus,
      parentEmail: user.parentEmail,
      expiresAt: user.parentalConsent?.tokenExpiresAt?.toISOString() || null,
      verifiedAt: user.parentalConsent?.verifiedAt?.toISOString() || null,
    };
  }

  /**
   * Resend the consent email with a new token
   *
   * @param userId - The user's database ID
   * @returns The new consent ID and expiration date
   */
  async resendConsentEmail(userId: string): Promise<InitiateConsentResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { parentEmail: true },
    });

    if (!user?.parentEmail) {
      throw new NotFoundException('No parent email found for this user');
    }

    return this.initiateConsent(userId, user.parentEmail);
  }

  /**
   * Withdraw parental consent for a user
   *
   * @param userId - The user's database ID
   *
   * @remarks
   * This sets the consent status to WITHDRAWN and records the withdrawal timestamp.
   * The user's access will be restricted after withdrawal.
   */
  async withdrawConsent(userId: string): Promise<void> {
    this.logger.log(`Withdrawing parental consent for user ${userId}`);

    await this.prisma.$transaction([
      this.prisma.parentalConsent.update({
        where: { userId },
        data: { withdrawnAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { parentConsentStatus: ParentConsentStatus.WITHDRAWN },
      }),
    ]);

    // Log audit action - audit failure should not fail the main operation
    try {
      await this.auditService.logAction(userId, ComplianceAction.CONSENT_WITHDRAWN, {
        withdrawnAt: new Date().toISOString(),
        triggersDataDeletion: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to log CONSENT_WITHDRAWN for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(`Parental consent withdrawn for user ${userId}`);
  }

  /**
   * Get child's activity summary by consent token
   *
   * @param token - The consent token from the parental consent email
   * @returns Child activity summary including account info and activity stats
   *
   * @remarks
   * This allows parents to view their child's activity without needing to log in.
   * The token serves as authentication.
   */
  async getChildActivitySummary(
    token: string,
  ): Promise<import('./dto/child-activity.dto.js').ChildActivitySummaryDto> {
    const consent = await this.prisma.parentalConsent.findUnique({
      where: { consentToken: token },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            createdAt: true,
            parentConsentStatus: true,
          },
        },
      },
    });

    if (!consent) {
      throw new NotFoundException('Invalid consent token');
    }

    // Get activity statistics for the child
    const [topicsParticipated, responsesPosted] = await Promise.all([
      // Count unique topics where the child has posted responses
      this.prisma.response
        .groupBy({
          by: ['topicId'],
          where: { authorId: consent.userId },
        })
        .then((groups) => groups.length),
      // Count total responses posted by the child
      this.prisma.response.count({
        where: { authorId: consent.userId },
      }),
    ]);

    // Get last activity time from most recent response
    const lastResponse = await this.prisma.response.findFirst({
      where: { authorId: consent.userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      childDisplayName: consent.user.displayName || 'Anonymous User',
      accountCreatedAt: consent.user.createdAt.toISOString(),
      consentStatus: consent.user.parentConsentStatus as 'VERIFIED' | 'PENDING' | 'WITHDRAWN',
      consentVerifiedAt: consent.verifiedAt?.toISOString(),
      lastActivityAt: lastResponse?.createdAt?.toISOString(),
      activitySummary: {
        topicsParticipated,
        responsesPosted,
      },
    };
  }

  /**
   * Withdraw parental consent by token
   *
   * @param token - The consent token from the parental consent email
   *
   * @remarks
   * This allows parents to withdraw consent without needing to log in.
   * The token serves as authentication.
   * After withdrawal, the child's access will be restricted.
   */
  async withdrawConsentByToken(token: string): Promise<void> {
    const consent = await this.prisma.parentalConsent.findUnique({
      where: { consentToken: token },
      include: { user: { select: { id: true } } },
    });

    if (!consent) {
      throw new NotFoundException('Invalid consent token');
    }

    this.logger.log(`Withdrawing parental consent via token for user ${consent.userId}`);

    await this.prisma.$transaction([
      this.prisma.parentalConsent.update({
        where: { id: consent.id },
        data: { withdrawnAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: consent.userId },
        data: { parentConsentStatus: ParentConsentStatus.WITHDRAWN },
      }),
    ]);

    this.logger.log(`Parental consent withdrawn via token for user ${consent.userId}`);
  }
}
