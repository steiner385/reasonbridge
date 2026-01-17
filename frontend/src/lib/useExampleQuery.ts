import { useQuery } from '@tanstack/react-query';

/**
 * Example query hook demonstrating TanStack Query usage
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
      // This is a placeholder - replace with actual API calls
      return {
        message: 'TanStack Query is configured and ready!',
        timestamp: new Date().toISOString(),
      };
    },
  });
}
