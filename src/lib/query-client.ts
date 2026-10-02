import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status =
          typeof error === 'object' &&
          error &&
          'status' in error &&
          typeof (error as { status?: unknown }).status === 'number'
            ? (error as { status: number }).status
            : undefined;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});
