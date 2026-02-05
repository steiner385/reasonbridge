/**
 * Hook for submitting appeals via the moderation API
 */

import { useState } from 'react';
import type { CreateAppealRequest, CreateAppealResponse } from '../types/moderation';
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
      const response = await apiClient.post<CreateAppealResponse>('/moderation/appeals', request);

      setIsSuccess(true);
      setAppealId(response.appeal.id);

      return response;
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
