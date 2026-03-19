/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hook for flagging content via the moderation API
 *
 * Uses the /moderation/reports endpoint (Issue #1046)
 */

import { useState } from 'react';
import type {
  FlagContentRequest,
  FlagContentResponse,
  FlagCategory,
  Report,
  ReportCategory,
  ReportContentType,
} from '../types/moderation';
import { apiClient } from './api';

export interface UseFlagContentState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  flagId: string | null;
}

export interface UseFlagContentResult extends UseFlagContentState {
  flagContent: (request: FlagContentRequest) => Promise<FlagContentResponse>;
  reset: () => void;
}

/**
 * Map frontend FlagCategory to backend ReportCategory
 */
function mapCategoryToReportCategory(category: FlagCategory): ReportCategory {
  const mapping: Record<FlagCategory, ReportCategory> = {
    inappropriate: 'OTHER',
    spam: 'SPAM',
    misinformation: 'MISINFORMATION',
    harassment: 'HARASSMENT',
    'hate-speech': 'HATE_SPEECH',
    violence: 'VIOLENCE',
    copyright: 'COPYRIGHT',
    privacy: 'OTHER', // No direct mapping, use OTHER
    other: 'OTHER',
  };
  return mapping[category] || 'OTHER';
}

/**
 * Map frontend content type to backend ReportContentType
 */
function mapContentType(contentType: FlagContentRequest['contentType']): ReportContentType {
  // 'comment' and 'other' map to 'response' in the backend
  if (contentType === 'comment' || contentType === 'other') {
    return 'response';
  }
  return contentType as ReportContentType;
}

/**
 * Hook for submitting content flags
 * Provides loading state, error handling, and success tracking
 */
export function useFlagContent(): UseFlagContentResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flagId, setFlagId] = useState<string | null>(null);

  const flagContent = async (request: FlagContentRequest): Promise<FlagContentResponse> => {
    setIsLoading(true);
    setIsError(false);
    setIsSuccess(false);
    setError(null);
    setFlagId(null);

    try {
      // Build report request for new /moderation/reports endpoint
      const reportRequest = {
        contentType: mapContentType(request.contentType),
        contentId: request.contentId,
        category: mapCategoryToReportCategory(request.category),
        description: request.description || request.reason,
      };

      const report = await apiClient.post<Report>('/moderation/reports', reportRequest);

      setIsSuccess(true);
      setFlagId(report.id);

      // Return legacy FlagContentResponse shape for backwards compatibility
      return {
        flagId: report.id,
        status: report.status === 'PENDING' ? 'submitted' : 'processing',
        createdAt: report.createdAt,
        message: 'Report submitted successfully',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to flag content';
      setIsError(true);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    setFlagId(null);
  };

  return {
    isLoading,
    isSuccess,
    isError,
    error,
    flagId,
    flagContent,
    reset,
  };
}
