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
} from '../types/moderation';
import { apiClient } from './api';

/**
 * Get list of moderation actions
 */
export async function getModerationActions(
  options: {
    status?: ModerationActionStatus;
    severity?: ModerationSeverity;
    pageSize?: number;
    page?: number;
  } = {},
): Promise<ModerationActionListResponse> {
  const params = new URLSearchParams();

  if (options.status) {
    params.append('status', options.status);
  }
  if (options.severity) {
    params.append('severity', options.severity);
  }
  if (options.pageSize) {
    params.append('pageSize', String(options.pageSize));
  }
  if (options.page) {
    params.append('page', String(options.page));
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
 * Reject a pending moderation action
 */
export async function rejectModerationAction(actionId: string): Promise<ModerationAction> {
  return apiClient.post<ModerationAction>(`/moderation/actions/${actionId}/reject`, {});
}

/**
 * Get list of appeals
 */
export async function getAppeals(
  options: {
    status?: string;
    pageSize?: number;
    page?: number;
  } = {},
): Promise<AppealsListResponse> {
  const params = new URLSearchParams();

  if (options.status) {
    params.append('status', options.status);
  }
  if (options.pageSize) {
    params.append('pageSize', String(options.pageSize));
  }
  if (options.page) {
    params.append('page', String(options.page));
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/moderation/appeals?${queryString}` : '/moderation/appeals';

  return apiClient.get<AppealsListResponse>(endpoint);
}

/**
 * Get appeal details
 */
export async function getAppeal(appealId: string): Promise<Appeal> {
  return apiClient.get<Appeal>(`/moderation/appeals/${appealId}`);
}

/**
 * Review and decide on an appeal
 */
export async function reviewAppeal(
  appealId: string,
  decision: 'upheld' | 'denied',
  decisionReasoning?: string,
): Promise<Appeal> {
  return apiClient.post<Appeal>(`/moderation/appeals/${appealId}/review`, {
    decision,
    decisionReasoning,
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  return apiClient.get<QueueStats>('/moderation/queue/stats');
}
