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
useHead({ title: `Sign In · ${APP_NAME}` });

const auth = useAuthStore();
const route = useRoute();
const config = useRuntimeConfig();
const registrationEnabled = computed(() => config.public.registrationEnabled as boolean);
const submitting = ref(false);

// FE-only Zod schema (BE validates with class-validator). Mirrors LoginDto.
const schema = toTypedSchema(
  z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
);

const { handleSubmit } = useForm({ validationSchema: schema });

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true;
  try {
    await auth.login(values.email, values.password);
    toast.success(t('auth.welcomeBack'));
    const redirect = (route.query.redirect as string) || '/admin/dashboard';
    await navigateTo(redirect);
  } catch {
    toast.error(t('auth.invalidCredentials'));
  } finally {
    submitting.value = false;
  }
});

// Social providers are decorative in the starter kit — wire them up to your IdP.
const notImplemented = (provider: string) =>
  toast.info(`${provider} sign-in is not wired up in this starter kit.`);
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {{ $t('auth.signIn') }}
      </h1>
      <p class="mt-2 text-sm text-muted-foreground">{{ $t('auth.signInSubtitle') }}</p>
    </div>

    <!-- Social sign-in: MD3 outlined buttons -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-3 rounded-full border border-outline bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-on-surface/8"
        @click="notImplemented('Google')"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9088 16.6126L16.0925 16.6305C17.7799 15.1041 18.7511 12.8583 18.7511 10.1944Z"
            fill="#4285F4"
          />
          <path
            d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99517 11.7392L2.23903 13.8295L2.20312 13.9277C3.67139 16.786 6.69005 18.75 10.1788 18.75Z"
            fill="#34A853"
          />
          <path
            d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20383 6.0721C1.60582 7.25444 1.26172 8.58286 1.26172 9.99992C1.26172 11.417 1.60582 12.7454 2.20383 13.9277L5.10014 11.7305Z"
            fill="#FBBC05"
          />
          <path
            d="M10.1788 4.63331C11.8559 4.63331 12.9874 5.35303 13.6321 5.95442L16.1509 3.49553C14.6035 2.06848 12.5895 1.25 10.1788 1.25C6.69005 1.25 3.67139 3.21443 2.20312 6.07268L5.08953 8.26943C5.81379 6.15972 7.81773 4.63331 10.1788 4.63331Z"
            fill="#EB4335"
          />
        </svg>
        {{ $t('auth.googleSignIn') }}
      </button>
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-3 rounded-full border border-outline bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-on-surface/8"
        @click="notImplemented('X')"
      >
        <svg class="h-[18px] w-[18px] fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
        {{ $t('auth.xSignIn') }}
      </button>
    </div>

    <!-- Divider -->
    <div class="relative my-6">
      <div class="absolute inset-0 flex items-center">
        <span class="w-full border-t border-border" />
      </div>
      <div class="relative flex justify-center text-xs">
        <span class="bg-background px-3 text-muted-foreground">{{ $t('auth.or') }}</span>
      </div>
    </div>

    <form class="space-y-5" @submit="onSubmit">
      <TextField
        name="email"
        :label="$t('auth.email')"
        type="email"
        placeholder="name@example.com"
        required
      />

      <PasswordField
        name="password"
        :label="$t('auth.password')"
        placeholder="Enter your password"
        autocomplete="current-password"
        required
      />

      <!-- Forgot password (the "keep me logged in" checkbox was removed: it
           had no behavior behind it) -->
      <div class="flex items-center justify-end">
        <NuxtLink to="/forgot-password" class="text-sm font-medium text-primary hover:underline">
          {{ $t('auth.forgotPassword') }}
        </NuxtLink>
      </div>

      <Button type="submit" size="lg" class="w-full" :disabled="submitting">
        {{ submitting ? $t('auth.signingIn') : $t('auth.signIn') }}
      </Button>
    </form>

    <p v-if="registrationEnabled" class="mt-6 text-center text-sm text-muted-foreground">
      {{ $t('auth.noAccount') }}
      <NuxtLink to="/register" class="font-medium text-primary hover:underline">
        {{ $t('auth.signUp') }}
      </NuxtLink>
    </p>

    <div class="mt-6 rounded-lg bg-surface-container px-4 py-3 text-center">
      <p class="text-xs text-muted-foreground">
        Demo credentials:
        <span class="font-medium text-foreground">admin@nuxion.test</span> /
        <span class="font-medium text-foreground">admin123</span>
      </p>
    </div>
  </div>
</template>
