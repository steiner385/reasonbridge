import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePreviewFeedback } from './usePreviewFeedback';
import * as feedbackApi from '../lib/feedback-api';

// Mock the feedback API
vi.mock('../lib/feedback-api', () => ({
  previewFeedback: vi.fn(),
  MIN_CONTENT_LENGTH: 20,
}));

// Mock useDebouncedValue to return the value immediately for testing
vi.mock('./useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}));

describe('usePreviewFeedback', () => {
  let queryClient: QueryClient;
  const localStorageMock: { [key: string]: string } = {};

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
      }),
      key: vi.fn(),
      length: 0,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Initialization', () => {
    it('should initialize with default values when content is empty', () => {
      const { result } = renderHook(() => usePreviewFeedback(''), { wrapper });

      expect(result.current.feedback).toEqual([]);
      expect(result.current.readyToPost).toBe(true);
      expect(result.current.summary).toBe('');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isContentValid).toBe(false);
      expect(result.current.sensitivity).toBe('MEDIUM');
    });

    it('should use initialSensitivity option', () => {
      const { result } = renderHook(() => usePreviewFeedback('', { initialSensitivity: 'HIGH' }), {
        wrapper,
      });

      expect(result.current.sensitivity).toBe('HIGH');
    });

    it('should restore sensitivity from localStorage', () => {
      localStorageMock['preview-feedback-sensitivity'] = 'LOW';

      const { result } = renderHook(() => usePreviewFeedback(''), { wrapper });

      expect(result.current.sensitivity).toBe('LOW');
    });
  });

  describe('Content validation', () => {
    it('should mark content as invalid when length < MIN_CONTENT_LENGTH', () => {
      const { result } = renderHook(() => usePreviewFeedback('Short'), { wrapper });

      expect(result.current.isContentValid).toBe(false);
    });

    it('should mark content as valid when length >= MIN_CONTENT_LENGTH', () => {
      const longContent = 'This is a long enough content for analysis';

      const { result } = renderHook(() => usePreviewFeedback(longContent), { wrapper });

      expect(result.current.isContentValid).toBe(true);
    });
  });

  describe('Query behavior', () => {
    it('should not fetch feedback when content is too short', () => {
      renderHook(() => usePreviewFeedback('Short'), { wrapper });

      expect(feedbackApi.previewFeedback).not.toHaveBeenCalled();
    });

    it('should fetch feedback when content meets minimum length', async () => {
      const longContent = 'This is a long enough content for analysis';
      const mockResponse = {
        feedback: [{ type: 'suggestion', message: 'Test feedback' }],
        readyToPost: true,
        summary: 'Looks good!',
        analysisTimeMs: 100,
      };

      vi.mocked(feedbackApi.previewFeedback).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => usePreviewFeedback(longContent), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(feedbackApi.previewFeedback).toHaveBeenCalledWith({
        content: longContent,
        sensitivity: 'MEDIUM',
        discussionId: undefined,
        topicId: undefined,
      });

      expect(result.current.feedback).toEqual(mockResponse.feedback);
      expect(result.current.readyToPost).toBe(true);
      expect(result.current.summary).toBe('Looks good!');
      expect(result.current.analysisTimeMs).toBe(100);
    });

    it('should respect enabled option', () => {
      const longContent = 'This is a long enough content for analysis';

      renderHook(() => usePreviewFeedback(longContent, { enabled: false }), { wrapper });

      expect(feedbackApi.previewFeedback).not.toHaveBeenCalled();
    });

    it('should include discussionId and topicId in query', async () => {
      const longContent = 'This is a long enough content for analysis';

      vi.mocked(feedbackApi.previewFeedback).mockResolvedValue({
        feedback: [],
        readyToPost: true,
        summary: '',
        analysisTimeMs: 0,
      } as any);

      const { result } = renderHook(
        () =>
          usePreviewFeedback(longContent, {
            discussionId: 'disc-123',
            topicId: 'topic-456',
          }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(feedbackApi.previewFeedback).toHaveBeenCalledWith({
        content: longContent,
        sensitivity: 'MEDIUM',
        discussionId: 'disc-123',
        topicId: 'topic-456',
      });
    });
  });

  describe('Sensitivity management', () => {
    it('should update sensitivity and persist to localStorage', async () => {
      const { result } = renderHook(() => usePreviewFeedback(''), { wrapper });

      expect(result.current.sensitivity).toBe('MEDIUM');

      // Update sensitivity
      result.current.setSensitivity('HIGH');

      await waitFor(() => {
        expect(result.current.sensitivity).toBe('HIGH');
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('preview-feedback-sensitivity', 'HIGH');
      expect(localStorageMock['preview-feedback-sensitivity']).toBe('HIGH');
    });

    it('should refetch feedback when sensitivity changes', async () => {
      const longContent = 'This is a long enough content for analysis';

      vi.mocked(feedbackApi.previewFeedback).mockResolvedValue({
        feedback: [],
        readyToPost: true,
        summary: '',
        analysisTimeMs: 0,
      } as any);

      const { result } = renderHook(() => usePreviewFeedback(longContent), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstCallCount = vi.mocked(feedbackApi.previewFeedback).mock.calls.length;

      // Change sensitivity
      result.current.setSensitivity('HIGH');

      await waitFor(() => {
        expect(vi.mocked(feedbackApi.previewFeedback).mock.calls.length).toBeGreaterThan(
          firstCallCount,
        );
      });

      // Verify the second call used the new sensitivity
      const lastCall = vi.mocked(feedbackApi.previewFeedback).mock.calls[
        vi.mocked(feedbackApi.previewFeedback).mock.calls.length - 1
      ];
      expect(lastCall[0].sensitivity).toBe('HIGH');
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      const longContent = 'This is a long enough content for analysis';
      const errorMessage = 'API Error';

      vi.mocked(feedbackApi.previewFeedback).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePreviewFeedback(longContent), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.feedback).toEqual([]);
      expect(result.current.readyToPost).toBe(true); // Default to allowing post on error
    });

    it('should return null error message when no error', () => {
      const { result } = renderHook(() => usePreviewFeedback('Short'), { wrapper });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Loading states', () => {
    it('should set isLoading to true when fetching', async () => {
      const longContent = 'This is a long enough content for analysis';

      // Create a promise we can control
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(feedbackApi.previewFeedback).mockReturnValue(promise as any);

      const { result } = renderHook(() => usePreviewFeedback(longContent), { wrapper });

      // Should be loading initially
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise!({
        feedback: [],
        readyToPost: true,
        summary: '',
        analysisTimeMs: 0,
      });

      // Should stop loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should not set isLoading when content is invalid', () => {
      const { result } = renderHook(() => usePreviewFeedback('Short'), { wrapper });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Return values', () => {
    it('should return correct structure when feedback is available', async () => {
      const longContent = 'This is a long enough content for analysis';
      const mockResponse = {
        feedback: [
          { type: 'suggestion', message: 'Consider adding evidence' },
          { type: 'warning', message: 'Possible bias detected' },
        ],
        primary: { type: 'warning', message: 'Possible bias detected' },
        readyToPost: false,
        summary: 'Your response has some issues',
        analysisTimeMs: 250,
      };

      vi.mocked(feedbackApi.previewFeedback).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => usePreviewFeedback(longContent), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.feedback).toEqual(mockResponse.feedback);
      expect(result.current.primary).toEqual(mockResponse.primary);
      expect(result.current.readyToPost).toBe(false);
      expect(result.current.summary).toBe('Your response has some issues');
      expect(result.current.analysisTimeMs).toBe(250);
      expect(result.current.isContentValid).toBe(true);
    });

    it('should provide setSensitivity function', () => {
      const { result } = renderHook(() => usePreviewFeedback(''), { wrapper });

      expect(typeof result.current.setSensitivity).toBe('function');
    });
  });
});
