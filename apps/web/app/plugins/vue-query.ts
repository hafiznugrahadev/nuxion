import {
  QueryClient,
  VueQueryPlugin,
  hydrate,
  dehydrate,
  type DehydratedState,
} from '@tanstack/vue-query';

/** TanStack Query wired for Nuxt SSR (state transfers via Nuxt payload). */
export default defineNuxtPlugin((nuxt) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false },
    },
  });

  nuxt.vueApp.use(VueQueryPlugin, { queryClient });

  const vueQueryState = useState<DehydratedState | null>('vue-query');

  if (import.meta.server) {
    nuxt.hooks.hook('app:rendered', () => {
      vueQueryState.value = dehydrate(queryClient);
    });
  }

  if (import.meta.client) {
    nuxt.hooks.hook('app:created', () => {
      if (vueQueryState.value) hydrate(queryClient, vueQueryState.value);
    });
  }
});
