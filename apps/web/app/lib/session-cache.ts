import type { QueryClient } from '@tanstack/vue-query';
import { watch } from 'vue';

export function bindSessionCache(
  auth: { sessionGeneration: number },
  queryClient: QueryClient,
  notifications: { reset: () => void },
): () => void {
  return watch(
    () => auth.sessionGeneration,
    () => {
      void queryClient.cancelQueries();
      queryClient.clear();
      notifications.reset();
    },
    { flush: 'sync' },
  );
}
