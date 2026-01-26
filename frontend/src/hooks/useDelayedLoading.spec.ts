import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDelayedLoading } from './useDelayedLoading';

describe('useDelayedLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial state', () => {
    it('should return false when not loading', () => {
      const { result } = renderHook(() => useDelayedLoading(false));
      expect(result.current).toBe(false);
    });

    it('should return false initially when loading starts', () => {
      const { result } = renderHook(() => useDelayedLoading(true));
      // Should be false before delay elapses
      expect(result.current).toBe(false);
    });
  });

  describe('Delay behavior', () => {
    it('should return true after delay when loading', () => {
      const { result } = renderHook(() => useDelayedLoading(true, 100));

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe(true);
    });

    it('should use default delay of 100ms', () => {
      const { result } = renderHook(() => useDelayedLoading(true));

      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(99);
      });
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe(true);
    });

    it('should respect custom delay', () => {
      const { result } = renderHook(() => useDelayedLoading(true, 200));

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(true);
    });
  });

  describe('Fast load prevention', () => {
    it('should not show loading if data loads before delay', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, 100),
        { initialProps: { isLoading: true } },
      );

      // Advance time but not past delay
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current).toBe(false);

      // Data loads before delay completes
      rerender({ isLoading: false });
      expect(result.current).toBe(false);

      // Even after delay time, should stay false
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(false);
    });
  });

  describe('State transitions', () => {
    it('should return false immediately when loading completes', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, 100),
        { initialProps: { isLoading: true } },
      );

      // Wait for delay to show loading
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(true);

      // Loading completes
      rerender({ isLoading: false });
      expect(result.current).toBe(false);
    });

    it('should restart delay on subsequent loading', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, 100),
        { initialProps: { isLoading: true } },
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(true);

      // Stop loading
      rerender({ isLoading: false });
      expect(result.current).toBe(false);

      // Start loading again
      rerender({ isLoading: true });
      expect(result.current).toBe(false);

      // Need to wait for delay again
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(true);
    });
  });

  describe('Timer cleanup', () => {
    it('should clean up timer on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() => useDelayedLoading(true, 100));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should not cause memory leaks with rapid state changes', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, 100),
        { initialProps: { isLoading: true } },
      );

      // Rapid toggling
      for (let i = 0; i < 10; i++) {
        rerender({ isLoading: false });
        rerender({ isLoading: true });
      }

      // Should still work correctly
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero delay', () => {
      const { result } = renderHook(() => useDelayedLoading(true, 0));

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe(true);
    });

    it('should handle changing delay value', () => {
      const { result, rerender } = renderHook(
        ({ isLoading, delay }) => useDelayedLoading(isLoading, delay),
        { initialProps: { isLoading: true, delay: 100 } },
      );

      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Change delay - should restart timer
      rerender({ isLoading: true, delay: 200 });

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(true);
    });
  });
});
