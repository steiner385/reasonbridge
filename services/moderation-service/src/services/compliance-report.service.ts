/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Time period for compliance reports
 */
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

/**
 * Compliance framework identifier
 */
export type ComplianceFramework = 'COPPA' | 'GDPR_K' | 'INTERNAL' | 'ALL';

/**
 * Child safety metrics
 */
export interface ChildSafetyMetrics {
  /** Total safety reports received */
  totalSafetyReports: number;
  /** Reports by reason */
  reportsByReason: Record<string, number>;
  /** Reports by priority */
  reportsByPriority: Record<string, number>;
  /** Average resolution time in minutes */
  averageResolutionTime: number;
  /** Reports pending resolution */
  pendingReports: number;
  /** Reports escalated to law enforcement */
  escalatedToLawEnforcement: number;
}

/**
 * Content moderation metrics
 */
export interface ModerationMetrics {
  /** Total content reviewed */
  totalContentReviewed: number;
  /** Content from minor users */
  childContentReviewed: number;
  /** Grooming patterns detected */
  groomingDetections: number;
  /** Content blocked */
  contentBlocked: number;
  /** Content flagged for review */
  contentFlagged: number;
  /** False positive rate (if available) */
  falsePositiveRate?: number;
}

/**
 * NCMEC reporting metrics
 */
export interface NcmecMetrics {
  /** Total CSAM reports created */
  totalCsamReports: number;
  /** Reports submitted to NCMEC */
  submittedToNcmec: number;
  /** Reports pending submission */
  pendingSubmission: number;
  /** Average submission time in hours */
  averageSubmissionTime: number;
  /** Reports submitted within 24-hour deadline */
  withinDeadline: number;
  /** Reports that breached 24-hour deadline */
  deadlineBreaches: number;
}

/**
 * SLA compliance metrics
 */
export interface SlaMetrics {
  /** Total items processed */
  totalProcessed: number;
  /** Items processed within SLA */
  withinSla: number;
  /** Items that breached SLA */
  breachedSla: number;
  /** SLA compliance percentage */
  complianceRate: number;
  /** Breakdown by priority */
  byPriority: Record<string, { total: number; breached: number; complianceRate: number }>;
}

/**
 * User statistics for minor users
 */
export interface MinorUserStats {
  /** Total registered minors */
  totalMinors: number;
  /** New minor registrations in period */
  newRegistrations: number;
  /** Minors with verified parental consent */
  withParentalConsent: number;
  /** Minors who submitted safety reports */
  minorsWithSafetyReports: number;
  /** Minors whose content was moderated */
  minorsWithModeratedContent: number;
}

/**
 * Full compliance report structure
 */
export interface ComplianceReport {
  /** Report identifier */
  reportId: string;
  /** Report generation timestamp */
  generatedAt: Date;
  /** Period covered by the report */
  period: {
    type: ReportPeriod;
    startDate: Date;
    endDate: Date;
  };
  /** Compliance frameworks covered */
  frameworks: ComplianceFramework[];
  /** Child safety metrics */
  childSafety: ChildSafetyMetrics;
  /** Content moderation metrics */
  moderation: ModerationMetrics;
  /** NCMEC reporting metrics */
  ncmec: NcmecMetrics;
  /** SLA compliance metrics */
  sla: SlaMetrics;
  /** Minor user statistics */
  minorUsers: MinorUserStats;
  /** Summary and recommendations */
  summary: {
    overallComplianceScore: number;
    criticalIssues: string[];
    recommendations: string[];
  };
}

/**
 * ComplianceReportService - Generates regulatory compliance reports
 *
 * @remarks
 * This service generates compliance reports for child safety regulations:
 *
 * **COPPA (Children's Online Privacy Protection Act)**
 * - Parental consent tracking
 * - Data collection practices for under-13s
 * - Safety measures effectiveness
 *
 * **GDPR-K (GDPR for Children)**
 * - Age verification compliance
 * - Data processing transparency
 * - Parental rights management
 *
 * **Internal Compliance**
 * - SLA adherence for content moderation
 * - Safety report response times
 * - NCMEC reporting timeliness
 *
 * Reports can be generated for various time periods and exported
 * for regulatory audits or internal review.
 *
 * @example
 * ```typescript
 * // Generate monthly compliance report
 * const report = await complianceService.generateReport('monthly', ['COPPA', 'INTERNAL']);
 *
 * // Get specific metrics
 * const ncmecStats = await complianceService.getNcmecMetrics(startDate, endDate);
 * ```
 */
@Injectable()
export class ComplianceReportService {
  private readonly logger = new Logger(ComplianceReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a comprehensive compliance report
   *
   * @param periodType - Time period for the report
   * @param frameworks - Compliance frameworks to include (default: ALL)
   * @returns Full compliance report
   */
  async generateReport(
    periodType: ReportPeriod,
    frameworks: ComplianceFramework[] = ['ALL'],
  ): Promise<ComplianceReport> {
    this.logger.log(`Generating ${periodType} compliance report for ${frameworks.join(', ')}`);

    const { startDate, endDate } = this.calculatePeriodDates(periodType);
    const reportId = this.generateReportId();

    // Gather all metrics in parallel
    const [childSafety, moderation, ncmec, sla, minorUsers] = await Promise.all([
      this.getChildSafetyMetrics(startDate, endDate),
      this.getModerationMetrics(startDate, endDate),
      this.getNcmecMetrics(startDate, endDate),
      this.getSlaMetrics(startDate, endDate),
      this.getMinorUserStats(startDate, endDate),
    ]);

    // Generate summary and recommendations
    const summary = this.generateSummary(childSafety, moderation, ncmec, sla);

    const report: ComplianceReport = {
      reportId,
      generatedAt: new Date(),
      period: {
        type: periodType,
        startDate,
        endDate,
      },
      frameworks: frameworks.includes('ALL') ? ['COPPA', 'GDPR_K', 'INTERNAL'] : frameworks,
      childSafety,
      moderation,
      ncmec,
      sla,
      minorUsers,
      summary,
    };

    this.logger.log(`Compliance report ${reportId} generated successfully`);

    return report;
  }

  /**
   * Get child safety metrics for a period
   */
  async getChildSafetyMetrics(startDate: Date, endDate: Date): Promise<ChildSafetyMetrics> {
    const reports = await this.prisma.safetyReport.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        reason: true,
        priority: true,
        status: true,
        createdAt: true,
        handledAt: true,
      },
    });

    const reportsByReason: Record<string, number> = {};
    const reportsByPriority: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let pendingCount = 0;
    let escalatedCount = 0;

    for (const report of reports) {
      // Count by reason
      reportsByReason[report.reason] = (reportsByReason[report.reason] || 0) + 1;

      // Count by priority
      reportsByPriority[report.priority] = (reportsByPriority[report.priority] || 0) + 1;

      // Track resolution time
      if (report.handledAt) {
        const resolutionTime =
          (report.handledAt.getTime() - report.createdAt.getTime()) / (1000 * 60);
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }

      // Count status
      if (report.status === 'PENDING' || report.status === 'UNDER_REVIEW') {
        pendingCount++;
      }
      if (report.status === 'ESCALATED') {
        escalatedCount++;
      }
    }

    return {
      totalSafetyReports: reports.length,
      reportsByReason,
      reportsByPriority,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      pendingReports: pendingCount,
      escalatedToLawEnforcement: escalatedCount,
    };
  }

  /**
   * Get content moderation metrics for a period
   */
  async getModerationMetrics(startDate: Date, endDate: Date): Promise<ModerationMetrics> {
    // Get child content review queue stats
    const reviewQueue = await this.prisma.childContentReviewQueue.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        status: true,
        reviewResult: true,
        groomingDetected: true,
      },
    });

    let groomingDetections = 0;
    let contentBlocked = 0;
    let contentFlagged = 0;

    for (const item of reviewQueue) {
      if (item.groomingDetected) {
        groomingDetections++;
      }
      if (item.reviewResult === 'BLOCKED') {
        contentBlocked++;
      }
      if (item.reviewResult === 'FLAGGED' || item.status === 'PENDING') {
        contentFlagged++;
      }
    }

    // Get general moderation actions
    const moderationActions = await this.prisma.moderationAction.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    return {
      totalContentReviewed: moderationActions + reviewQueue.length,
      childContentReviewed: reviewQueue.length,
      groomingDetections,
      contentBlocked,
      contentFlagged,
    };
  }

  /**
   * Get NCMEC reporting metrics for a period
   */
  async getNcmecMetrics(startDate: Date, endDate: Date): Promise<NcmecMetrics> {
    const csamReports = await this.prisma.csamReport.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        ncmecReportId: true,
        ncmecSubmittedAt: true,
        ncmecDeadline: true,
        createdAt: true,
        status: true,
      },
    });

    let submittedCount = 0;
    let pendingCount = 0;
    let totalSubmissionTime = 0;
    let withinDeadline = 0;
    let deadlineBreaches = 0;

    for (const report of csamReports) {
      if (report.ncmecReportId && report.ncmecSubmittedAt) {
        submittedCount++;

        // Calculate submission time in hours
        const submissionTime =
          (report.ncmecSubmittedAt.getTime() - report.createdAt.getTime()) / (1000 * 60 * 60);
        totalSubmissionTime += submissionTime;

        // Check if within 24-hour deadline
        if (report.ncmecSubmittedAt <= report.ncmecDeadline) {
          withinDeadline++;
        } else {
          deadlineBreaches++;
        }
      } else {
        pendingCount++;
      }
    }

    return {
      totalCsamReports: csamReports.length,
      submittedToNcmec: submittedCount,
      pendingSubmission: pendingCount,
      averageSubmissionTime: submittedCount > 0 ? totalSubmissionTime / submittedCount : 0,
      withinDeadline,
      deadlineBreaches,
    };
  }

  /**
   * Get SLA compliance metrics for a period
   */
  async getSlaMetrics(startDate: Date, endDate: Date): Promise<SlaMetrics> {
    const reviewItems = await this.prisma.childContentReviewQueue.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      select: {
        priority: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const slaLimits: Record<string, number> = {
      URGENT: 60,
      HIGH: 240,
      NORMAL: 1440,
      LOW: 2880,
    };

    const byPriority: Record<string, { total: number; breached: number; complianceRate: number }> =
      {};
    let totalProcessed = 0;
    let withinSla = 0;
    let breachedSla = 0;

    for (const item of reviewItems) {
      if (!item.completedAt) continue;

      totalProcessed++;
      const processingTime = (item.completedAt.getTime() - item.createdAt.getTime()) / (1000 * 60);
      const slaLimit = slaLimits[item.priority] || 1440;
      const breached = processingTime > slaLimit;

      if (breached) {
        breachedSla++;
      } else {
        withinSla++;
      }

      // Track by priority
      if (!byPriority[item.priority]) {
        byPriority[item.priority] = { total: 0, breached: 0, complianceRate: 0 };
      }
      byPriority[item.priority].total++;
      if (breached) {
        byPriority[item.priority].breached++;
      }
    }

    // Calculate compliance rates
    const complianceRate = totalProcessed > 0 ? (withinSla / totalProcessed) * 100 : 100;

    for (const priority of Object.keys(byPriority)) {
      const stats = byPriority[priority];
      stats.complianceRate =
        stats.total > 0 ? ((stats.total - stats.breached) / stats.total) * 100 : 100;
    }

    return {
      totalProcessed,
      withinSla,
      breachedSla,
      complianceRate,
      byPriority,
    };
  }

  /**
   * Get minor user statistics for a period
   */
  async getMinorUserStats(startDate: Date, endDate: Date): Promise<MinorUserStats> {
    // Count all minor users
    const totalMinors = await this.prisma.user.count({
      where: {
        isMinor: true,
      },
    });

    // Count new registrations in period
    const newRegistrations = await this.prisma.user.count({
      where: {
        isMinor: true,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Count minors with parental consent
    const withParentalConsent = await this.prisma.user.count({
      where: {
        isMinor: true,
        parentalConsentVerified: true,
      },
    });

    // Count minors who submitted safety reports
    const safetyReporters = await this.prisma.safetyReport.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        reporterId: true,
      },
      distinct: ['reporterId'],
    });

    // Count minors whose content was moderated
    const moderatedMinors = await this.prisma.childContentReviewQueue.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        authorId: true,
      },
      distinct: ['authorId'],
    });

    return {
      totalMinors,
      newRegistrations,
      withParentalConsent,
      minorsWithSafetyReports: safetyReporters.length,
      minorsWithModeratedContent: moderatedMinors.length,
    };
  }

  /**
   * Generate summary and recommendations based on metrics
   */
  private generateSummary(
    childSafety: ChildSafetyMetrics,
    moderation: ModerationMetrics,
    ncmec: NcmecMetrics,
    sla: SlaMetrics,
  ): ComplianceReport['summary'] {
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Check NCMEC deadline compliance
    if (ncmec.deadlineBreaches > 0) {
      criticalIssues.push(
        `${ncmec.deadlineBreaches} NCMEC reports missed 24-hour submission deadline`,
      );
      recommendations.push('Implement automated NCMEC submission pipeline');
    }

    // Check SLA compliance
    if (sla.complianceRate < 95) {
      criticalIssues.push(
        `SLA compliance rate is ${sla.complianceRate.toFixed(1)}% (below 95% target)`,
      );
      recommendations.push('Review staffing levels for child content moderation');
    }

    // Check pending safety reports
    if (childSafety.pendingReports > 10) {
      criticalIssues.push(`${childSafety.pendingReports} safety reports pending resolution`);
      recommendations.push('Prioritize clearing safety report backlog');
    }

    // Check grooming detection rate
    if (moderation.groomingDetections > 0 && moderation.childContentReviewed > 0) {
      const groomingRate = (moderation.groomingDetections / moderation.childContentReviewed) * 100;
      if (groomingRate > 5) {
        criticalIssues.push(
          `Grooming detection rate is ${groomingRate.toFixed(1)}% - requires investigation`,
        );
      }
    }

    // Calculate overall compliance score (0-100)
    let score = 100;

    // Deduct for NCMEC deadline breaches (10 points each, max 30)
    score -= Math.min(ncmec.deadlineBreaches * 10, 30);

    // Deduct for low SLA compliance
    if (sla.complianceRate < 100) {
      score -= Math.min((100 - sla.complianceRate) * 0.5, 20);
    }

    // Deduct for pending safety reports (1 point each, max 20)
    score -= Math.min(childSafety.pendingReports, 20);

    // Add recommendations based on score
    if (score < 80) {
      recommendations.push('Schedule compliance review meeting with legal team');
    }
    if (score < 60) {
      recommendations.push('Consider engaging external compliance audit');
    }

    return {
      overallComplianceScore: Math.max(0, Math.round(score)),
      criticalIssues,
      recommendations,
    };
  }

  /**
   * Calculate start and end dates for a period
   */
  private calculatePeriodDates(periodType: ReportPeriod): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (periodType) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'annual':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `compliance-${timestamp}-${random}`;
  }
}
