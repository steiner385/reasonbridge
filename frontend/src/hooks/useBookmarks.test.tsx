/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for useBookmarks hooks
 *
 * Tests both useBookmarks (list) and useBookmarkStatus (single) hooks:
 * - Fetching bookmark data
 * - Adding and removing bookmarks with optimistic updates
 * - Toggle functionality
 * - Error handling with rollback
 * - Authentication requirements
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { bookmarkService, type Bookmark, type BookmarkList } from '../services/bookmarkService';
import { useBookmarks, useBookmarkStatus } from './useBookmarks';

// Mock the bookmarkService
vi.mock('../services/bookmarkService', () => ({
  bookmarkService: {
    getBookmarks: vi.fn(),
    getBookmarkStatus: vi.fn(),
    addBookmark: vi.fn(),
    removeBookmark: vi.fn(),
  },
}));

// Mock useAuth hook
const mockIsAuthenticated = vi.fn(() => true);
vi.mock('./useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated(),
  }),
}));

const mockBookmarkService = bookmarkService as {
  getBookmarks: ReturnType<typeof vi.fn>;
  getBookmarkStatus: ReturnType<typeof vi.fn>;
  addBookmark: ReturnType<typeof vi.fn>;
  removeBookmark: ReturnType<typeof vi.fn>;
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

const mockBookmark: Bookmark = {
  id: 'bookmark-1',
  userId: 'user-1',
  responseId: 'response-1',
  createdAt: '2025-01-15T10:00:00Z',
  response: {
    id: 'response-1',
    content: 'This is a great response',
    topicId: 'topic-1',
    topicTitle: 'Test Topic',
    authorDisplayName: 'Alice',
    createdAt: '2025-01-15T09:00:00Z',
  },
};

const mockBookmarkList: BookmarkList = {
  bookmarks: [mockBookmark],
  total: 1,
  limit: 20,
  offset: 0,
};

describe('useBookmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  describe('initialization', () => {
    it('should start with loading state', () => {
      mockBookmarkService.getBookmarks.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useBookmarks(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.bookmarks).toEqual([]);
    });

    it('should not fetch when user is not authenticated', () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useBookmarks(), {
        wrapper: createWrapper(),
      });

      expect(mockBookmarkService.getBookmarks).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useBookmarks(20, 0, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(mockBookmarkService.getBookmarks).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('fetching bookmarks', () => {
    it('should fetch and return bookmark list', async () => {
      mockBookmarkService.getBookmarks.mockResolvedValue(mockBookmarkList);

      const { result } = renderHook(() => useBookmarks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.bookmarks).toEqual([mockBookmark]);
      expect(result.current.total).toBe(1);
      expect(result.current.limit).toBe(20);
      expect(result.current.offset).toBe(0);
    });

    it('should fetch with custom pagination', async () => {
      mockBookmarkService.getBookmarks.mockResolvedValue({
        bookmarks: [],
        total: 50,
        limit: 10,
        offset: 20,
      });

      const { result } = renderHook(() => useBookmarks(10, 20), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockBookmarkService.getBookmarks).toHaveBeenCalledWith(10, 20);
    });

    it('should handle empty bookmarks', async () => {
      mockBookmarkService.getBookmarks.mockResolvedValue({
        bookmarks: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      const { result } = renderHook(() => useBookmarks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.bookmarks).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it('should handle fetch error', async () => {
      mockBookmarkService.getBookmarks.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useBookmarks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });
});

describe('useBookmarkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  describe('initialization', () => {
    it('should start with loading state', () => {
      mockBookmarkService.getBookmarkStatus.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isBookmarked).toBe(false);
    });

    it('should not fetch when responseId is empty', () => {
      const { result } = renderHook(() => useBookmarkStatus(''), {
        wrapper: createWrapper(),
      });

      expect(mockBookmarkService.getBookmarkStatus).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch when user is not authenticated', () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      expect(mockBookmarkService.getBookmarkStatus).not.toHaveBeenCalled();
      expect(result.current.isBookmarked).toBe(false);
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useBookmarkStatus('response-1', { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(mockBookmarkService.getBookmarkStatus).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('fetching status', () => {
    it('should fetch and return bookmarked status', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: true });

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isBookmarked).toBe(true);
      expect(mockBookmarkService.getBookmarkStatus).toHaveBeenCalledWith('response-1');
    });

    it('should return false when not bookmarked', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: false });

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isBookmarked).toBe(false);
    });
  });

  describe('addBookmark', () => {
    it('should call service and optimistically update', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: false });
      mockBookmarkService.addBookmark.mockResolvedValue(mockBookmark);

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addBookmark();
      });

      // Optimistic update should show as bookmarked immediately
      await waitFor(() => {
        expect(result.current.isBookmarked).toBe(true);
      });

      expect(mockBookmarkService.addBookmark).toHaveBeenCalledWith('response-1');
    });
  });

  describe('removeBookmark', () => {
    it('should call service and optimistically update', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: true });
      mockBookmarkService.removeBookmark.mockResolvedValue(undefined);

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.removeBookmark();
      });

      // Optimistic update should show as not bookmarked immediately
      await waitFor(() => {
        expect(result.current.isBookmarked).toBe(false);
      });

      expect(mockBookmarkService.removeBookmark).toHaveBeenCalledWith('response-1');
    });
  });

  describe('toggleBookmark', () => {
    it('should add bookmark when not bookmarked', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: false });
      mockBookmarkService.addBookmark.mockResolvedValue(mockBookmark);

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.toggleBookmark();
      });

      await waitFor(() => {
        expect(mockBookmarkService.addBookmark).toHaveBeenCalledWith('response-1');
      });
    });

    it('should remove bookmark when bookmarked', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: true });
      mockBookmarkService.removeBookmark.mockResolvedValue(undefined);

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.toggleBookmark();
      });

      await waitFor(() => {
        expect(mockBookmarkService.removeBookmark).toHaveBeenCalledWith('response-1');
      });
    });
  });

  describe('isPending state', () => {
    it('should be true during add mutation', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: false });
      mockBookmarkService.addBookmark.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockBookmark), 100)),
      );

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.addBookmark();
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });
    });

    it('should be true during remove mutation', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: true });
      mockBookmarkService.removeBookmark.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.removeBookmark();
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });
    });
  });

  describe('error rollback', () => {
    it('should rollback optimistic add on error', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: false });
      mockBookmarkService.addBookmark.mockRejectedValue(new Error('Add failed'));

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isBookmarked).toBe(false);

      act(() => {
        result.current.addBookmark();
      });

      // After error, should rollback to previous state
      await waitFor(() => {
        expect(result.current.isBookmarked).toBe(false);
      });
    });

    it('should rollback optimistic remove on error', async () => {
      mockBookmarkService.getBookmarkStatus.mockResolvedValue({ isBookmarked: true });
      mockBookmarkService.removeBookmark.mockRejectedValue(new Error('Remove failed'));

      const { result } = renderHook(() => useBookmarkStatus('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isBookmarked).toBe(true);

      act(() => {
        result.current.removeBookmark();
      });

      // After error, should rollback to previous state
      await waitFor(() => {
        expect(result.current.isBookmarked).toBe(true);
      });
    });
  });
});
