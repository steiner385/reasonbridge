/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ComplianceAction, Prisma } from '@prisma/client';

/**
 * Metadata structure for compliance audit logs
 *
 * @remarks
 * This interface defines the expected structure for audit log metadata.
 * Fields are optional and may vary depending on the action type.
 */
export interface AuditMetadata {
  /** Geographic region (e.g., 'US', 'EU', 'GB') */
  region?: string;
  /** Age at which parental consent is required in the region */
  consentAge?: number;
  /** IP address from which the action was performed */
  ipAddress?: string;
  /** User agent string from the client */
  userAgent?: string;
  /** Parent's email address (for consent-related actions) */
  parentEmail?: string;
  /** Additional context-specific fields */
  [key: string]: unknown;
}

/**
 * Service for logging compliance-related actions for regulatory audit trails
 *
 * @remarks
 * This service provides audit logging capabilities required for compliance with:
 * - COPPA (Children's Online Privacy Protection Act) - US
 * - GDPR Article 8 (Children's consent) - EU
 * - AADC (Age Appropriate Design Code) - UK
 *
 * All actions are immutably logged with timestamps and metadata for
 * regulatory reporting and audit purposes.
 *
 * @example
 * ```typescript
 * // Log an age verification action
 * await complianceAuditService.logAction(
 *   userId,
 *   ComplianceAction.AGE_VERIFIED,
 *   { region: 'US', consentAge: 13 }
 * );
 *
 * // Get audit history for a user
 * const logs = await complianceAuditService.getAuditHistory(userId);
 *
 * // Generate compliance report for consent verifications
 * const report = await complianceAuditService.getLogsByAction(
 *   ComplianceAction.CONSENT_VERIFIED,
 *   startDate,
 *   endDate
 * );
 * ```
 */
@Injectable()
export class ComplianceAuditService {
  private readonly logger = new Logger(ComplianceAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a compliance action for audit trail
   *
   * @param userId - The ID of the user the action relates to
   * @param action - The type of compliance action being logged
   * @param metadata - Additional context about the action
   * @returns The created audit log entry
   */
  async logAction(userId: string, action: ComplianceAction, metadata: AuditMetadata = {}) {
    const log = await this.prisma.complianceAuditLog.create({
      data: {
        userId,
        action,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Compliance action logged: ${action} for user ${userId}`);
    return log;
  }

  /**
   * Get audit history for a specific user
   *
   * @param userId - The ID of the user to get audit logs for
   * @param limit - Maximum number of logs to return (default: 100)
   * @returns Array of audit log entries ordered by timestamp descending
   */
  async getAuditHistory(userId: string, limit = 100) {
    return this.prisma.complianceAuditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs by action type (for compliance reports)
   *
   * @param action - The compliance action type to filter by
   * @param startDate - Optional start date for the date range filter
   * @param endDate - Optional end date for the date range filter
   * @returns Array of audit log entries matching the criteria
   */
  async getLogsByAction(action: ComplianceAction, startDate?: Date, endDate?: Date, limit = 1000) {
    return this.prisma.complianceAuditLog.findMany({
      where: {
        action,
        ...(startDate || endDate
          ? {
              timestamp: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
