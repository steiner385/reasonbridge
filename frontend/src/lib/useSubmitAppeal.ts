/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hook for submitting appeals via the moderation API
 */

import { useState } from 'react';
import type { Appeal, CreateAppealRequest, CreateAppealResponse } from '../types/moderation';
import { apiClient } from './api';

export interface UseSubmitAppealState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  appealId: string | null;
}

export interface UseSubmitAppealResult extends UseSubmitAppealState {
  submitAppeal: (request: CreateAppealRequest) => Promise<CreateAppealResponse>;
  reset: () => void;
}

/**
 * Hook for submitting appeals
 * Provides loading state, error handling, and success tracking
 */
export function useSubmitAppeal(): UseSubmitAppealResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appealId, setAppealId] = useState<string | null>(null);

  const submitAppeal = async (request: CreateAppealRequest): Promise<CreateAppealResponse> => {
    setIsLoading(true);
    setIsError(false);
    setIsSuccess(false);
    setError(null);
    setAppealId(null);

    try {
      // The create-appeal endpoint is POST /moderation/actions/:actionId/appeal
      // and returns the created appeal directly (not a { appeal, message }
      // envelope). The previous POST to /moderation/appeals hit a route that
      // does not accept POST, so appeal submission could never succeed
      // (Issue #1396).
      const appeal = await apiClient.post<Appeal>(
        `/moderation/actions/${request.moderationActionId}/appeal`,
        { reason: request.reason },
      );

      setIsSuccess(true);
      setAppealId(appeal.id);

      return { appeal, message: 'Appeal submitted successfully' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit appeal';
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
    setAppealId(null);
  };

  return {
    isLoading,
    isSuccess,
    isError,
    error,
    appealId,
    submitAppeal,
    reset,
  };
}
