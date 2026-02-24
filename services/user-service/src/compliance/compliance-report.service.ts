/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ComplianceAction } from '@prisma/client';

/**
 * Filter options for compliance report generation
 */
export interface ComplianceReportFilters {
  /** Start date of the reporting period */
  startDate: Date;
  /** End date of the reporting period */
  endDate: Date;
  /** Filter by specific compliance action types */
  actionTypes?: ComplianceAction[];
  /** Only include data related to minor users */
  includeMinorsOnly?: boolean;
}

/**
 * Summary statistics for a compliance report
 */
export interface ComplianceReportSummary {
  /** The period covered by this report */
  reportPeriod: { start: Date; end: Date };
  /** When this report was generated */
  generatedAt: Date;
  /** Total number of users flagged as minors */
  totalMinorUsers: number;
  /** Number of age verification actions in the period */
  ageVerifications: number;
  /** Number of parental consent requests sent */
  consentRequestsSent: number;
  /** Number of parental consents successfully verified */
  consentsVerified: number;
  /** Number of parental consents withdrawn */
  consentsWithdrawn: number;
  /** Number of data deletion requests received */
  dataDeletionRequests: number;
  /** Number of data deletions completed */
  dataDeletionsCompleted: number;
  /** Count of actions by geographic region (e.g., { US: 150, GB: 30 }) */
  regionBreakdown: Record<string, number>;
}

/**
 * Detailed compliance report with audit log entries
 */
export interface ComplianceReportDetail {
  /** Summary statistics */
  summary: ComplianceReportSummary;
  /** Individual audit log entries */
  auditLogs: Array<{
    id: string;
    userId: string;
    action: ComplianceAction;
    metadata: object;
    timestamp: Date;
  }>;
}

/**
 * Service for generating compliance reports for regulatory audits
 *
 * @remarks
 * This service provides reporting capabilities required for compliance with:
 * - COPPA (Children's Online Privacy Protection Act) - US
 * - GDPR Article 8 (Children's consent) - EU
 * - AADC (Age Appropriate Design Code) - UK
 *
 * Reports aggregate compliance audit data for specified time periods,
 * providing statistics and detailed logs for regulatory review.
 *
 * @example
 * ```typescript
 * // Generate a monthly summary report
 * const summary = await complianceReportService.generateSummary({
 *   startDate: new Date('2026-01-01'),
 *   endDate: new Date('2026-01-31'),
 * });
 *
 * // Generate detailed report with audit logs
 * const detail = await complianceReportService.generateDetailReport(
 *   { startDate, endDate, actionTypes: [ComplianceAction.CONSENT_WITHDRAWN] },
 *   50, // limit
 *   0   // offset
 * );
 * ```
 */
@Injectable()
export class ComplianceReportService {
  private readonly logger = new Logger(ComplianceReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a summary report for the specified period
   *
   * @param filters - Filter options for the report
   * @returns Summary statistics for the period
   */
  async generateSummary(filters: ComplianceReportFilters): Promise<ComplianceReportSummary> {
    this.logger.log(
      `Generating compliance summary report for ${filters.startDate.toISOString()} to ${filters.endDate.toISOString()}`,
    );

    const dateFilter = {
      timestamp: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    // Count minor users
    const totalMinorUsers = await this.prisma.user.count({
      where: filters.includeMinorsOnly ? { isMinor: true } : { isMinor: true },
    });

    // Count each action type
    const [
      ageVerifications,
      consentRequestsSent,
      consentsVerified,
      consentsWithdrawn,
      dataDeletionRequests,
      dataDeletionsCompleted,
    ] = await Promise.all([
      this.countActionsByType(ComplianceAction.AGE_VERIFIED, dateFilter),
      this.countActionsByType(ComplianceAction.CONSENT_REQUESTED, dateFilter),
      this.countActionsByType(ComplianceAction.CONSENT_VERIFIED, dateFilter),
      this.countActionsByType(ComplianceAction.CONSENT_WITHDRAWN, dateFilter),
      this.countActionsByType(ComplianceAction.DATA_DELETION_REQUESTED, dateFilter),
      this.countActionsByType(ComplianceAction.DATA_DELETION_COMPLETED, dateFilter),
    ]);

    // Get region breakdown
    const regionBreakdown = await this.getRegionBreakdown(dateFilter);

    return {
      reportPeriod: {
        start: filters.startDate,
        end: filters.endDate,
      },
      generatedAt: new Date(),
      totalMinorUsers,
      ageVerifications,
      consentRequestsSent,
      consentsVerified,
      consentsWithdrawn,
      dataDeletionRequests,
      dataDeletionsCompleted,
      regionBreakdown,
    };
  }

  /**
   * Generate a detailed report with paginated audit logs
   *
   * @param filters - Filter options for the report
   * @param limit - Maximum number of audit logs to return (default: 100)
   * @param offset - Number of audit logs to skip (default: 0)
   * @returns Detailed report with summary and audit logs
   */
  async generateDetailReport(
    filters: ComplianceReportFilters,
    limit = 100,
    offset = 0,
  ): Promise<ComplianceReportDetail> {
    this.logger.log(
      `Generating detailed compliance report for ${filters.startDate.toISOString()} to ${filters.endDate.toISOString()} (limit: ${limit}, offset: ${offset})`,
    );

    // Generate summary
    const summary = await this.generateSummary(filters);

    // Build where clause for audit logs
    const whereClause: {
      timestamp: { gte: Date; lte: Date };
      action?: { in: ComplianceAction[] };
    } = {
      timestamp: {
        gte: filters.startDate,
        lte: filters.endDate,
      },
    };

    if (filters.actionTypes && filters.actionTypes.length > 0) {
      whereClause.action = { in: filters.actionTypes };
    }

    // Fetch paginated audit logs
    const auditLogs = await this.prisma.complianceAuditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        userId: true,
        action: true,
        metadata: true,
        timestamp: true,
      },
    });

    return {
      summary,
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        metadata: (log.metadata as object) || {},
        timestamp: log.timestamp,
      })),
    };
  }

  /**
   * Count audit logs for a specific action type within a date range
   */
  private async countActionsByType(
    action: ComplianceAction,
    dateFilter: { timestamp: { gte: Date; lte: Date } },
  ): Promise<number> {
    return this.prisma.complianceAuditLog.count({
      where: {
        action,
        ...dateFilter,
      },
    });
  }

  /**
   * Get region breakdown from audit log metadata
   */
  private async getRegionBreakdown(dateFilter: {
    timestamp: { gte: Date; lte: Date };
  }): Promise<Record<string, number>> {
    // Fetch all logs in the period to extract regions from metadata
    const logs = await this.prisma.complianceAuditLog.findMany({
      where: dateFilter,
      select: {
        metadata: true,
      },
    });

    const regionCounts: Record<string, number> = {};

    for (const log of logs) {
      const metadata = log.metadata as { region?: string } | null;
      const region = metadata?.region || 'Unknown';

      if (
        region === 'Unknown' &&
        !metadata?.region &&
        metadata !== null &&
        Object.keys(metadata).length > 0
      ) {
        // Has metadata but no region field
        regionCounts['Unknown'] = (regionCounts['Unknown'] || 0) + 1;
      } else if (region === 'Unknown' && (metadata === null || !metadata?.region)) {
        regionCounts['Unknown'] = (regionCounts['Unknown'] || 0) + 1;
      } else {
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      }
    }

    return regionCounts;
  }
}
