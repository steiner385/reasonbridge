/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import type { Report, ReportStatus, ReportCategory, Prisma } from '@prisma/client';
import type {
  CreateReportRequest,
  UpdateReportStatusRequest,
  ReportFiltersDto,
  ReportResponse,
  ListReportsResponse,
  ReportStatsResponse,
} from '../dto/report.dto.js';
import type {
  ReportCreatedEvent,
  ReportStatusChangedEvent,
} from '@reason-bridge/event-schemas/moderation';

/**
 * ReportService handles content reporting functionality.
 *
 * Responsibilities:
 * - Create reports for flagged content
 * - Retrieve reports with filtering and pagination
 * - Update report status and resolution
 * - Generate report statistics
 * - Publish events for real-time notifications
 */
@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Create a new content report
   *
   * @param data - Report creation data
   * @param reporterId - ID of the user submitting the report
   * @returns The created report
   */
  async createReport(data: CreateReportRequest, reporterId: string): Promise<ReportResponse> {
    // Validate content type
    const validContentTypes = ['topic', 'response', 'user'];
    if (!validContentTypes.includes(data.contentType)) {
      throw new BadRequestException(`contentType must be one of: ${validContentTypes.join(', ')}`);
    }

    // Validate category
    const validCategories: ReportCategory[] = [
      'SPAM',
      'HARASSMENT',
      'MISINFORMATION',
      'HATE_SPEECH',
      'VIOLENCE',
      'COPYRIGHT',
      'OTHER',
    ];
    if (!validCategories.includes(data.category as ReportCategory)) {
      throw new BadRequestException(`category must be one of: ${validCategories.join(', ')}`);
    }

    // Check for duplicate pending report from same user on same content
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId,
        contentType: data.contentType,
        contentId: data.contentId,
        status: 'PENDING',
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already submitted a pending report for this content');
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        contentType: data.contentType,
        contentId: data.contentId,
        category: data.category as ReportCategory,
        description: data.description,
        status: 'PENDING',
      },
      include: {
        reporter: {
          select: { id: true, displayName: true },
        },
        moderator: {
          select: { id: true, displayName: true },
        },
      },
    });

    // Publish report.created event for real-time notifications
    try {
      const event: ReportCreatedEvent = {
        id: report.id,
        type: 'report.created',
        timestamp: report.createdAt.toISOString(),
        version: 1,
        payload: {
          reportId: report.id,
          reporterId: report.reporterId,
          contentType: report.contentType as 'topic' | 'response' | 'user',
          contentId: report.contentId,
          category: report.category,
          createdAt: report.createdAt.toISOString(),
        },
        metadata: {
          source: 'moderation-service',
          userId: report.reporterId,
        },
      };

      await this.queueService.publishEvent(event);
      this.logger.log(
        `Published report.created event for report ${report.id} (category: ${report.category})`,
      );
    } catch (error) {
      // Log error but don't fail the request - report is still created
      this.logger.error(
        `Failed to publish report.created event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return this.mapReportToResponse(report);
  }

  /**
   * Get a single report by ID
   *
   * @param reportId - The report ID
   * @returns The report details
   * @throws NotFoundException if report doesn't exist
   */
  async getReportById(reportId: string): Promise<ReportResponse> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: { id: true, displayName: true },
        },
        moderator: {
          select: { id: true, displayName: true },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return this.mapReportToResponse(report);
  }

  /**
   * Get reports with filtering and pagination
   *
   * @param filters - Filter options
   * @returns Paginated list of reports
   */
  async getReports(filters: ReportFiltersDto = {}): Promise<ListReportsResponse> {
    const {
      status,
      category,
      contentType,
      createdAfter,
      createdBefore,
      limit = 20,
      cursor,
    } = filters;

    const where: Prisma.ReportWhereInput = {};

    if (status) {
      where.status = status as ReportStatus;
    }

    if (category) {
      where.category = category as ReportCategory;
    }

    if (contentType) {
      where.contentType = contentType;
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = createdAfter;
      }
      if (createdBefore) {
        where.createdAt.lte = createdBefore;
      }
    }

    const [reports, totalCount] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Fetch one extra to check for next page
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        include: {
          reporter: {
            select: { id: true, displayName: true },
          },
          moderator: {
            select: { id: true, displayName: true },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    const hasNextPage = reports.length > limit;
    const items = hasNextPage ? reports.slice(0, limit) : reports;
    const lastItem = items[items.length - 1];
    const nextCursor = hasNextPage && lastItem ? lastItem.id : null;

    return {
      reports: items.map((report) => this.mapReportToResponse(report)),
      nextCursor,
      totalCount,
    };
  }

  /**
   * Get reports for a specific piece of content
   *
   * @param contentType - Type of content
   * @param contentId - ID of the content
   * @returns List of reports for the content
   */
  async getReportsByContent(contentType: string, contentId: string): Promise<ReportResponse[]> {
    const reports = await this.prisma.report.findMany({
      where: {
        contentType,
        contentId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, displayName: true },
        },
        moderator: {
          select: { id: true, displayName: true },
        },
      },
    });

    return reports.map((report) => this.mapReportToResponse(report));
  }

  /**
   * Update a report's status
   *
   * @param reportId - The report ID
   * @param data - Status update data
   * @param moderatorId - ID of the moderator making the update
   * @returns The updated report
   */
  async updateReportStatus(
    reportId: string,
    data: UpdateReportStatusRequest,
    moderatorId: string,
  ): Promise<ReportResponse> {
    // Validate status
    const validStatuses: ReportStatus[] = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(data.status as ReportStatus)) {
      throw new BadRequestException(`status must be one of: ${validStatuses.join(', ')}`);
    }

    // Check if report exists
    const existingReport = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    // Require resolution for RESOLVED or DISMISSED status
    if ((data.status === 'RESOLVED' || data.status === 'DISMISSED') && !data.resolution) {
      throw new BadRequestException('resolution is required when status is RESOLVED or DISMISSED');
    }

    const updateData: Prisma.ReportUpdateInput = {
      status: data.status as ReportStatus,
      moderator: { connect: { id: moderatorId } },
    };

    if (data.resolution) {
      updateData.resolution = data.resolution;
    }

    // Set resolvedAt for terminal statuses
    if (data.status === 'RESOLVED' || data.status === 'DISMISSED') {
      updateData.resolvedAt = new Date();
    }

    const previousStatus = existingReport.status;

    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: updateData,
      include: {
        reporter: {
          select: { id: true, displayName: true },
        },
        moderator: {
          select: { id: true, displayName: true },
        },
      },
    });

    // Publish report.status.changed event for real-time notifications
    try {
      const event: ReportStatusChangedEvent = {
        id: `${report.id}-status-${Date.now()}`,
        type: 'report.status.changed',
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          reportId: report.id,
          previousStatus: previousStatus,
          newStatus: report.status,
          moderatorId,
          resolution: data.resolution,
          changedAt: new Date().toISOString(),
        },
        metadata: {
          source: 'moderation-service',
          userId: moderatorId,
        },
      };

      await this.queueService.publishEvent(event);
      this.logger.log(
        `Published report.status.changed event for report ${report.id} (${previousStatus} -> ${report.status})`,
      );
    } catch (error) {
      // Log error but don't fail the request - status update is still saved
      this.logger.error(
        `Failed to publish report.status.changed event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return this.mapReportToResponse(report);
  }

  /**
   * Get report statistics
   *
   * @returns Statistics about reports
   */
  async getReportStats(): Promise<ReportStatsResponse> {
    // Get counts by status
    const statusCounts = await this.prisma.report.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const byStatus: Record<ReportStatus, number> = {
      PENDING: 0,
      REVIEWING: 0,
      RESOLVED: 0,
      DISMISSED: 0,
    };

    statusCounts.forEach((item) => {
      byStatus[item.status] = item._count.status;
    });

    // Get counts by category
    const categoryCounts = await this.prisma.report.groupBy({
      by: ['category'],
      _count: { category: true },
    });

    const byCategory: Record<ReportCategory, number> = {
      SPAM: 0,
      HARASSMENT: 0,
      MISINFORMATION: 0,
      HATE_SPEECH: 0,
      VIOLENCE: 0,
      COPYRIGHT: 0,
      BOT_SUSPICION: 0,
      OTHER: 0,
    };

    categoryCounts.forEach((item) => {
      byCategory[item.category] = item._count.category;
    });

    // Calculate average resolution time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const resolvedReports = await this.prisma.report.findMany({
      where: {
        status: { in: ['RESOLVED', 'DISMISSED'] },
        resolvedAt: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    let avgResolutionTimeMinutes = 0;
    if (resolvedReports.length > 0) {
      const totalMs = resolvedReports.reduce((sum, report) => {
        const resolutionMs = report.resolvedAt!.getTime() - report.createdAt.getTime();
        return sum + resolutionMs;
      }, 0);
      avgResolutionTimeMinutes = Math.floor(totalMs / resolvedReports.length / 60 / 1000);
    }

    // Get oldest pending report age
    const oldestPending = await this.prisma.report.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    let oldestPendingAge = 'PT0S';
    if (oldestPending) {
      oldestPendingAge = this.calculateDuration(oldestPending.createdAt);
    }

    return {
      byStatus,
      byCategory,
      totalPending: byStatus.PENDING + byStatus.REVIEWING,
      avgResolutionTimeMinutes,
      oldestPendingAge,
    };
  }

  /**
   * Count pending reports
   *
   * @returns Number of pending reports
   */
  async countPendingReports(): Promise<number> {
    return this.prisma.report.count({
      where: { status: 'PENDING' },
    });
  }

  /**
   * Get pending reports for the moderation queue
   *
   * @param limit - Maximum number to return
   * @param cursor - Pagination cursor
   * @returns List of pending reports
   */
  async getPendingReports(limit: number = 20, cursor?: string): Promise<ReportResponse[]> {
    const reports = await this.prisma.report.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      include: {
        reporter: {
          select: { id: true, displayName: true },
        },
        moderator: {
          select: { id: true, displayName: true },
        },
      },
    });

    return reports.map((report) => this.mapReportToResponse(report));
  }

  /**
   * Calculate ISO 8601 duration from a date to now
   */
  private calculateDuration(fromDate: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - fromDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `P${diffDays}D`;
    }
    if (diffHours > 0) {
      return `PT${diffHours}H`;
    }
    if (diffMinutes > 0) {
      return `PT${diffMinutes}M`;
    }
    return `PT${diffSeconds}S`;
  }

  /**
   * Map a Prisma Report to a ReportResponse
   */
  private mapReportToResponse(
    report: Report & {
      reporter: { id: string; displayName: string | null } | null;
      moderator: { id: string; displayName: string | null } | null;
    },
  ): ReportResponse {
    return {
      id: report.id,
      reporterId: report.reporterId,
      reporter: report.reporter
        ? { id: report.reporter.id, displayName: report.reporter.displayName }
        : null,
      contentType: report.contentType,
      contentId: report.contentId,
      category: report.category,
      description: report.description,
      status: report.status,
      moderatorId: report.moderatorId,
      moderator: report.moderator
        ? { id: report.moderator.id, displayName: report.moderator.displayName }
        : null,
      resolution: report.resolution,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
    };
  }
}
