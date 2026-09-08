<script setup lang="ts">
import { computed, ref } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { useAuthStore } from '~/stores/auth';
import { APP_NAME } from '~/lib/constants';

definePageMeta({ layout: 'auth' });
const { t } = useI18n();
useHead({ title: `Reset Password · ${APP_NAME}` });

const auth = useAuthStore();
const route = useRoute();
const token = computed(() => (route.query.token as string) || '');
const submitting = ref(false);

const schema = toTypedSchema(
  z
    .object({
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
);
const { handleSubmit } = useForm({ validationSchema: schema });

const onSubmit = handleSubmit(async (values) => {
  if (!token.value) {
    toast.error(t('auth.invalidToken'));
    return;
  }
  submitting.value = true;
  try {
    await auth.resetPassword(token.value, values.newPassword);
    toast.success(t('auth.resetSuccess'));
    await navigateTo('/login');
  } catch {
    toast.error(t('auth.resetInvalidExpired'));
  } finally {
    submitting.value = false;
  }
});
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {{ $t('auth.resetTitle') }}
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">{{ $t('auth.resetSubtitle') }}</p>
    </div>

    <!-- Missing token -->
    <div
      v-if="!token"
      class="space-y-3 rounded-lg bg-error-container p-5 text-sm text-on-error-container"
    >
      <p>{{ $t('auth.resetInvalidLink') }}</p>
      <NuxtLink to="/forgot-password" class="inline-block font-medium text-primary hover:underline">
        {{ $t('auth.requestNewLink') }}
      </NuxtLink>
    </div>

    <!-- Reset form -->
    <form v-else class="space-y-5" @submit="onSubmit">
      <PasswordField
        name="newPassword"
        :label="$t('auth.newPassword')"
        placeholder="••••••••"
        required
      />
      <PasswordField
        name="confirmPassword"
        :label="$t('auth.confirmPassword')"
        placeholder="••••••••"
        required
      />
      <Button type="submit" size="lg" class="w-full" :disabled="submitting">
        {{ submitting ? $t('auth.resetting') : $t('auth.resetPassword') }}
      </Button>
      <p class="text-center text-sm text-muted-foreground">
        <NuxtLink to="/login" class="font-medium text-primary hover:underline">
          {{ $t('auth.backToSignIn') }}
        </NuxtLink>
      </p>
    </form>
  </div>
</template>
