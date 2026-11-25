<script setup lang="ts">
import { applyApiFieldErrors } from '~/lib/api-errors';
import { computed, ref } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuthStore, type TwoFactorChallenge } from '~/stores/auth';
import { intendedRedirect } from '~/lib/intended-redirect';
import { useBranding } from '~/composables/useBranding';

definePageMeta({ layout: 'auth', middleware: ['guest'] });
const { t } = useI18n();
const branding = useBranding();
useHead({ title: () => `Sign In · ${branding.value.appName}` });

const auth = useAuthStore();
const route = useRoute();
const config = useRuntimeConfig();
const registrationEnabled = computed(() => config.public.registrationEnabled as boolean);
const passkeyEnabled = computed(() => config.public.passkeyEnabled as boolean);
const submitting = ref(false);

/** Password OK but TOTP is enabled — swap the form for the code step. */
const challenge = ref<TwoFactorChallenge | null>(null);

const finishLogin = async () => {
  toast.success(t('auth.welcomeBack'));
  await navigateTo(intendedRedirect(route.query));
};

// FE-only Zod schema (BE validates with class-validator). Mirrors LoginDto.
const schema = toTypedSchema(
  z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
);

const { handleSubmit, setErrors } = useForm({ validationSchema: schema });

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true;
  try {
    const result = await auth.login(values.email, values.password);
    if ('twoFactorRequired' in result) {
      challenge.value = result;
      return;
    }
    await finishLogin();
  } catch (err) {
    applyApiFieldErrors(err, setErrors, ['email', 'password']);
    toast.error(t('auth.invalidCredentials'));
  } finally {
    submitting.value = false;
  }
});

// Passkey sign-in (discoverable credential — no username needed).
const passkeyBusy = ref(false);
async function signInWithPasskey() {
  passkeyBusy.value = true;
  try {
    const { challengeId, options } = await auth.passkeyLoginOptions();
    const assertion = await startAuthentication({ optionsJSON: options });
    const result = await auth.passkeyLoginVerify(challengeId, assertion);
    if ('twoFactorRequired' in result) {
      // Passkey without user verification — the account still owes a TOTP step.
      challenge.value = result;
      toast.info(t('auth.twoFactor.otpRequired'));
      return;
    }
    await finishLogin();
  } catch (err) {
    // A dismissed browser prompt is a user choice, not a failure.
    if ((err as Error)?.name !== 'NotAllowedError') toast.error(t('auth.passkey.failed'));
  } finally {
    passkeyBusy.value = false;
  }
}

const showDemoCredentials = import.meta.dev;
</script>

<template>
  <div>
    <!-- Step 2: second factor (own component — it needs its own form context) -->
    <LoginTotpStep
      v-if="challenge"
      :key="challenge.challengeId"
      :challenge-id="challenge.challengeId"
      @verified="finishLogin"
      @back="challenge = null"
    />

    <!-- Step 1: credentials -->
    <div v-else>
      <div class="mb-8">
        <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {{ $t('auth.signIn') }}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">{{ $t('auth.signInSubtitle') }}</p>
      </div>

      <div v-if="passkeyEnabled" class="grid grid-cols-1 gap-3">
        <button
          v-if="passkeyEnabled"
          type="button"
          data-testid="passkey-login-button"
          class="inline-flex h-10 items-center justify-center gap-3 rounded-full border border-outline bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-on-surface/8 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="passkeyBusy"
          @click="signInWithPasskey"
        >
          <AppIcon name="key" :size="18" />
          {{ passkeyBusy ? $t('auth.signingIn') : $t('auth.passkey.signIn') }}
        </button>
      </div>

      <!-- Divider -->
      <div v-if="passkeyEnabled" class="relative my-6">
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

      <div
        v-if="showDemoCredentials"
        class="mt-6 rounded-lg bg-surface-container px-4 py-3 text-center"
      >
        <p class="text-xs text-muted-foreground">
          Demo credentials:
          <span class="font-medium text-foreground">admin@nuxion.test</span> /
          <span class="font-medium text-foreground">admin123</span>
        </p>
      </div>
    </div>
  </div>
</template>
