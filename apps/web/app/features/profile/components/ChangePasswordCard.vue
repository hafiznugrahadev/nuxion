<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { useChangePassword } from '../composables/useProfile';

const change = useChangePassword();

const schema = toTypedSchema(
  z
    .object({
      currentPassword: z.string().min(1, 'Enter your current password'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
);

const { handleSubmit, resetForm } = useForm({ validationSchema: schema });

const onSubmit = handleSubmit(async (values) => {
  await change.mutateAsync({
    currentPassword: values.currentPassword,
    newPassword: values.newPassword,
  });
  resetForm();
});
</script>

<template>
  <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
    <div class="mb-1">
      <h3 class="text-base font-semibold text-foreground">
        {{ $t('profile.changePassword.title') }}
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">{{ $t('profile.changePassword.subtitle') }}</p>
    </div>

    <form class="mt-5 space-y-5" @submit="onSubmit">
      <div class="max-w-md">
        <PasswordField
          name="currentPassword"
          :label="$t('profile.changePassword.currentPassword')"
          placeholder="••••••••"
          autocomplete="current-password"
        />
      </div>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <PasswordField
          name="newPassword"
          :label="$t('profile.changePassword.newPassword')"
          placeholder="••••••••"
          autocomplete="new-password"
        />
        <PasswordField
          name="confirmPassword"
          :label="$t('profile.changePassword.confirmPassword')"
          placeholder="••••••••"
          autocomplete="new-password"
        />
      </div>

      <div class="flex justify-end">
        <Button type="submit" :disabled="change.isPending.value">
          {{
            change.isPending.value
              ? $t('profile.changePassword.updating')
              : $t('profile.changePassword.update')
          }}
        </Button>
      </div>
    </form>
  </div>
</template>
