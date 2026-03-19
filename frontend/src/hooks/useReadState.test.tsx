/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for useReadState hook
 *
 * Tests the read state management functionality for tracking
 * which responses a user has seen in a topic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { readStateService, type ReadState } from '../services/readStateService';
import { useReadState, useIsResponseUnread } from './useReadState';

// Mock the readStateService
vi.mock('../services/readStateService', () => ({
  readStateService: {
    getReadState: vi.fn(),
    updateReadState: vi.fn(),
  },
}));

const mockReadStateService = readStateService as {
  getReadState: ReturnType<typeof vi.fn>;
  updateReadState: ReturnType<typeof vi.fn>;
};

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useReadState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with loading state', () => {
      mockReadStateService.getReadState.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useReadState('topic-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.readState).toBeUndefined();
    });

    it('should not fetch when topicId is empty', () => {
      const { result } = renderHook(() => useReadState(''), {
        wrapper: createWrapper(),
      });

      expect(mockReadStateService.getReadState).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useReadState('topic-1', { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(mockReadStateService.getReadState).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('fetching read state', () => {
    it('should fetch and return read state', async () => {
      const mockState: ReadState = {
        userId: 'user-1',
        topicId: 'topic-1',
        lastReadAt: '2025-01-15T10:00:00Z',
        lastResponseId: 'response-5',
      };
      mockReadStateService.getReadState.mockResolvedValue(mockState);

      const { result } = renderHook(() => useReadState('topic-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.readState).toEqual(mockState);
      expect(mockReadStateService.getReadState).toHaveBeenCalledWith('topic-1');
    });

    it('should handle null read state (first visit)', async () => {
      mockReadStateService.getReadState.mockResolvedValue(null);

      const { result } = renderHook(() => useReadState('topic-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.readState).toBeNull();
    });

    it('should handle fetch error', async () => {
      mockReadStateService.getReadState.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReadState('topic-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('updateReadState', () => {
    it('should call service with topicId and responseId', async () => {
      const initialState: ReadState = {
        userId: 'user-1',
        topicId: 'topic-1',
        lastReadAt: '2025-01-15T10:00:00Z',
        lastResponseId: 'response-5',
      };
      const updatedState: ReadState = {
        ...initialState,
        lastReadAt: '2025-01-15T11:00:00Z',
        lastResponseId: 'response-10',
      };

      mockReadStateService.getReadState.mockResolvedValue(initialState);
      mockReadStateService.updateReadState.mockResolvedValue(updatedState);

      const { result } = renderHook(() => useReadState('topic-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateReadState('response-10');
      });

      await waitFor(() => {
        expect(mockReadStateService.updateReadState).toHaveBeenCalledWith('topic-1', 'response-10');
      });
    });

    it('should update optimistically', async () => {
      const initialState: ReadState = {
        userId: 'user-1',
        topicId: 'topic-1',
        lastReadAt: '2025-01-15T10:00:00Z',
        lastResponseId: 'response-5',
      };

      mockReadStateService.getReadState.mockResolvedValue(initialState);
      // Delay the update to observe optimistic state
      mockReadStateService.updateReadState.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ...initialState,
                  lastResponseId: 'response-10',
                }),
              100,
            ),
          ),
      );

      const { result } = renderHook(() => useReadState('topic-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateReadState('response-10');
      });

      // Optimistic update should be reflected quickly (React state update is still async)
      await waitFor(() => {
        expect(result.current.readState?.lastResponseId).toBe('response-10');
      });
    });
  });

  describe('markAsRead', () => {
    it('should be an alias for updateReadState', async () => {
      const initialState: ReadState = {
        userId: 'user-1',
        topicId: 'topic-1',
        lastReadAt: '2025-01-15T10:00:00Z',
        lastResponseId: 'response-5',
      };

      mockReadStateService.getReadState.mockResolvedValue(initialState);
      mockReadStateService.updateReadState.mockResolvedValue({
        ...initialState,
        lastResponseId: 'response-15',
      });

      const { result } = renderHook(() => useReadState('topic-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.markAsRead('response-15');
      });

      await waitFor(() => {
        expect(mockReadStateService.updateReadState).toHaveBeenCalledWith('topic-1', 'response-15');
      });
    });
  });
});

describe('useIsResponseUnread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false when no read state exists', async () => {
    mockReadStateService.getReadState.mockResolvedValue(null);

    const { result } = renderHook(() => useIsResponseUnread('topic-1', '2025-01-15T12:00:00Z'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      // Wait for query to settle
      expect(mockReadStateService.getReadState).toHaveBeenCalled();
    });

    expect(result.current).toBe(false);
  });

  it('should return true when response was created after lastReadAt', async () => {
    mockReadStateService.getReadState.mockResolvedValue({
      userId: 'user-1',
      topicId: 'topic-1',
      lastReadAt: '2025-01-15T10:00:00Z',
      lastResponseId: 'response-5',
    });

    const { result } = renderHook(
      () => useIsResponseUnread('topic-1', '2025-01-15T12:00:00Z'), // Created 2 hours after lastReadAt
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should return false when response was created before lastReadAt', async () => {
    mockReadStateService.getReadState.mockResolvedValue({
      userId: 'user-1',
      topicId: 'topic-1',
      lastReadAt: '2025-01-15T10:00:00Z',
      lastResponseId: 'response-5',
    });

    const { result } = renderHook(
      () => useIsResponseUnread('topic-1', '2025-01-15T08:00:00Z'), // Created 2 hours before lastReadAt
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(mockReadStateService.getReadState).toHaveBeenCalled();
    });

    expect(result.current).toBe(false);
  });
});
