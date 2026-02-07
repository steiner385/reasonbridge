/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Virtual list configuration
 */
export interface VirtualListConfig {
  /** Height of each item in pixels */
  itemHeight: number;
  /** Total height of the container (defaults to window height - offset) */
  containerHeight?: number;
  /** Number of items to render beyond visible area (overscan) */
  overscanCount?: number;
}

/**
 * Virtual list state and refs
 */
export interface UseVirtualListReturn {
  /** Container ref to attach to scrollable element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Calculated container height in pixels */
  containerHeight: number;
  /** Total height of all items combined */
  totalHeight: number;
  /** Scroll to a specific index */
  scrollToIndex: (index: number) => void;
  /** Scroll to top */
  scrollToTop: () => void;
}

/**
 * Custom hook for virtual list rendering using react-window concepts
 * Provides refs and calculations for efficient large list rendering
 *
 * @param itemCount - Total number of items in the list
 * @param config - Virtual list configuration
 * @returns Virtual list state and actions
 *
 * @example
 * ```tsx
 * function TopicList({ topics }: { topics: Topic[] }) {
 *   const { containerRef, containerHeight, totalHeight, scrollToIndex } = useVirtualList(
 *     topics.length,
 *     { itemHeight: 80, overscanCount: 5 }
 *   );
 *
 *   return (
 *     <div ref={containerRef} style={{ height: containerHeight, overflow: 'auto' }}>
 *       <FixedSizeList
 *         height={containerHeight}
 *         itemCount={topics.length}
 *         itemSize={80}
 *         width="100%"
 *       >
 *         {({ index, style }) => (
 *           <div style={style}>{topics[index].title}</div>
 *         )}
 *       </FixedSizeList>
 *     </div>
 *   );
 * }
 * ```
 */
export function useVirtualList(itemCount: number, config: VirtualListConfig): UseVirtualListReturn {
  const { itemHeight, containerHeight: configHeight, overscanCount: _overscanCount = 3 } = config;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(
    configHeight || (typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600),
  );

  // Calculate total height of all items
  const totalHeight = itemCount * itemHeight;

  // Update container height on resize if not explicitly set
  useEffect(() => {
    if (configHeight) {
      // Schedule state update asynchronously to avoid cascading renders
      setTimeout(() => {
        setContainerHeight(configHeight);
      }, 0);
      return;
    }

    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Use available height from parent
        const availableHeight = window.innerHeight - rect.top - 20; // 20px bottom margin
        setContainerHeight(Math.max(300, availableHeight)); // Minimum 300px
      }
    };

    // Initial height calculation
    updateHeight();

    // Update on resize with debounce
    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateHeight, 150);
    };

    window.addEventListener('resize', debouncedUpdate);
    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, [configHeight]);

  /**
   * Scroll to a specific item index
   */
  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        const scrollTop = index * itemHeight;
        containerRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });
      }
    },
    [itemHeight],
  );

  /**
   * Scroll to the top of the list
   */
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, []);

  return {
    containerRef,
    containerHeight,
    totalHeight,
    scrollToIndex,
    scrollToTop,
  };
}
