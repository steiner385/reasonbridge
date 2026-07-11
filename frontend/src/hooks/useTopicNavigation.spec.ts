import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Location } from 'react-router-dom';
import * as ReactRouter from 'react-router-dom';
import { useTopicNavigation } from './useTopicNavigation';

// Mock react-router-dom. The current hook derives activeTopicId from
// useLocation() and performs navigation via useNavigate() (it no longer uses
// useSearchParams/setSearchParams).
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouter>('react-router-dom');
  return {
    ...actual,
    useLocation: vi.fn(),
    useNavigate: vi.fn(),
  };
});

/**
 * Helper to build a minimal Location object for useLocation mocking.
 */
function makeLocation(pathname: string, search = ''): Location {
  return {
    pathname,
    search,
    hash: '',
    state: null,
    key: 'default',
  };
}

describe('useTopicNavigation', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNavigate = vi.fn();

    vi.mocked(ReactRouter.useNavigate).mockReturnValue(mockNavigate);
    // Default: no topic selected
    vi.mocked(ReactRouter.useLocation).mockReturnValue(makeLocation('/discussions'));
  });

  describe('Initial state', () => {
    it('should return null activeTopicId when no topic in URL', () => {
      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.activeTopicId).toBe(null);
    });

    it('should return activeTopicId from query param', () => {
      vi.mocked(ReactRouter.useLocation).mockReturnValue(
        makeLocation('/discussions', '?topic=topic-123'),
      );

      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.activeTopicId).toBe('topic-123');
    });

    it('should return activeTopicId from /topics/:id path', () => {
      vi.mocked(ReactRouter.useLocation).mockReturnValue(makeLocation('/topics/topic-999'));

      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.activeTopicId).toBe('topic-999');
    });
  });

  describe('navigateToTopic', () => {
    it('should navigate to /discussions with topic query parameter', () => {
      const { result } = renderHook(() => useTopicNavigation());

      act(() => {
        result.current.navigateToTopic('topic-456');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/discussions?topic=topic-456');
    });

    it('should navigate to the newly requested topic when one is already active', () => {
      vi.mocked(ReactRouter.useLocation).mockReturnValue(
        makeLocation('/discussions', '?topic=topic-old'),
      );

      const { result } = renderHook(() => useTopicNavigation());

      act(() => {
        result.current.navigateToTopic('topic-new');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/discussions?topic=topic-new');
    });
  });

  describe('clearTopic', () => {
    it('should navigate to /discussions without a topic parameter', () => {
      vi.mocked(ReactRouter.useLocation).mockReturnValue(
        makeLocation('/discussions', '?topic=topic-123'),
      );

      const { result } = renderHook(() => useTopicNavigation());

      act(() => {
        result.current.clearTopic();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/discussions', { replace: false });
    });
  });

  describe('isTopicActive', () => {
    it('should return true for active topic', () => {
      vi.mocked(ReactRouter.useLocation).mockReturnValue(
        makeLocation('/discussions', '?topic=topic-123'),
      );

      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.isTopicActive('topic-123')).toBe(true);
    });

    it('should return false for inactive topic', () => {
      vi.mocked(ReactRouter.useLocation).mockReturnValue(
        makeLocation('/discussions', '?topic=topic-123'),
      );

      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.isTopicActive('topic-456')).toBe(false);
    });

    it('should return false when no topic is selected', () => {
      const { result } = renderHook(() => useTopicNavigation());

      expect(result.current.isTopicActive('topic-123')).toBe(false);
    });
  });

  describe('URL change detection', () => {
    it('should update activeTopicId when the location changes', () => {
      const { result, rerender } = renderHook(() => useTopicNavigation());

      expect(result.current.activeTopicId).toBe(null);

      // Simulate the location updating to a new topic
      vi.mocked(ReactRouter.useLocation).mockReturnValue(
        makeLocation('/discussions', '?topic=topic-updated'),
      );

      rerender();

      expect(result.current.activeTopicId).toBe('topic-updated');
    });
  });
});
