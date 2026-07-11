/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

/**
 * Reference-counted body scroll lock.
 *
 * @remarks
 * Multiple overlays (drawer, modal, dialogs) can be open at once. Previously each
 * component wrote `document.body.style.overflow` directly with no coordination, so the
 * first overlay to close reset body overflow and re-enabled background scrolling behind
 * a still-open overlay (see issue #1378). This module serialises all locks through a
 * single counter:
 *
 * - The original inline `overflow` value is captured on the 0 → 1 transition.
 * - `overflow: hidden` stays applied while any lock is held.
 * - The captured value is restored only on the 1 → 0 transition, so a pre-existing
 *   inline value is preserved rather than clobbered with `''`/`'unset'`.
 */

let lockCount = 0;
let savedOverflow = '';

/** Acquire a scroll lock. Safe to call when SSR (no document). */
export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

/** Release a previously acquired scroll lock. */
export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
  }
}

/**
 * Lock body scroll while `active` is true; automatically released on unmount or when
 * `active` becomes false. Reference-counted so concurrent overlays never clobber each
 * other.
 *
 * @param active - Whether this consumer currently wants body scroll locked.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
}

/** Test-only: reset the shared lock state between tests. */
export function __resetScrollLockForTests(): void {
  lockCount = 0;
  savedOverflow = '';
}
