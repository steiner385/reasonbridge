/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useScrollLock,
  lockBodyScroll,
  unlockBodyScroll,
  __resetScrollLockForTests,
} from '../useScrollLock';

describe('useScrollLock (reference-counted body scroll lock)', () => {
  beforeEach(() => {
    __resetScrollLockForTests();
    document.body.style.overflow = '';
  });

  it('locks on mount and restores the original value on unmount', () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('does not lock when inactive', () => {
    renderHook(() => useScrollLock(false));
    expect(document.body.style.overflow).toBe('');
  });

  it('preserves a pre-existing inline overflow value (no clobber to "" / "unset")', () => {
    document.body.style.overflow = 'scroll';
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('keeps the lock while any overlay remains open (the #1378 regression)', () => {
    // Two overlays open concurrently.
    lockBodyScroll();
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    // First overlay closes — background must STAY locked.
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    // Second overlay closes — now the original value is restored.
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
  });

  it('never drives the counter negative on an extra unlock', () => {
    lockBodyScroll();
    unlockBodyScroll();
    unlockBodyScroll(); // stray unlock — must be a no-op
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
  });
});
