/**
 * Hook for flagging content via the moderation API
 */

import { useState } from 'react';
import { apiClient } from './api';
import type { FlagContentRequest, FlagContentResponse } from '../types/moderation';

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
      const response = await apiClient.post<FlagContentResponse>('/moderation/flag', request);

      setIsSuccess(true);
      setFlagId(response.flagId);

      return response;
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
