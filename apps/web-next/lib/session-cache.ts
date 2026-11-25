import type { QueryClient } from '@tanstack/react-query';
import { subscribeSessionBoundary } from './auth-store';

export function bindSessionCache(queryClient: QueryClient): () => void {
  return subscribeSessionBoundary(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
  });
}
