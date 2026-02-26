/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ComplianceReportService,
  type ComplianceReportFilters,
} from './compliance-report.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AdminGuard } from './guards/admin.guard.js';
import {
  ComplianceReportQueryDto,
  ComplianceReportSummaryResponseDto,
  ComplianceReportDetailResponseDto,
} from './dto/compliance-report.dto.js';

/**
 * Controller for compliance reporting endpoints
 *
 * @remarks
 * Provides endpoints for generating compliance reports required for regulatory audits.
 * All endpoints are restricted to admin users only.
 *
 * These reports support compliance with:
 * - COPPA (Children's Online Privacy Protection Act) - US
 * - GDPR Article 8 (Children's consent) - EU
 * - AADC (Age Appropriate Design Code) - UK
 *
 * @example
 * ```typescript
 * // Get summary report
 * GET /compliance/report/summary?startDate=2026-01-01&endDate=2026-01-31
 *
 * // Get detailed report with audit logs
 * GET /compliance/report/detail?startDate=2026-01-01&endDate=2026-01-31&limit=50&offset=0
 * ```
 */
@Controller('compliance')
export class ComplianceController {
  private readonly logger = new Logger(ComplianceController.name);

  constructor(private readonly reportService: ComplianceReportService) {}

  /**
   * GET /compliance/report/summary
   *
   * Generate a compliance report summary for the specified period.
   * Returns aggregate counts of compliance-related actions.
   *
   * @param query - Query parameters including startDate, endDate, and optional filters
   * @returns Summary statistics for the reporting period
   *
   * @remarks
   * Requires admin authentication. The report includes:
   * - Total minor users
   * - Age verification counts
   * - Parental consent metrics
   * - Data deletion statistics
   * - Geographic region breakdown
   */
  @Get('report/summary')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async getReportSummary(
    @Query() query: ComplianceReportQueryDto,
  ): Promise<ComplianceReportSummaryResponseDto> {
    this.logger.log(`Generating compliance summary report: ${query.startDate} to ${query.endDate}`);

    this.validateDateRange(query.startDate, query.endDate);

    const filters = this.buildFilters(query);
    const summary = await this.reportService.generateSummary(filters);

    return {
      reportPeriod: {
        start: summary.reportPeriod.start.toISOString(),
        end: summary.reportPeriod.end.toISOString(),
      },
      generatedAt: summary.generatedAt.toISOString(),
      totalMinorUsers: summary.totalMinorUsers,
      ageVerifications: summary.ageVerifications,
      consentRequestsSent: summary.consentRequestsSent,
      consentsVerified: summary.consentsVerified,
      consentsWithdrawn: summary.consentsWithdrawn,
      dataDeletionRequests: summary.dataDeletionRequests,
      dataDeletionsCompleted: summary.dataDeletionsCompleted,
      regionBreakdown: summary.regionBreakdown,
    };
  }

  /**
   * GET /compliance/report/detail
   *
   * Generate a detailed compliance report with paginated audit logs.
   * Returns both summary statistics and individual audit log entries.
   *
   * @param query - Query parameters including dates, filters, and pagination
   * @returns Detailed report with summary and audit log entries
   *
   * @remarks
   * Requires admin authentication. Supports filtering by:
   * - Date range (required)
   * - Action types (optional)
   * - Pagination via limit/offset
   */
  @Get('report/detail')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async getReportDetail(
    @Query() query: ComplianceReportQueryDto,
  ): Promise<ComplianceReportDetailResponseDto> {
    this.logger.log(
      `Generating detailed compliance report: ${query.startDate} to ${query.endDate} (limit: ${query.limit || 100}, offset: ${query.offset || 0})`,
    );

    this.validateDateRange(query.startDate, query.endDate);

    const filters = this.buildFilters(query);
    const detail = await this.reportService.generateDetailReport(
      filters,
      query.limit,
      query.offset,
    );

    return {
      summary: {
        reportPeriod: {
          start: detail.summary.reportPeriod.start.toISOString(),
          end: detail.summary.reportPeriod.end.toISOString(),
        },
        generatedAt: detail.summary.generatedAt.toISOString(),
        totalMinorUsers: detail.summary.totalMinorUsers,
        ageVerifications: detail.summary.ageVerifications,
        consentRequestsSent: detail.summary.consentRequestsSent,
        consentsVerified: detail.summary.consentsVerified,
        consentsWithdrawn: detail.summary.consentsWithdrawn,
        dataDeletionRequests: detail.summary.dataDeletionRequests,
        dataDeletionsCompleted: detail.summary.dataDeletionsCompleted,
        regionBreakdown: detail.summary.regionBreakdown,
      },
      auditLogs: detail.auditLogs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        metadata: log.metadata,
        timestamp: log.timestamp.toISOString(),
      })),
    };
  }

  /**
   * Validate that the date range is valid
   */
  private validateDateRange(startDateStr: string, endDateStr: string): void {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid startDate format');
    }

    if (isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid endDate format');
    }

    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }

    // Limit report range to 1 year to prevent expensive queries
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > oneYear) {
      throw new BadRequestException('Report range cannot exceed 1 year');
    }
  }

  /**
   * Build filters from query parameters
   */
  private buildFilters(query: ComplianceReportQueryDto): ComplianceReportFilters {
    return {
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
      actionTypes: query.actionTypes,
      includeMinorsOnly: query.includeMinorsOnly,
    };
  }
}
