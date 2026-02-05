import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../../../src/hooks/useDebounce';

describe('useDebounce hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('should work with different data types - string', () => {
      const { result } = renderHook(() => useDebounce('test string', 500));

      expect(result.current).toBe('test string');
    });

    it('should work with different data types - number', () => {
      const { result } = renderHook(() => useDebounce(42, 500));

      expect(result.current).toBe(42);
    });

    it('should work with different data types - boolean', () => {
      const { result } = renderHook(() => useDebounce(true, 500));

      expect(result.current).toBe(true);
    });

    it('should work with different data types - object', () => {
      const obj = { name: 'test', value: 123 };
      const { result } = renderHook(() => useDebounce(obj, 500));

      expect(result.current).toBe(obj);
    });

    it('should work with different data types - array', () => {
      const arr = [1, 2, 3];
      const { result } = renderHook(() => useDebounce(arr, 500));

      expect(result.current).toBe(arr);
    });

    it('should work with null', () => {
      const { result } = renderHook(() => useDebounce(null, 500));

      expect(result.current).toBeNull();
    });

    it('should work with undefined', () => {
      const { result } = renderHook(() => useDebounce(undefined, 500));

      expect(result.current).toBeUndefined();
    });
  });

  describe('debouncing behavior', () => {
    it('should update value after default delay (500ms)', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      expect(result.current).toBe('initial');

      // Update value
      rerender({ value: 'updated' });

      // Should still be old value immediately
      expect(result.current).toBe('initial');

      // Advance time by 499ms - should still be old value
      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(result.current).toBe('initial');

      // Advance time by 1ms more (total 500ms) - should be new value
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });

    it('should update value after custom delay', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 1000), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      // Should not update after 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe('initial');

      // Should update after 1000ms
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe('updated');
    });

    it('should reset timer when value changes before delay expires', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      // First update
      rerender({ value: 'update1' });

      // Advance time by 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('initial');

      // Second update before first delay expires
      rerender({ value: 'update2' });

      // Advance time by 300ms (total 600ms from first update, but only 300ms from second)
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('initial'); // Still initial because second timer hasn't expired

      // Advance time by 200ms more (500ms from second update)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe('update2'); // Should be second update, not first
    });

    it('should handle rapid value changes', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      // Rapid updates
      rerender({ value: 'a' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'ab' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'abc' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'abcd' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Still initial after 400ms
      expect(result.current).toBe('initial');

      // After 500ms from last update, should be 'abcd'
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current).toBe('abcd');
    });
  });

  describe('cleanup', () => {
    it('should cleanup timeout on unmount', () => {
      const { result, rerender, unmount } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });
      unmount();

      // Advance time after unmount
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Value should not have updated after unmount
      expect(result.current).toBe('initial');
    });

    it('should cleanup previous timeout when value changes', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'update1' });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      rerender({ value: 'update2' });

      // Advance past first timeout
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should still be initial because second timeout hasn't expired
      expect(result.current).toBe('initial');
    });
  });

  describe('delay parameter', () => {
    it('should use default delay of 500ms when not specified', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });

    it('should respect custom delay', () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 300 },
      });

      rerender({ value: 'updated', delay: 300 });

      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });

    it('should handle delay of 0', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      // Even with delay 0, setTimeout still defers to next tick
      act(() => {
        vi.runAllTimers();
      });

      expect(result.current).toBe('updated');
    });

    it('should update immediately if delay changes to affect current timeout', () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 1000 },
      });

      rerender({ value: 'updated', delay: 1000 });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Change delay to shorter value
      rerender({ value: 'updated', delay: 100 });

      // New timeout starts from this point
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: '' });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('');
    });

    it('should handle value changing to same value', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'test' },
      });

      expect(result.current).toBe('test');

      // "Change" to same value
      rerender({ value: 'test' });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should still be same value (debouncing still occurred)
      expect(result.current).toBe('test');
    });

    it('should handle complex objects', () => {
      const obj1 = { id: 1, name: 'Test', nested: { value: 42 } };
      const obj2 = { id: 2, name: 'Updated', nested: { value: 100 } };

      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: obj1 },
      });

      expect(result.current).toBe(obj1);

      rerender({ value: obj2 });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe(obj2);
      expect(result.current.nested.value).toBe(100);
    });
  });
});
