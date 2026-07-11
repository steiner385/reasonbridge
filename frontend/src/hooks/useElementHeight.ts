/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Measure a container's live pixel height via ResizeObserver.
 *
 * @remarks
 * Virtual lists need an explicit pixel height. Deriving it once from
 * `window.innerHeight - <magic offset>` at render time goes stale after rotation or a
 * keyboard-driven viewport shrink (`interactive-widget=resizes-content`), because there
 * is no resize subscription driving a re-measure (see issue #1383). This hook mirrors the
 * ResizeObserver pattern already used by ConversationPanel: attach the returned `ref` to
 * the flex container that should be measured and pass `height` to the virtual list.
 *
 * @param fallback - Height used until the first measurement (and under SSR).
 * @returns A tuple of `[ref, height]`.
 */
export function useElementHeight<T extends HTMLElement = HTMLDivElement>(
  fallback = 400,
): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number>(fallback);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const update = () => {
      const measured = el.getBoundingClientRect().height;
      // Ignore transient zero-height frames (e.g. while hidden) to keep the fallback.
      if (measured > 0) setHeight(measured);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return [ref, height];
}
