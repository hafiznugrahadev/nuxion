import { useMutation, useQueryClient, type QueryKey } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';

interface ApiMutationOptions<TData, TVars> {
  /** Query keys to invalidate on success (e.g. ['users']). */
  invalidateKeys?: (string | QueryKey)[];
  /** Toast shown on success. Omit to stay silent. */
  successMessage?: string;
  onSuccess?: (data: TData, vars: TVars) => void | Promise<void>;
}

/**
 * SPEC DRY (FE) — uniform mutation wrapper over @tanstack/vue-query. Centralises
 * cache invalidation and toast feedback so feature code stays declarative:
 *   const create = useApiMutation(api.create, { invalidateKeys: ['fields'], successMessage: 'Saved' })
 * Errors surface through the response envelope (already unwrapped to `Error`).
 */
export function useApiMutation<TData, TVars>(
  mutationFn: (vars: TVars) => Promise<TData>,
  options: ApiMutationOptions<TData, TVars> = {},
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVars>({
    mutationFn,
    async onSuccess(data, vars) {
      await Promise.all(
        (options.invalidateKeys ?? []).map((key) =>
          queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] }),
        ),
      );
      if (options.successMessage) toast.success(options.successMessage);
      await options.onSuccess?.(data, vars);
    },
    onError(error) {
      toast.error(error.message || 'Something went wrong');
    },
  });
}
