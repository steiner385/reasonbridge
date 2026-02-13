/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { apiClient, ApiError } from '../lib/api';

/**
 * Follow status response from API
 */
export interface FollowStatus {
  isFollowing: boolean;
  followedAt?: string;
}

/**
 * Follow action response from API
 */
export interface FollowResponse {
  success: boolean;
  message: string;
  isFollowing: boolean;
  followedUserId: string;
  followedAt?: string;
}

/**
 * useFollow hook state
 */
export interface UseFollowState {
  isFollowing: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * useFollow hook return type
 */
export interface UseFollowReturn extends UseFollowState {
  follow: () => Promise<boolean>;
  unfollow: () => Promise<boolean>;
  toggleFollow: () => Promise<boolean>;
  checkFollowStatus: () => Promise<void>;
}

/**
 * Custom hook for managing follow/unfollow user actions
 *
 * Provides functionality to:
 * - Check if the current user follows a target user
 * - Follow/unfollow a user
 * - Toggle follow state
 *
 * @param targetUserId - The ID of the user to follow/unfollow
 * @param initialFollowing - Optional initial following state (if known from props)
 */
export function useFollow(
  targetUserId: string,
  initialFollowing: boolean = false,
): UseFollowReturn {
  const [state, setState] = useState<UseFollowState>({
    isFollowing: initialFollowing,
    isLoading: false,
    error: null,
  });

  /**
   * Check current follow status from API
   */
  const checkFollowStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.get<FollowStatus>(`/users/${targetUserId}/follow`);
      setState({
        isFollowing: response.isFollowing,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : 'Failed to check follow status';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [targetUserId]);

  /**
   * Follow the target user
   */
  const follow = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.post<FollowResponse>(`/users/${targetUserId}/follow`);
      setState({
        isFollowing: response.isFollowing,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to follow user';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [targetUserId]);

  /**
   * Unfollow the target user
   */
  const unfollow = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.delete<FollowResponse>(`/users/${targetUserId}/follow`);
      setState({
        isFollowing: response.isFollowing,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to unfollow user';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [targetUserId]);

  /**
   * Toggle follow state
   */
  const toggleFollow = useCallback(async (): Promise<boolean> => {
    if (state.isFollowing) {
      return unfollow();
    }
    return follow();
  }, [state.isFollowing, follow, unfollow]);

  return {
    isFollowing: state.isFollowing,
    isLoading: state.isLoading,
    error: state.error,
    follow,
    unfollow,
    toggleFollow,
    checkFollowStatus,
  };
}
