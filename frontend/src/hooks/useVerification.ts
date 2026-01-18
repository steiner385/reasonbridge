/**
 * Hook for verification API interactions
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiClient } from '../lib/api';
import type {
  VerificationRequest,
  VerificationResponse,
  VerificationRecord,
  VideoUploadRequest,
} from '../types/verification';

const apiClient = new ApiClient();

/**
 * Request a new verification
 */
export const useRequestVerification = () => {
  return useMutation({
    mutationFn: async (data: VerificationRequest): Promise<VerificationResponse> => {
      const response = await apiClient.post('/verification/request', data);
      return response as VerificationResponse;
    },
  });
};

/**
 * Get pending verifications for current user
 */
export const usePendingVerifications = () => {
  return useQuery({
    queryKey: ['verifications', 'pending'],
    queryFn: async (): Promise<VerificationRecord[]> => {
      const response = await apiClient.get('/verification/user/pending');
      return response as VerificationRecord[];
    },
  });
};

/**
 * Get verification history for current user
 */
export const useVerificationHistory = () => {
  return useQuery({
    queryKey: ['verifications', 'history'],
    queryFn: async (): Promise<VerificationRecord[]> => {
      const response = await apiClient.get('/verification/user/history');
      return response as VerificationRecord[];
    },
  });
};

/**
 * Get specific verification details
 */
export const useVerification = (verificationId: string | null) => {
  return useQuery({
    queryKey: ['verifications', verificationId],
    queryFn: async (): Promise<VerificationRecord> => {
      const response = await apiClient.get(`/verification/${verificationId}`);
      return response as VerificationRecord;
    },
    enabled: !!verificationId,
  });
};

/**
 * Complete video upload
 */
export const useCompleteVideoUpload = () => {
  return useMutation({
    mutationFn: async (data: VideoUploadRequest): Promise<void> => {
      await apiClient.post('/verification/video-upload-complete', data);
    },
  });
};

/**
 * Mark verification as complete
 */
export const useCompleteVerification = () => {
  return useMutation({
    mutationFn: async (verificationId: string): Promise<void> => {
      await apiClient.patch(`/verification/${verificationId}/complete`, {});
    },
  });
};

/**
 * Re-initiate verification (for expired verifications)
 */
export const useReverifyVerification = () => {
  return useMutation({
    mutationFn: async (verificationId: string): Promise<VerificationResponse> => {
      const response = await apiClient.post(`/verification/${verificationId}/re-verify`, {});
      return response as VerificationResponse;
    },
  });
};
