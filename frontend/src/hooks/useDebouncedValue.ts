/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value
 *
 * Returns a debounced version of the value that only updates
 * after the specified delay has passed without the value changing.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 400ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebouncedValue(search, 400);
 *
 *   useEffect(() => {
 *     // This runs only after user stops typing for 400ms
 *     if (debouncedSearch) {
 *       performSearch(debouncedSearch);
 *     }
 *   }, [debouncedSearch]);
 *
 *   return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
 * }
 * ```
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebouncedValue;
