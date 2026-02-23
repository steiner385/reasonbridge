/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import type {
  SafetyReport,
  SafetyReportReason,
  SafetyReportStatus,
  ReviewPriority,
} from '@prisma/client';
import type { SafetyReportCreatedEvent } from '@reason-bridge/event-schemas/moderation';

export interface CreateSafetyReportRequest {
  reporterId: string;
  reason: SafetyReportReason;
  additionalInfo?: string;
  contextUrl?: string;
  contextTopicId?: string;
  contextResponseId?: string;
}

export interface UpdateSafetyReportRequest {
  status?: SafetyReportStatus;
  moderatorNotes?: string;
  handledById?: string;
}

export interface SafetyReportResponse {
  id: string;
  reporterId: string;
  reason: SafetyReportReason;
  additionalInfo: string | null;
  status: SafetyReportStatus;
  priority: ReviewPriority;
  contextUrl: string | null;
  contextTopicId: string | null;
  contextResponseId: string | null;
  moderatorNotes: string | null;
  handledById: string | null;
  handledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyReportStats {
  totalPending: number;
  totalUnderReview: number;
  totalResolved: number;
  totalEscalated: number;
  byReason: Record<SafetyReportReason, number>;
  byPriority: Record<ReviewPriority, number>;
}

/**
 * SafetyReportService - Manages safety reports from minor users
 *
 * @remarks
 * Handles the lifecycle of safety reports submitted via the Panic Button:
 * - Creating reports with appropriate priority based on reason
 * - Notifying moderators of urgent reports
 * - Tracking report status through to resolution
 *
 * **Priority Assignment:**
 * - URGENT: STRANGER_CONTACT, PERSONAL_QUESTIONS (potential grooming indicators)
 * - HIGH: SCARY_CONTENT (immediate safety concern)
 * - NORMAL: UNCOMFORTABLE, OTHER (general concerns)
 */
@Injectable()
export class SafetyReportService {
  private readonly logger = new Logger(SafetyReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Determines priority based on report reason
   * Higher priority for potential grooming indicators
   */
  private determinePriority(reason: SafetyReportReason): ReviewPriority {
    switch (reason) {
      case 'STRANGER_CONTACT':
      case 'PERSONAL_QUESTIONS':
        return 'URGENT';
      case 'SCARY_CONTENT':
        return 'HIGH';
      case 'UNCOMFORTABLE':
      case 'OTHER':
      default:
        return 'NORMAL';
    }
  }

  /**
   * Creates a new safety report and publishes real-time notification event
   *
   * @remarks
   * After creating the report, publishes a safety.report.created event
   * so that moderators receive immediate real-time notifications via WebSocket.
   * URGENT and HIGH priority reports are treated as immediate alerts.
   */
  async createReport(request: CreateSafetyReportRequest): Promise<SafetyReportResponse> {
    const priority = this.determinePriority(request.reason);

    const report = await this.prisma.safetyReport.create({
      data: {
        reporterId: request.reporterId,
        reason: request.reason,
        additionalInfo: request.additionalInfo,
        contextUrl: request.contextUrl,
        contextTopicId: request.contextTopicId,
        contextResponseId: request.contextResponseId,
        priority,
        status: 'PENDING',
      },
    });

    // Publish real-time notification event for moderators
    try {
      const event: SafetyReportCreatedEvent = {
        id: report.id,
        type: 'safety.report.created',
        timestamp: report.createdAt.toISOString(),
        version: 1,
        payload: {
          reportId: report.id,
          reporterId: report.reporterId,
          reason: report.reason as
            | 'UNCOMFORTABLE'
            | 'SCARY_CONTENT'
            | 'STRANGER_CONTACT'
            | 'PERSONAL_QUESTIONS'
            | 'OTHER',
          priority: report.priority as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW',
          additionalInfo: report.additionalInfo ?? undefined,
          contextUrl: report.contextUrl ?? undefined,
          contextTopicId: report.contextTopicId ?? undefined,
          contextResponseId: report.contextResponseId ?? undefined,
          createdAt: report.createdAt.toISOString(),
        },
        metadata: {
          source: 'moderation-service',
          userId: report.reporterId,
        },
      };

      await this.queueService.publishEvent(event);
      this.logger.log(
        `Published safety.report.created event for report ${report.id} (priority: ${priority})`,
      );
    } catch (error) {
      // Log error but don't fail the request - report is still created
      this.logger.error(
        `Failed to publish safety report event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return this.mapToResponse(report);
  }

  /**
   * Gets a safety report by ID
   */
  async getReport(reportId: string): Promise<SafetyReportResponse | null> {
    const report = await this.prisma.safetyReport.findUnique({
      where: { id: reportId },
    });

    return report ? this.mapToResponse(report) : null;
  }

  /**
   * Lists safety reports with optional filters
   */
  async listReports(
    status?: SafetyReportStatus,
    priority?: ReviewPriority,
    limit: number = 20,
    cursor?: string,
  ): Promise<{ reports: SafetyReportResponse[]; nextCursor: string | null }> {
    const where: { status?: SafetyReportStatus; priority?: ReviewPriority } = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const reports = await this.prisma.safetyReport.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, -1) : reports;
    const lastItem = items.length > 0 ? items[items.length - 1] : null;
    const nextCursor = hasMore && lastItem ? lastItem.id : null;

    return {
      reports: items.map((r) => this.mapToResponse(r)),
      nextCursor,
    };
  }

  /**
   * Gets pending reports for moderator queue
   */
  async getPendingReports(limit: number = 20): Promise<SafetyReportResponse[]> {
    const reports = await this.prisma.safetyReport.findMany({
      where: {
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
      },
      take: limit,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return reports.map((r) => this.mapToResponse(r));
  }

  /**
   * Updates a safety report (e.g., status, moderator notes)
   */
  async updateReport(
    reportId: string,
    update: UpdateSafetyReportRequest,
  ): Promise<SafetyReportResponse> {
    const data: {
      status?: SafetyReportStatus;
      moderatorNotes?: string;
      handledById?: string;
      handledAt?: Date;
    } = {};

    if (update.status) data.status = update.status;
    if (update.moderatorNotes !== undefined) data.moderatorNotes = update.moderatorNotes;
    if (update.handledById) {
      data.handledById = update.handledById;
      data.handledAt = new Date();
    }

    const report = await this.prisma.safetyReport.update({
      where: { id: reportId },
      data,
    });

    return this.mapToResponse(report);
  }

  /**
   * Resolves a safety report
   */
  async resolveReport(
    reportId: string,
    handledById: string,
    notes?: string,
  ): Promise<SafetyReportResponse> {
    return this.updateReport(reportId, {
      status: 'RESOLVED',
      handledById,
      moderatorNotes: notes,
    });
  }

  /**
   * Escalates a safety report
   */
  async escalateReport(
    reportId: string,
    handledById: string,
    notes?: string,
  ): Promise<SafetyReportResponse> {
    return this.updateReport(reportId, {
      status: 'ESCALATED',
      handledById,
      moderatorNotes: notes,
    });
  }

  /**
   * Gets statistics for safety reports
   */
  async getStats(): Promise<SafetyReportStats> {
    const [statusCounts, reasonCounts, priorityCounts] = await Promise.all([
      this.prisma.safetyReport.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.safetyReport.groupBy({
        by: ['reason'],
        _count: { reason: true },
      }),
      this.prisma.safetyReport.groupBy({
        by: ['priority'],
        _count: { priority: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s) => {
      statusMap[s.status] = s._count.status;
    });

    const reasonMap: Record<string, number> = {};
    reasonCounts.forEach((r) => {
      reasonMap[r.reason] = r._count.reason;
    });

    const priorityMap: Record<string, number> = {};
    priorityCounts.forEach((p) => {
      priorityMap[p.priority] = p._count.priority;
    });

    return {
      totalPending: statusMap['PENDING'] || 0,
      totalUnderReview: statusMap['UNDER_REVIEW'] || 0,
      totalResolved: statusMap['RESOLVED'] || 0,
      totalEscalated: statusMap['ESCALATED'] || 0,
      byReason: reasonMap as Record<SafetyReportReason, number>,
      byPriority: priorityMap as Record<ReviewPriority, number>,
    };
  }

  /**
   * Gets reports by reporter ID
   */
  async getReportsByReporter(
    reporterId: string,
    limit: number = 20,
  ): Promise<SafetyReportResponse[]> {
    const reports = await this.prisma.safetyReport.findMany({
      where: { reporterId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((r) => this.mapToResponse(r));
  }

  private mapToResponse(report: SafetyReport): SafetyReportResponse {
    return {
      id: report.id,
      reporterId: report.reporterId,
      reason: report.reason,
      additionalInfo: report.additionalInfo,
      status: report.status,
      priority: report.priority,
      contextUrl: report.contextUrl,
      contextTopicId: report.contextTopicId,
      contextResponseId: report.contextResponseId,
      moderatorNotes: report.moderatorNotes,
      handledById: report.handledById,
      handledAt: report.handledAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }
}
