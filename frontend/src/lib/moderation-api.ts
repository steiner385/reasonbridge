/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Moderation API service
 * Provides methods for interacting with the moderation service
 */

import type {
  ModerationAction,
  ModerationActionListResponse,
  AppealsListResponse,
  Appeal,
  QueueStats,
  ModerationActionStatus,
  ModerationSeverity,
  CsamReport,
  CsamReportsListResponse,
  CsamReportStatus,
  SafetyReportsStats,
} from '../types/moderation';
import { apiClient } from './api';

/**
 * Get list of moderation actions
 */
export async function getModerationActions(
  options: {
    status?: ModerationActionStatus;
    severity?: ModerationSeverity;
    /** Page size. The backend is cursor-based, not offset/page-based. */
    limit?: number;
    /** Opaque cursor (the `nextCursor` returned by a previous page). */
    cursor?: string;
  } = {},
): Promise<ModerationActionListResponse> {
  const params = new URLSearchParams();

  if (options.status) {
    params.append('status', options.status);
  }
  if (options.severity) {
    params.append('severity', options.severity);
  }
  if (options.limit) {
    params.append('limit', String(options.limit));
  }
  if (options.cursor) {
    params.append('cursor', options.cursor);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/moderation/actions?${queryString}` : '/moderation/actions';

  return apiClient.get<ModerationActionListResponse>(endpoint);
}

/**
 * Get moderation action details
 */
export async function getModerationAction(actionId: string): Promise<ModerationAction> {
  return apiClient.get<ModerationAction>(`/moderation/actions/${actionId}`);
}

/**
 * Approve a pending moderation action
 */
export async function approveModerationAction(
  actionId: string,
  modifiedReasoning?: string,
): Promise<ModerationAction> {
  return apiClient.post<ModerationAction>(
    `/moderation/actions/${actionId}/approve`,
    modifiedReasoning ? { modifiedReasoning } : undefined,
  );
}

/**
 * Reject a pending moderation action.
 *
 * The backend requires a non-empty `reason` and returns no body (204/void), so
 * callers must collect a rejection reason and must not rely on a returned
 * action (Issue #1393).
 */
export async function rejectModerationAction(actionId: string, reason: string): Promise<void> {
  await apiClient.post<void>(`/moderation/actions/${actionId}/reject`, { reason });
}

/**
 * Build a cursor-based appeal-listing query string shared by the admin and
 * self-scoped endpoints.
 */
function buildAppealQuery(options: { status?: string; limit?: number; cursor?: string }): string {
  const params = new URLSearchParams();
  if (options.status) {
    params.append('status', options.status);
  }
  if (options.limit) {
    params.append('limit', String(options.limit));
  }
  if (options.cursor) {
    params.append('cursor', options.cursor);
  }
  return params.toString();
}

/**
 * Get list of ALL appeals (moderator/admin view).
 *
 * @remarks
 * This returns every user's appeals and must only be used on admin surfaces.
 * The user-facing "your appeals" surface must use {@link getMyAppeals}, which
 * is scoped to the authenticated user (Issue #1396).
 */
export async function getAppeals(
  options: {
    status?: string;
    limit?: number;
    cursor?: string;
  } = {},
): Promise<AppealsListResponse> {
  const queryString = buildAppealQuery(options);
  const endpoint = queryString ? `/moderation/appeals?${queryString}` : '/moderation/appeals';

  return apiClient.get<AppealsListResponse>(endpoint);
}

/**
 * Get the authenticated user's own appeals.
 *
 * Scoped server-side to the JWT subject via `/moderation/appeals/me`, so it
 * cannot leak other users' appeal reasons or moderator decision reasoning
 * (Issue #1396).
 */
export async function getMyAppeals(
  options: {
    status?: string;
    limit?: number;
    cursor?: string;
  } = {},
): Promise<AppealsListResponse> {
  const queryString = buildAppealQuery(options);
  const endpoint = queryString ? `/moderation/appeals/me?${queryString}` : '/moderation/appeals/me';

  return apiClient.get<AppealsListResponse>(endpoint);
}

/**
 * Get appeal details
 */
export async function getAppeal(appealId: string): Promise<Appeal> {
  return apiClient.get<Appeal>(`/moderation/appeals/${appealId}`);
}

/**
 * Review and decide on an appeal.
 *
 * @remarks
 * The backend field is `reasoning` (not `decisionReasoning`) and it is required
 * — it must be at least DECISION_REASONING_MIN_LENGTH characters. Sending the
 * wrong field name or omitting it returns 400 and leaves the appeal PENDING
 * (Issue #1394).
 */
export async function reviewAppeal(
  appealId: string,
  decision: 'upheld' | 'denied',
  reasoning: string,
): Promise<Appeal> {
  return apiClient.post<Appeal>(`/moderation/appeals/${appealId}/review`, {
    decision,
    reasoning,
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  return apiClient.get<QueueStats>('/moderation/queue/stats');
}

/**
 * Get list of CSAM reports (restricted to authorized moderators)
 */
export async function getCsamReports(
  options: {
    status?: CsamReportStatus;
    limit?: number;
    cursor?: string;
  } = {},
): Promise<CsamReportsListResponse> {
  const params = new URLSearchParams();

  if (options.status) {
    params.append('status', options.status);
  }
  if (options.limit) {
    params.append('limit', String(options.limit));
  }
  if (options.cursor) {
    params.append('cursor', options.cursor);
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/moderation/csam-reports?${queryString}`
    : '/moderation/csam-reports';

  return apiClient.get<CsamReportsListResponse>(endpoint);
}

/**
 * Get CSAM report details
 */
export async function getCsamReport(reportId: string): Promise<CsamReport> {
  return apiClient.get<CsamReport>(`/moderation/csam-reports/${reportId}`);
}

/**
 * Update CSAM report status
 */
export async function updateCsamReportStatus(
  reportId: string,
  status: CsamReportStatus,
  internalNotes?: string,
): Promise<CsamReport> {
  return apiClient.patch<CsamReport>(`/moderation/csam-reports/${reportId}`, {
    status,
    internalNotes,
  });
}

/**
 * Submit CSAM report to NCMEC
 */
export async function submitToNcmec(reportId: string): Promise<CsamReport> {
  return apiClient.post<CsamReport>(`/moderation/csam-reports/${reportId}/submit-ncmec`, {});
}

/**
 * Get safety reports statistics
 */
export async function getSafetyReportsStats(): Promise<SafetyReportsStats> {
  return apiClient.get<SafetyReportsStats>('/moderation/csam-reports/stats');
}

/**
 * Safety report request for panic button submissions
 */
export interface SubmitSafetyReportRequest {
  reason: 'UNCOMFORTABLE' | 'SCARY_CONTENT' | 'STRANGER_CONTACT' | 'PERSONAL_QUESTIONS' | 'OTHER';
  additionalInfo?: string;
  contextUrl?: string;
  contextTopicId?: string;
  contextResponseId?: string;
}

/**
 * Safety report response from panic button submission
 */
export interface SafetyReportResponse {
  id: string;
  reporterId: string;
  reason: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: string;
  createdAt: string;
}

/**
 * Submit a safety report from the panic button
 *
 * @remarks
 * This endpoint allows minor users to report safety concerns via the
 * panic button. Reports are immediately routed to moderators with
 * appropriate priority based on the reason selected.
 *
 * @param request - Safety report data
 * @returns Created safety report details
 */
export async function submitSafetyReport(
  request: SubmitSafetyReportRequest,
): Promise<SafetyReportResponse> {
  // Include current page URL as context
  const contextUrl = typeof window !== 'undefined' ? window.location.href : undefined;

  return apiClient.post<SafetyReportResponse>('/moderation/safety-reports', {
    ...request,
    contextUrl,
  });
}
