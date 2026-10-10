'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface ApiMutationOptions<TData, TVars> {
  /** Query keys to invalidate on success (e.g. ['users']). */
  invalidateKeys?: string[];
  /** Toast shown on success. Omit to stay silent. */
  successMessage?: string;
  onSuccess?: (data: TData, vars: TVars) => void | Promise<void>;
}

/**
 * Uniform mutation wrapper over react-query — the port of the Nuxt variant's
 * useApiMutation. Centralises cache invalidation and toast feedback so feature
 * code stays declarative. Errors surface through the response envelope
 * (already unwrapped to an Error by the api client).
 */
export function useApiMutation<TData, TVars>(
  mutationFn: (vars: TVars) => Promise<TData>,
  options: ApiMutationOptions<TData, TVars> = {},
) {
  const queryClient = useQueryClient();
  const t = useTranslations('state');

  return useMutation<TData, Error, TVars>({
    mutationFn,
    onSuccess: async (data, vars) => {
      await Promise.all(
        (options.invalidateKeys ?? []).map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] as QueryKey }),
        ),
      );
      if (options.successMessage) toast.success(options.successMessage);
      await options.onSuccess?.(data, vars);
    },
    onError(error) {
      toast.error(error.message || t('error'));
    },
  });
}
