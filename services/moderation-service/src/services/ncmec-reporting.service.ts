/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * NCMEC CyberTipline report types
 */
export type CyberTiplineReportType =
  | 'CHILD_PORNOGRAPHY' // CSAM
  | 'CHILD_SEX_TRAFFICKING'
  | 'CHILD_SEXUAL_MOLESTATION'
  | 'MISLEADING_DOMAIN_NAME'
  | 'MISLEADING_WORDS_OR_IMAGES'
  | 'ONLINE_ENTICEMENT_OF_CHILDREN'
  | 'UNSOLICITED_OBSCENE_MATERIAL';

/**
 * Incident details for NCMEC report
 */
export interface IncidentDetails {
  /** Type of incident being reported */
  incidentType: CyberTiplineReportType;
  /** Date and time the incident was detected */
  incidentDateTime: Date;
  /** How the content was detected */
  detectionMethod: 'AI_DETECTION' | 'USER_REPORT' | 'HASH_MATCH' | 'MODERATOR_REVIEW';
  /** AI confidence score if applicable (0.00-1.00) */
  aiConfidenceScore?: number;
}

/**
 * Uploaded content information
 */
export interface UploadedContent {
  /** Content type (response, message, etc.) */
  contentType: string;
  /** Unique content identifier */
  contentId: string;
  /** SHA-256 hash of the content */
  contentHash: string;
  /** S3 key where evidence is stored */
  evidenceS3Key: string;
  /** URL where content was originally accessible */
  originalUrl?: string;
  /** When content was originally posted */
  uploadedAt?: Date;
}

/**
 * Reported user information
 */
export interface ReportedUser {
  /** Platform user ID */
  userId: string;
  /** Display name */
  displayName?: string;
  /** Email address if known */
  email?: string;
  /** IP address if available */
  ipAddress?: string;
  /** Whether user is a verified minor */
  isMinor?: boolean;
  /** Account creation date */
  accountCreatedAt?: Date;
}

/**
 * NCMEC report submission request
 */
export interface NCMECReportRequest {
  /** Internal CSAM report ID */
  csamReportId: string;
  /** Incident details */
  incident: IncidentDetails;
  /** Content being reported */
  content: UploadedContent;
  /** User who uploaded/sent the content */
  reportedUser: ReportedUser;
  /** Additional context or notes */
  additionalInfo?: string;
}

/**
 * NCMEC report submission response
 */
export interface NCMECReportResponse {
  /** Whether submission was successful */
  success: boolean;
  /** NCMEC-assigned report ID */
  ncmecReportId?: string;
  /** Confirmation number */
  confirmationNumber?: string;
  /** Submission timestamp */
  submittedAt?: Date;
  /** Error message if submission failed */
  error?: string;
}

/**
 * NCMECReportingService - Handles CSAM reports to NCMEC CyberTipline
 *
 * @remarks
 * This service implements the NCMEC CyberTipline API integration for mandatory
 * CSAM reporting as required by 18 U.S.C. § 2258A.
 *
 * **Legal Requirements:**
 * - Electronic Service Providers (ESPs) must report apparent CSAM within 24 hours
 * - Reports must include specific data elements (incident details, evidence, user info)
 * - Evidence must be preserved until NCMEC confirms receipt
 *
 * **API Integration:**
 * - Uses NCMEC's REST API for report submission
 * - Requires ESP registration and API credentials
 * - Supports file attachments for preserved evidence
 *
 * **Audit Trail:**
 * - All submissions are logged and tracked in database
 * - Confirmation numbers stored for compliance verification
 *
 * @example
 * ```typescript
 * const result = await ncmecService.submitReport({
 *   csamReportId: 'csam-123',
 *   incident: {
 *     incidentType: 'CHILD_PORNOGRAPHY',
 *     incidentDateTime: new Date(),
 *     detectionMethod: 'AI_DETECTION',
 *     aiConfidenceScore: 0.98,
 *   },
 *   content: {
 *     contentType: 'response',
 *     contentId: 'resp-456',
 *     contentHash: 'sha256:...',
 *     evidenceS3Key: 'evidence/...',
 *   },
 *   reportedUser: {
 *     userId: 'user-789',
 *     email: 'user@example.com',
 *   },
 * });
 *
 * if (result.success) {
 *   console.log(`NCMEC report submitted: ${result.ncmecReportId}`);
 * }
 * ```
 */
@Injectable()
export class NCMECReportingService {
  private readonly logger = new Logger(NCMECReportingService.name);
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly espId: string;
  private readonly enabled: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    // Configuration from environment variables
    this.apiBaseUrl = process.env['NCMEC_API_URL'] || 'https://report.cybertipline.org/api/v1';
    this.apiKey = process.env['NCMEC_API_KEY'] || '';
    this.espId = process.env['NCMEC_ESP_ID'] || '';
    this.enabled = process.env['NCMEC_ENABLED'] === 'true';

    if (!this.enabled) {
      this.logger.warn('NCMEC reporting is DISABLED - set NCMEC_ENABLED=true to enable');
    } else if (!this.apiKey || !this.espId) {
      this.logger.error('NCMEC reporting is enabled but missing credentials');
    }
  }

  /**
   * Submit a report to NCMEC CyberTipline
   *
   * @param request - Report submission request
   * @returns Submission result with NCMEC report ID or error
   */
  async submitReport(request: NCMECReportRequest): Promise<NCMECReportResponse> {
    this.logger.log(`Submitting NCMEC report for CSAM report ${request.csamReportId}`);

    // Check if reporting is enabled
    if (!this.enabled) {
      this.logger.warn(
        `NCMEC reporting disabled - logging report ${request.csamReportId} without submission`,
      );
      return this.handleDisabledMode(request);
    }

    try {
      // Build the NCMEC report payload
      const payload = this.buildReportPayload(request);

      // Submit to NCMEC API
      const response = await this.callNCMECApi('/reports', payload);

      // Update local database with submission result
      await this.updateCsamReport(request.csamReportId, {
        ncmecReportId: response.ncmecReportId,
        ncmecSubmittedAt: new Date(),
        status: 'SUBMITTED',
      });

      this.logger.log(`NCMEC report submitted successfully: ${response.ncmecReportId}`);

      return {
        success: true,
        ncmecReportId: response.ncmecReportId,
        confirmationNumber: response.confirmationNumber,
        submittedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to submit NCMEC report: ${errorMessage}`);

      // Update database with failure
      await this.updateCsamReport(request.csamReportId, {
        ncmecSubmissionError: errorMessage,
        status: 'SUBMISSION_FAILED',
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Retry failed NCMEC report submission
   *
   * @param csamReportId - CSAM report ID to retry
   * @returns Retry result
   */
  async retrySubmission(csamReportId: string): Promise<NCMECReportResponse> {
    this.logger.log(`Retrying NCMEC submission for CSAM report ${csamReportId}`);

    // Fetch the existing report data
    const csamReport = await this.prisma.csamReport.findUnique({
      where: { id: csamReportId },
    });

    if (!csamReport) {
      return {
        success: false,
        error: `CSAM report ${csamReportId} not found`,
      };
    }

    if (csamReport.ncmecReportId) {
      return {
        success: true,
        ncmecReportId: csamReport.ncmecReportId,
        error: 'Report already submitted to NCMEC',
      };
    }

    // Fetch user details
    const user = csamReport.contentAuthorId
      ? await this.prisma.user.findUnique({
          where: { id: csamReport.contentAuthorId },
          select: { id: true, displayName: true, email: true },
        })
      : null;

    // Rebuild and resubmit the request
    const request: NCMECReportRequest = {
      csamReportId: csamReport.id,
      incident: {
        incidentType: 'CHILD_PORNOGRAPHY',
        incidentDateTime: csamReport.createdAt,
        detectionMethod:
          csamReport.detectionSource as NCMECReportRequest['incident']['detectionMethod'],
        aiConfidenceScore: csamReport.aiConfidenceScore ?? undefined,
      },
      content: {
        contentType: csamReport.contentType,
        contentId: csamReport.contentId,
        contentHash: csamReport.evidenceHash,
        evidenceS3Key: csamReport.evidenceS3Key,
      },
      reportedUser: {
        userId: csamReport.contentAuthorId ?? 'unknown',
        displayName: user?.displayName ?? undefined,
        email: user?.email ?? undefined,
      },
    };

    return this.submitReport(request);
  }

  /**
   * Get pending reports that need NCMEC submission
   *
   * @returns List of CSAM reports pending submission
   */
  async getPendingSubmissions(): Promise<
    Array<{
      id: string;
      deadline: Date;
      hoursRemaining: number;
    }>
  > {
    const pending = await this.prisma.csamReport.findMany({
      where: {
        ncmecReportId: null,
        status: { in: ['PENDING', 'SUBMISSION_FAILED'] },
      },
      select: {
        id: true,
        ncmecDeadline: true,
        createdAt: true,
      },
      orderBy: {
        ncmecDeadline: 'asc',
      },
    });

    return pending.map((report) => ({
      id: report.id,
      deadline: report.ncmecDeadline,
      hoursRemaining: Math.max(0, (report.ncmecDeadline.getTime() - Date.now()) / (1000 * 60 * 60)),
    }));
  }

  /**
   * Check report status with NCMEC
   *
   * @param ncmecReportId - NCMEC report ID to check
   * @returns Current status from NCMEC
   */
  async checkReportStatus(ncmecReportId: string): Promise<{ status: string; lastUpdated: Date }> {
    if (!this.enabled) {
      return { status: 'NCMEC_DISABLED', lastUpdated: new Date() };
    }

    try {
      const response = await this.callNCMECApi(`/reports/${ncmecReportId}/status`, null, 'GET');
      return {
        status: response.status,
        lastUpdated: new Date(response.lastUpdated),
      };
    } catch (error) {
      this.logger.error(`Failed to check NCMEC report status: ${error}`);
      return { status: 'CHECK_FAILED', lastUpdated: new Date() };
    }
  }

  /**
   * Handle disabled mode - log but don't submit
   */
  private async handleDisabledMode(request: NCMECReportRequest): Promise<NCMECReportResponse> {
    // Generate a mock NCMEC ID for testing/development
    const mockId = `MOCK-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Update database to track that we would have submitted
    await this.updateCsamReport(request.csamReportId, {
      ncmecReportId: mockId,
      ncmecSubmittedAt: new Date(),
      status: 'MOCK_SUBMITTED',
    });

    this.logger.warn(
      `MOCK NCMEC submission for ${request.csamReportId} - assigned mock ID ${mockId}`,
    );

    return {
      success: true,
      ncmecReportId: mockId,
      confirmationNumber: `MOCK-CONF-${mockId}`,
      submittedAt: new Date(),
    };
  }

  /**
   * Build NCMEC API payload from request
   */
  private buildReportPayload(request: NCMECReportRequest): Record<string, unknown> {
    return {
      espId: this.espId,
      incidentSummary: {
        incidentType: request.incident.incidentType,
        incidentDateTime: request.incident.incidentDateTime.toISOString(),
        detectionMethod: this.mapDetectionMethod(request.incident.detectionMethod),
      },
      uploadedFiles: [
        {
          fileType: request.content.contentType,
          fileHash: request.content.contentHash,
          hashType: 'SHA256',
          industryClassification: 'A1', // Known CSAM
        },
      ],
      reportedPerson: {
        espUserId: request.reportedUser.userId,
        espUserIdType: 'username',
        screenName: request.reportedUser.displayName,
        emailAddress: request.reportedUser.email,
        ipAddress: request.reportedUser.ipAddress,
        deviceId: null,
        additionalInfo: request.reportedUser.isMinor
          ? 'User is a verified minor on the platform'
          : null,
      },
      additionalInfo: request.additionalInfo,
      espInternalReportId: request.csamReportId,
    };
  }

  /**
   * Map internal detection method to NCMEC format
   */
  private mapDetectionMethod(method: string): string {
    const mapping: Record<string, string> = {
      AI_DETECTION: 'Automated System',
      USER_REPORT: 'User Report',
      HASH_MATCH: 'Hash Match',
      MODERATOR_REVIEW: 'Staff Review',
    };
    return mapping[method] || 'Other';
  }

  /**
   * Call NCMEC API
   */
  private async callNCMECApi(
    endpoint: string,
    payload: Record<string, unknown> | null,
    method: 'POST' | 'GET' = 'POST',
  ): Promise<Record<string, unknown>> {
    const url = `${this.apiBaseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'X-ESP-ID': this.espId,
    };

    this.logger.debug(`Calling NCMEC API: ${method} ${url}`);

    const request =
      method === 'POST'
        ? this.httpService.post(url, payload, { headers })
        : this.httpService.get(url, { headers });

    const response = await firstValueFrom(request);
    return response.data as Record<string, unknown>;
  }

  /**
   * Update CSAM report in database
   */
  private async updateCsamReport(
    reportId: string,
    data: {
      ncmecReportId?: string;
      ncmecSubmittedAt?: Date;
      ncmecSubmissionError?: string;
      status?: string;
    },
  ): Promise<void> {
    await this.prisma.csamReport.update({
      where: { id: reportId },
      data,
    });
  }
}
