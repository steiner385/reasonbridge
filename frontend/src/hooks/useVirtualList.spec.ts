import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualList } from './useVirtualList';

describe('useVirtualList', () => {
  const mockInnerHeight = 1000;

  beforeEach(() => {
    // Mock window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: mockInnerHeight,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should calculate container height from window if not provided', () => {
      const { result } = renderHook(() => useVirtualList(50, { itemHeight: 80 }));

      // Should use window.innerHeight * 0.8 as default
      expect(result.current.containerHeight).toBe(800);
    });

    it('should use provided container height', () => {
      const { result } = renderHook(() =>
        useVirtualList(50, { itemHeight: 80, containerHeight: 600 }),
      );

      expect(result.current.containerHeight).toBe(600);
    });

    it('should calculate total height from item count and item height', () => {
      const { result } = renderHook(() => useVirtualList(100, { itemHeight: 50 }));

      expect(result.current.totalHeight).toBe(5000); // 100 * 50
    });

    it('should provide a container ref', () => {
      const { result } = renderHook(() => useVirtualList(50, { itemHeight: 80 }));

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBeNull(); // Not attached yet
    });
  });

  describe('scrollToIndex', () => {
    it('should scroll to the correct position', () => {
      const { result } = renderHook(() => useVirtualList(50, { itemHeight: 80 }));

      // Mock container element with scrollTo
      const mockScrollTo = vi.fn();
      const mockElement = {
        scrollTo: mockScrollTo,
      };
      (result.current.containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        mockElement;

      act(() => {
        result.current.scrollToIndex(10);
      });

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 800, // 10 * 80
        behavior: 'smooth',
      });
    });

    it('should do nothing if container ref is not attached', () => {
      const { result } = renderHook(() => useVirtualList(50, { itemHeight: 80 }));

      // Should not throw error
      act(() => {
        result.current.scrollToIndex(10);
      });
    });
  });

  describe('scrollToTop', () => {
    it('should scroll to position 0', () => {
      const { result } = renderHook(() => useVirtualList(50, { itemHeight: 80 }));

      // Mock container element
      const mockScrollTo = vi.fn();
      const mockElement = {
        scrollTo: mockScrollTo,
      };
      (result.current.containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        mockElement;

      act(() => {
        result.current.scrollToTop();
      });

      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    });
  });

  describe('Resize handling', () => {
    it('should update container height on window resize when height not provided', () => {
      const { result, rerender } = renderHook(() => useVirtualList(50, { itemHeight: 80 }));

      const initialHeight = result.current.containerHeight;

      // Mock container ref with getBoundingClientRect
      const mockElement = {
        getBoundingClientRect: () => ({ top: 100 }),
        scrollTo: vi.fn(),
      };
      (result.current.containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        mockElement;

      // Change window height
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        value: 1200,
      });

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Wait for debounced update (150ms)
      vi.advanceTimersByTime(150);

      rerender();

      // Height should update based on new window height and element position
      // availableHeight = 1200 - 100 - 20 = 1080
      expect(result.current.containerHeight).toBeGreaterThan(initialHeight);
    });

    it('should not update container height on resize when height is explicitly provided', () => {
      const { result } = renderHook(() =>
        useVirtualList(50, { itemHeight: 80, containerHeight: 600 }),
      );

      expect(result.current.containerHeight).toBe(600);

      // Change window height
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        value: 1200,
      });

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Height should remain the same
      expect(result.current.containerHeight).toBe(600);
    });
  });

  describe('Update on item count change', () => {
    it('should update total height when item count changes', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useVirtualList(count, { itemHeight: 50 }),
        { initialProps: { count: 100 } },
      );

      expect(result.current.totalHeight).toBe(5000); // 100 * 50

      // Update item count
      rerender({ count: 150 });

      expect(result.current.totalHeight).toBe(7500); // 150 * 50
    });
  });
});
