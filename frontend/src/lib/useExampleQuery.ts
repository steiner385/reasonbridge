/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api';

/**
 * Example query hook demonstrating TanStack Query usage with API client
 *
 * This hook serves as a reference implementation for creating
 * data fetching hooks throughout the application.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, isLoading, error } = useExampleQuery();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return <div>{data.message}</div>;
 * }
 * ```
 */
export function useExampleQuery() {
  return useQuery({
    queryKey: ['example'],
    queryFn: async () => {
      // Example using the API client
      // Replace '/health' with your actual endpoint
      try {
        const response = await apiClient.get<{ status: string; uptime: number }>('/health');
        return {
          message: `API is ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      } catch {
        // Fallback if API is not available
        return {
          message: 'TanStack Query is configured and ready!',
          timestamp: new Date().toISOString(),
        };
      }
    },
  });
}
