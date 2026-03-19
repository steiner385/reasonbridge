/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Report DTOs
 * Data Transfer Objects for content report requests and responses
 */

/**
 * Valid content types that can be reported
 */
export type ReportContentType = 'topic' | 'response' | 'user';

/**
 * Report categories matching Prisma enum
 */
export type ReportCategory =
  | 'SPAM'
  | 'HARASSMENT'
  | 'MISINFORMATION'
  | 'HATE_SPEECH'
  | 'VIOLENCE'
  | 'COPYRIGHT'
  | 'OTHER';

/**
 * Report status matching Prisma enum
 */
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

/**
 * Request to create a new content report
 */
export interface CreateReportRequest {
  /** Type of content being reported */
  contentType: ReportContentType;
  /** ID of the content being reported */
  contentId: string;
  /** Category of the report */
  category: ReportCategory;
  /** Optional detailed description */
  description?: string;
}

/**
 * Request to update a report's status
 */
export interface UpdateReportStatusRequest {
  /** New status for the report */
  status: ReportStatus;
  /** Optional resolution notes (required for RESOLVED/DISMISSED) */
  resolution?: string;
}

/**
 * Query parameters for filtering reports
 */
export interface ReportFiltersDto {
  /** Filter by status */
  status?: ReportStatus;
  /** Filter by category */
  category?: ReportCategory;
  /** Filter by content type */
  contentType?: ReportContentType;
  /** Filter reports created after this date */
  createdAfter?: Date;
  /** Filter reports created before this date */
  createdBefore?: Date;
  /** Maximum number of items to return */
  limit?: number;
  /** Cursor for pagination */
  cursor?: string;
}

/**
 * Reporter information in response
 */
export interface ReporterInfo {
  id: string;
  displayName: string | null;
}

/**
 * Moderator information in response
 */
export interface ModeratorInfo {
  id: string;
  displayName: string | null;
}

/**
 * Response containing report details
 */
export interface ReportResponse {
  id: string;
  reporterId: string;
  reporter: ReporterInfo | null;
  contentType: string;
  contentId: string;
  category: string;
  description: string | null;
  status: string;
  moderatorId: string | null;
  moderator: ModeratorInfo | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/**
 * Paginated response for listing reports
 */
export interface ListReportsResponse {
  reports: ReportResponse[];
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Report statistics
 */
export interface ReportStatsResponse {
  /** Total reports by status */
  byStatus: Record<ReportStatus, number>;
  /** Total reports by category */
  byCategory: Record<ReportCategory, number>;
  /** Total pending reports */
  totalPending: number;
  /** Average resolution time in minutes (last 30 days) */
  avgResolutionTimeMinutes: number;
  /** Oldest pending report age in ISO 8601 duration */
  oldestPendingAge: string;
}
