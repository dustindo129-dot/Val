import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      cacheTime: 1000 * 60 * 10, // 10 minutes - keep in cache
      retry: 1,
      refetchOnWindowFocus: false, // Prevent refetch on window focus
      refetchOnMount: false, // Prevent refetch on component mount if data exists
      refetchOnReconnect: false, // Prevent refetch on reconnect
      // Enable query deduplication (this is the key fix)
      queryDeduplication: true,
      // Prevent background refetches
      refetchInterval: false,
    },
    mutations: {
      retry: 1,
    },
  },
}); 