/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus, useIsOnline } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  let originalNavigator: typeof navigator.onLine;
  let onlineHandler: ((event: Event) => void) | null = null;
  let offlineHandler: ((event: Event) => void) | null = null;

  beforeEach(() => {
    // Store original value
    originalNavigator = navigator.onLine;

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    // Capture event listeners
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'online') onlineHandler = handler as (event: Event) => void;
      if (event === 'offline') offlineHandler = handler as (event: Event) => void;
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {
      // Cleanup
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore original value
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalNavigator,
    });

    onlineHandler = null;
    offlineHandler = null;

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return online status based on navigator.onLine', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isTransitioning).toBe(false);
    expect(result.current.lastChangedAt).toBeNull();
    expect(result.current.offlineDuration).toBeNull();
  });

  it('should detect offline status', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
  });

  it('should call onOffline callback when going offline', () => {
    const onOffline = vi.fn();
    renderHook(() => useOnlineStatus({ onOffline }));

    // Simulate going offline
    act(() => {
      offlineHandler?.(new Event('offline'));
    });

    expect(onOffline).toHaveBeenCalledTimes(1);
  });

  it('should call onOnline callback when going online', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    const onOnline = vi.fn();
    renderHook(() => useOnlineStatus({ onOnline }));

    // Simulate going online
    act(() => {
      onlineHandler?.(new Event('online'));
    });

    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it('should set isTransitioning when status changes', () => {
    const { result } = renderHook(() => useOnlineStatus({ transitionDuration: 1000 }));

    // Simulate going offline
    act(() => {
      offlineHandler?.(new Event('offline'));
    });

    expect(result.current.isTransitioning).toBe(true);

    // Advance timers to clear transition
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isTransitioning).toBe(false);
  });

  it('should update lastChangedAt when status changes', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.lastChangedAt).toBeNull();

    // Simulate going offline
    act(() => {
      offlineHandler?.(new Event('offline'));
    });

    expect(result.current.lastChangedAt).toBeInstanceOf(Date);
  });

  it('should track offline duration when offline', async () => {
    const { result } = renderHook(() => useOnlineStatus());

    // Simulate going offline
    act(() => {
      offlineHandler?.(new Event('offline'));
    });

    // Initially, offlineDuration should be a small number (close to 0)
    expect(result.current.offlineDuration).not.toBeNull();
    expect(result.current.offlineDuration).toBeGreaterThanOrEqual(0);
  });

  it('should reset offline duration when going back online', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    // Verify we're offline
    expect(result.current.isOnline).toBe(false);

    // Simulate going online
    act(() => {
      onlineHandler?.(new Event('online'));
    });

    expect(result.current.offlineDuration).toBeNull();
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});

describe('useIsOnline', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return boolean online status', () => {
    const { result } = renderHook(() => useIsOnline());

    expect(result.current).toBe(true);
  });

  it('should return false when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useIsOnline());

    expect(result.current).toBe(false);
  });
});
