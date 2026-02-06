import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTopicNavigation } from './useTopicNavigation';
import * as ReactRouter from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouter>('react-router-dom');
  return {
    ...actual,
    useSearchParams: vi.fn(),
    useNavigate: vi.fn(),
  };
});

describe('useTopicNavigation', () => {
  let mockSetSearchParams: ReturnType<typeof vi.fn>;
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetSearchParams = vi.fn();
    mockNavigate = vi.fn();

    vi.mocked(ReactRouter.useSearchParams).mockReturnValue([
      new URLSearchParams(),
      mockSetSearchParams,
    ] as any);

    vi.mocked(ReactRouter.useNavigate).mockReturnValue(mockNavigate);
  });

  describe('Initial state', () => {
    it('should return null activeTopicId when no topic in URL', () => {
      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.activeTopicId).toBe(null);
    });

    it('should return activeTopicId from URL query param', () => {
      const searchParams = new URLSearchParams('topic=topic-123');
      vi.mocked(ReactRouter.useSearchParams).mockReturnValue([
        searchParams,
        mockSetSearchParams,
      ] as any);

      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.activeTopicId).toBe('topic-123');
    });
  });

  describe('navigateToTopic', () => {
    it('should update URL with topic query parameter', () => {
      const { result } = renderHook(() => useTopicNavigation());

      act(() => {
        result.current.navigateToTopic('topic-456');
      });

      expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), {
        replace: false,
      });

      const callArgs = mockSetSearchParams.mock.calls[0][0];
      expect(callArgs.get('topic')).toBe('topic-456');
    });

    it('should preserve other query parameters when navigating', () => {
      const searchParams = new URLSearchParams('foo=bar&baz=qux');
      vi.mocked(ReactRouter.useSearchParams).mockReturnValue([
        searchParams,
        mockSetSearchParams,
      ] as any);

      const { result } = renderHook(() => useTopicNavigation());

      act(() => {
        result.current.navigateToTopic('topic-789');
      });

      const callArgs = mockSetSearchParams.mock.calls[0][0];
      expect(callArgs.get('topic')).toBe('topic-789');
      expect(callArgs.get('foo')).toBe('bar');
      expect(callArgs.get('baz')).toBe('qux');
    });

    it('should update topic parameter if it already exists', () => {
      const searchParams = new URLSearchParams('topic=topic-old');
      vi.mocked(ReactRouter.useSearchParams).mockReturnValue([
        searchParams,
        mockSetSearchParams,
      ] as any);

      const { result } = renderHook(() => useTopicNavigation());

      act(() => {
        result.current.navigateToTopic('topic-new');
      });

      const callArgs = mockSetSearchParams.mock.calls[0][0];
      expect(callArgs.get('topic')).toBe('topic-new');
    });
  });

  describe('clearTopic', () => {
    it('should remove topic query parameter from URL', () => {
      const searchParams = new URLSearchParams('topic=topic-123');
      vi.mocked(ReactRouter.useSearchParams).mockReturnValue([
        searchParams,
        mockSetSearchParams,
      ] as any);

      const { result } = renderHook(() => useTopicNavigation());

      act(() => {
        result.current.clearTopic();
      });

      const callArgs = mockSetSearchParams.mock.calls[0][0];
      expect(callArgs.has('topic')).toBe(false);
    });

    it('should preserve other query parameters when clearing topic', () => {
      const searchParams = new URLSearchParams('topic=topic-123&foo=bar');
      vi.mocked(ReactRouter.useSearchParams).mockReturnValue([
        searchParams,
        mockSetSearchParams,
      ] as any);

      const { result } = renderHook(() => useTopicNavigation());

      act(() => {
        result.current.clearTopic();
      });

      const callArgs = mockSetSearchParams.mock.calls[0][0];
      expect(callArgs.has('topic')).toBe(false);
      expect(callArgs.get('foo')).toBe('bar');
    });
  });

  describe('isTopicActive', () => {
    it('should return true for active topic', () => {
      const searchParams = new URLSearchParams('topic=topic-123');
      vi.mocked(ReactRouter.useSearchParams).mockReturnValue([
        searchParams,
        mockSetSearchParams,
      ] as any);

      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.isTopicActive('topic-123')).toBe(true);
    });

    it('should return false for inactive topic', () => {
      const searchParams = new URLSearchParams('topic=topic-123');
      vi.mocked(ReactRouter.useSearchParams).mockReturnValue([
        searchParams,
        mockSetSearchParams,
      ] as any);

      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.isTopicActive('topic-456')).toBe(false);
    });

    it('should return false when no topic is selected', () => {
      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.isTopicActive('topic-123')).toBe(false);
    });
  });

  describe('URL change detection', () => {
    it('should update activeTopicId when URL changes', () => {
      const initialParams = new URLSearchParams();
      const { rerender } = renderHook(() => useTopicNavigation());

      // Simulate URL change
      const newParams = new URLSearchParams('topic=topic-updated');
      vi.mocked(ReactRouter.useSearchParams).mockReturnValue([
        newParams,
        mockSetSearchParams,
      ] as any);

      rerender();

      const { result } = renderHook(() => useTopicNavigation());
      expect(result.current.activeTopicId).toBe('topic-updated');
    });
  });
});
